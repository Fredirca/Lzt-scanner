const DEFAULT_PROXY_URL="https://shiny-shape-49fd.flruming.workers.dev";
const API_BASE="https://prod-api.lzt.market";
const DEFAULT_COSMETIC_FILTERS=[
  {param:"pickaxe[]", id:"pickaxe_lockjaw_og", label:"Raider’s Revenge OG Style"},
  {param:"skin[]", id:"030_athena_commando_m_halloween_og", label:"OG Skull Trooper / Purple Skull"},
  {param:"skin[]", id:"029_athena_commando_f_halloween_og", label:"OG Ghoul Trooper / Pink Ghoul"},
  {param:"skin[]", id:"028_athena_commando_f_og", label:"Renegade Raider OG Style"},
  {param:"skin[]", id:"017_athena_commando_m_og", label:"Aerial Assault Trooper OG Style"}
];

let memoryResults=[];
let memoryCases=[];

const $=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function safeLocalGet(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}}
function safeLocalSet(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
function safeLocalRemove(key){try{localStorage.removeItem(key);}catch{}}
function token(){return ($("apiToken")?.value || "").trim();}

function iconBool(value){
  if(typeof value==="boolean")return value?"✅":"❌";
  const text=String(value??"").trim().toLowerCase();
  if(["1","true","yes","y","changeable","available"].includes(text))return "✅";
  if(["0","false","no","n","not","none"].includes(text))return "❌";
  return "❔";
}
function cleanDate(value){
  if(value===undefined||value===null||value==="")return "Unknown";
  if(typeof value==="number"){try{return new Date(value*1000).toISOString().slice(0,10);}catch{return String(value);}}
  const match=String(value).match(/\d{4}-\d{2}-\d{2}/);
  return match?match[0]:String(value);
}
function priceText(value){
  if(value===undefined||value===null||value==="")return "Unknown";
  const n=Number(value);
  if(!Number.isNaN(n))return `$${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const text=String(value);
  return text.startsWith("$")?text:`$${text}`;
}
function deepText(value, seen=new WeakSet()){
  if(value===null||value===undefined)return "";
  if(typeof value==="string"||typeof value==="number"||typeof value==="boolean")return String(value);
  if(typeof value!=="object")return "";
  if(seen.has(value))return "";
  seen.add(value);
  if(Array.isArray(value))return value.map(v=>deepText(v,seen)).join(" ");
  return Object.values(value).map(v=>deepText(v,seen)).join(" ");
}
function nestedValue(value, keys, fallback="Unknown"){
  if(value===null||value===undefined||typeof value!=="object")return fallback;
  if(Array.isArray(value)){
    for(const item of value){
      const found=nestedValue(item,keys,null);
      if(found!==null&&found!==undefined&&found!=="")return found;
    }
    return fallback;
  }
  for(const key of keys){
    if(value[key]!==undefined&&value[key]!==null&&value[key]!=="")return value[key];
  }
  for(const next of Object.values(value)){
    const found=nestedValue(next,keys,null);
    if(found!==null&&found!==undefined&&found!=="")return found;
  }
  return fallback;
}

function canonicalParam(raw){
  const key=decodeURIComponent(String(raw||"")).toLowerCase();
  if(key.startsWith("skin"))return "skin[]";
  if(key.startsWith("pickaxe"))return "pickaxe[]";
  if(key.startsWith("dance") || key.startsWith("emote"))return "dance[]";
  if(key.startsWith("glider"))return "glider[]";
  return "";
}

function inferParamFromId(id){
  const lower=String(id||"").toLowerCase();
  if(lower.startsWith("pickaxe"))return "pickaxe[]";
  if(lower.includes("athena_commando") || lower.includes("commando"))return "skin[]";
  if(lower.startsWith("cid_"))return "skin[]";
  if(lower.startsWith("eid_") || lower.includes("dance"))return "dance[]";
  if(lower.includes("glider"))return "glider[]";
  return "skin[]";
}

function pushFilter(list,param,id,label=""){
  if(!param || !id)return;
  let clean=decodeURIComponent(String(id).trim());
  clean=clean.replace(/^cid_/i,"").replace(/^CID_/,"");
  clean=clean.split(/[&#]/)[0].trim();
  if(!clean)return;

  const key=`${param}:${clean}`;
  if(list.some(x=>`${x.param}:${x.id}`===key))return;
  list.push({param,id:clean,label:label || labelForCosmetic(param,clean)});
}

function parseCosmeticInput(){
  const raw=($("cosmeticSearchInput")?.value || "").trim();
  const filters=[];

  if(!raw){
    return DEFAULT_COSMETIC_FILTERS.slice();
  }

  // Full URL support.
  try{
    if(raw.includes("http")){
      const url=new URL(raw);
      for(const [key,value] of url.searchParams.entries()){
        const param=canonicalParam(key);
        if(param)pushFilter(filters,param,value);
      }
    }
  }catch{}

  // Parameter and raw ID support.
  const decoded=decodeURIComponent(raw);
  const paramRegex=/(skin|pickaxe|dance|emote|glider)(?:\[\]|\%5B\%5D)?\s*=\s*([a-zA-Z0-9_'’-]+)/gi;
  let match;
  while((match=paramRegex.exec(decoded))!==null){
    const param=canonicalParam(match[1]);
    pushFilter(filters,param,match[2]);
  }

  // Raw IDs separated by spaces, commas, semicolons, pipes, or new lines.
  for(const part of decoded.split(/[\s,;|]+/)){
    const token=part.trim();
    if(!token || token.includes("=") || token.includes("http"))continue;
    if(/^[a-zA-Z0-9_'’-]+$/.test(token)){
      const param=inferParamFromId(token);
      pushFilter(filters,param,token);
    }
  }

  return filters.length ? filters : DEFAULT_COSMETIC_FILTERS.slice();
}

function labelForCosmetic(param,id){
  const lower=String(id).toLowerCase();
  if(param==="pickaxe[]" && lower.includes("lockjaw_og"))return "Raider’s Revenge OG Style";
  if(param==="pickaxe[]" && lower.includes("raider"))return "Raider’s Revenge OG Style";
  if(lower.includes("030_athena_commando_m_halloween_og"))return "OG Skull Trooper / Purple Skull";
  if(lower.includes("029_athena_commando_f_halloween_og"))return "OG Ghoul Trooper / Pink Ghoul";
  if(lower.includes("028_athena_commando_f_og"))return "Renegade Raider OG Style";
  if(lower.includes("017_athena_commando_m_og"))return "Aerial Assault Trooper OG Style";
  if(param==="pickaxe[]")return `Pickaxe: ${id}`;
  if(param==="skin[]")return `Skin: ${id}`;
  return `${param} ${id}`;
}

function renderActiveCosmetics(){
  const filters=parseCosmeticInput();
  const box=$("activeCosmetics");
  if(!box)return;
  box.innerHTML=filters.map(f=>`<span class="chip">${esc(f.label || labelForCosmetic(f.param,f.id))}</span>`).join("");
}


function allValuesByKey(value, keys, seen=new WeakSet(), out=[]){
  if(value===null || value===undefined) return out;
  if(typeof value!=="object") return out;
  if(seen.has(value)) return out;
  seen.add(value);

  if(Array.isArray(value)){
    value.forEach(x=>allValuesByKey(x,keys,seen,out));
    return out;
  }

  for(const [key,next] of Object.entries(value)){
    if(keys.includes(key) && next!==undefined && next!==null && next!=="") out.push(next);
    allValuesByKey(next,keys,seen,out);
  }

  return out;
}

function firstDeep(value, keys, fallback="Unknown"){
  const found=allValuesByKey(value,keys);
  for(const x of found){
    if(x!==undefined && x!==null && x!=="") return x;
  }
  return fallback;
}

function numberFromTitle(title, patterns){
  const text=String(title||"");
  for(const pattern of patterns){
    const match=text.match(pattern);
    if(match) return match[1];
  }
  return "";
}

function titleEmailStatus(title){
  const text=String(title||"").toLowerCase();
  if(text.includes("no email") || text.includes("without email")) return "❌";
  if(text.includes("changeable email") || text.includes("email changeable") || text.includes("full access")) return "✅";
  if(text.includes("same email")) return "Same email";
  return "";
}

function normalizeSeller(value){
  if(!value) return "";
  if(typeof value==="string") return value;
  return value.username || value.name || value.login || value.display_name || "";
}

function mergeListingData(summary, detailData){
  const root = detailData?.item || detailData?.data || detailData?.account || detailData?.response || detailData || {};
  return {summary, detail:root, combined:{...summary, ...root}};
}

function looksKnown(value){
  return value!==undefined && value!==null && value!=="" && value!=="Unknown";
}


function absolutizeImageUrl(url){
  const raw=String(url || "").trim();
  if(!raw)return "";
  if(raw.startsWith("//"))return `https:${raw}`;
  if(raw.startsWith("http://") || raw.startsWith("https://"))return raw;
  return "";
}

function looksLikeImageUrl(url){
  const text=String(url || "").trim();
  if(!text)return false;
  const lower=text.toLowerCase();

  if(lower.startsWith("data:"))return false;
  if(!lower.startsWith("http://") && !lower.startsWith("https://") && !lower.startsWith("//"))return false;

  return (
    /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(lower) ||
    lower.includes("image") ||
    lower.includes("img") ||
    lower.includes("screenshot") ||
    lower.includes("inventory") ||
    lower.includes("checker") ||
    lower.includes("lztcdn") ||
    lower.includes("lolz") ||
    lower.includes("market")
  );
}

function imageScore(url){
  const lower=String(url || "").toLowerCase();
  let score=0;
  if(lower.includes("inventory"))score+=7;
  if(lower.includes("checker"))score+=7;
  if(lower.includes("screenshot"))score+=4;
  if(lower.includes("fortnite"))score+=3;
  if(lower.includes("skin"))score+=2;
  if(lower.includes("lzt"))score+=2;
  if(/\.(png|jpe?g|webp)(\?|#|$)/i.test(lower))score+=2;
  return score;
}

function extractInventoryImages(value, seen=new WeakSet(), out=[]){
  if(value===null || value===undefined)return out;

  if(typeof value==="string"){
    const text=value;

    // Direct URL strings.
    const directMatches=text.match(/https?:\/\/[^\s"'<>\\)]+|\/\/[^\s"'<>\\)]+/g) || [];
    for(const match of directMatches){
      const url=absolutizeImageUrl(match.replace(/&amp;/g,"&"));
      if(looksLikeImageUrl(url))out.push(url);
    }

    // HTML src attributes.
    const srcMatches=[...text.matchAll(/src=["']([^"']+)["']/gi)];
    for(const match of srcMatches){
      const url=absolutizeImageUrl(match[1].replace(/&amp;/g,"&"));
      if(looksLikeImageUrl(url))out.push(url);
    }

    return out;
  }

  if(typeof value!=="object")return out;
  if(seen.has(value))return out;
  seen.add(value);

  if(Array.isArray(value)){
    value.forEach(x=>extractInventoryImages(x,seen,out));
    return out;
  }

  for(const [key,next] of Object.entries(value)){
    const lowerKey=String(key).toLowerCase();

    if(
      ["image","images","img","imgs","src","url","thumbnail","thumb","preview","screenshot","screenshots","inventory","inventory_images","inventory_checker","checker","check_images"].some(k=>lowerKey.includes(k))
    ){
      extractInventoryImages(next,seen,out);
    }else if(typeof next==="object"){
      extractInventoryImages(next,seen,out);
    }else if(typeof next==="string" && looksLikeImageUrl(next)){
      extractInventoryImages(next,seen,out);
    }
  }

  return out;
}

function uniqueInventoryImages(payload){
  const urls=extractInventoryImages(payload)
    .map(absolutizeImageUrl)
    .filter(Boolean)
    .filter(url=>/^https?:\/\//i.test(url));

  const seen=new Set();
  return urls
    .sort((a,b)=>imageScore(b)-imageScore(a))
    .filter(url=>{
      const clean=url.split("#")[0];
      if(seen.has(clean))return false;
      seen.add(clean);
      return true;
    })
    .slice(0,12);
}


async function fetchListingPageHtml(id){
  if(!/^\d+$/.test(String(id))) return "";
  const proxy=DEFAULT_PROXY_URL.replace(/\/+$/,"");
  const target=`https://lzt.market/${id}/`;
  const url=`${proxy}/proxy?url=${encodeURIComponent(target)}`;

  try{
    const response=await fetchWithTimeout(url,{
      method:"GET",
      headers:{
        "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "X-LZT-Key":token()
      }
    },45000);

    if(!response.ok) return "";
    return await response.text();
  }catch{
    return "";
  }
}

function htmlDecode(text){
  const box=document.createElement("textarea");
  box.innerHTML=String(text || "");
  return box.value;
}

function extractUrlsFromCssText(text){
  const out=[];
  const regex=/url\((["']?)([^"')]+)\1\)/gi;
  let match;
  while((match=regex.exec(text))!==null){
    out.push(match[2]);
  }
  return out;
}

function extractLockerImagesFromHtml(html){
  const out=[];
  if(!html) return out;

  const decoded=htmlDecode(html);

  // src, data-src, data-original, href image links
  const attrRegex=/(?:src|data-src|data-original|data-lazy-src|data-full|data-url|href)=["']([^"']+)["']/gi;
  let match;
  while((match=attrRegex.exec(decoded))!==null){
    out.push(match[1]);
  }

  // srcset links
  const srcsetRegex=/srcset=["']([^"']+)["']/gi;
  while((match=srcsetRegex.exec(decoded))!==null){
    const parts=match[1].split(",").map(x=>x.trim().split(/\s+/)[0]).filter(Boolean);
    out.push(...parts);
  }

  // background-image url(...)
  out.push(...extractUrlsFromCssText(decoded));

  // Raw CDN image URLs inside JSON/script payloads.
  const rawUrlRegex=/https?:\\?\/\\?\/[^"'<>\s)]+?\.(?:png|jpe?g|webp|gif)(?:\?[^"'<>\s)]*)?/gi;
  while((match=rawUrlRegex.exec(decoded))!==null){
    out.push(match[0].replace(/\\\//g,"/"));
  }

  return out
    .map(url=>htmlDecode(url).replace(/\\u002F/g,"/").replace(/\\\//g,"/"))
    .map(absolutizeImageUrl)
    .filter(Boolean)
    .filter(looksLikeLockerImageUrl)
    .filter(uniqueByValue)
    .sort((a,b)=>lockerImageScore(b)-lockerImageScore(a))
    .slice(0,24);
}

function uniqueByValue(value,index,array){
  const clean=String(value).split("#")[0];
  return array.findIndex(x=>String(x).split("#")[0]===clean)===index;
}

function looksLikeLockerImageUrl(url){
  const lower=String(url||"").toLowerCase();
  if(!looksLikeImageUrl(url)) return false; // replaced below
  return (
    lower.includes("lzt") ||
    lower.includes("lolz") ||
    lower.includes("market") ||
    lower.includes("cdn") ||
    lower.includes("image") ||
    lower.includes("img") ||
    lower.includes("fortnite") ||
    lower.includes("inventory") ||
    lower.includes("locker") ||
    lower.includes("skin") ||
    lower.includes("item") ||
    /\.(png|jpe?g|webp)(\?|#|$)/i.test(lower)
  );
}

function lockerImageScore(url){
  const lower=String(url||"").toLowerCase();
  let score=imageScore(url);
  if(lower.includes("locker"))score+=12;
  if(lower.includes("inventory"))score+=10;
  if(lower.includes("fortnite"))score+=8;
  if(lower.includes("skin"))score+=5;
  if(lower.includes("item"))score+=3;
  if(lower.includes("avatar"))score-=12;
  if(lower.includes("profile"))score-=8;
  if(lower.includes("smilie"))score-=20;
  if(lower.includes("emoji"))score-=20;
  if(lower.includes("logo"))score-=20;
  return score;
}

function combineImageLists(...lists){
  const out=[];
  for(const list of lists){
    if(!Array.isArray(list)) continue;
    for(const url of list){
      const clean=absolutizeImageUrl(url);
      if(!clean) continue;
      if(out.some(x=>String(x).split("#")[0]===String(clean).split("#")[0])) continue;
      out.push(clean);
    }
  }
  return out.sort((a,b)=>lockerImageScore(b)-lockerImageScore(a)).slice(0,24);
}


const imageBlobCache=new Map();

function proxiedUrl(target){
  return `${DEFAULT_PROXY_URL.replace(/\/+$/,"")}/proxy?url=${encodeURIComponent(target)}`;
}

async function loadImageViaProxy(img,url){
  if(!img || !url)return;

  // Use cached blob URL if we already fetched this image.
  if(imageBlobCache.has(url)){
    img.src=imageBlobCache.get(url);
    img.classList.add("loaded");
    return;
  }

  img.classList.add("loading");

  try{
    const response=await fetchWithTimeout(proxiedUrl(url),{
      method:"GET",
      headers:{
        "Accept":"image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "X-LZT-Key":token()
      }
    },45000);

    if(!response.ok)throw new Error(`image ${response.status}`);
    const blob=await response.blob();

    if(!blob || !blob.type.startsWith("image/")){
      throw new Error("not an image");
    }

    const objectUrl=URL.createObjectURL(blob);
    imageBlobCache.set(url,objectUrl);
    img.src=objectUrl;
    img.classList.remove("loading");
    img.classList.add("loaded");
  }catch(error){
    // Fallback to direct URL. Some public CDN images work this way.
    img.src=url;
    img.classList.remove("loading");
    img.classList.add("fallback");
  }
}

function hydrateInventoryImages(root=document){
  root.querySelectorAll("img[data-proxy-img]").forEach(img=>{
    const url=img.dataset.proxyImg;
    if(!url || img.dataset.loaded==="1")return;
    img.dataset.loaded="1";
    loadImageViaProxy(img,url);
  });
}

function clearImageBlobCache(){
  for(const url of imageBlobCache.values()){
    try{URL.revokeObjectURL(url);}catch{}
  }
  imageBlobCache.clear();
}

function renderInventoryImages(caseItem){
  const enabled=$("showInventoryImages") ? $("showInventoryImages").checked : true;
  const images=Array.isArray(caseItem.image_urls) ? caseItem.image_urls : [];
  if(!enabled || !images.length){
    return `<div class="inventory-empty">No locker images found from the listing page/details.</div>`;
  }

  return `<div class="inventory-gallery">
    ${images.map((url,index)=>`
      <a class="inventory-thumb" href="${esc(url)}" target="_blank" rel="noopener" title="Open inventory image ${index+1}">
        <img src="" data-proxy-img="${esc(url)}" loading="lazy" alt="Locker inventory image ${index+1}" referrerpolicy="no-referrer"><span class="image-loader">Loading locker image…</span>
      </a>
    `).join("")}
  </div>
  <div class="image-actions">
    <button class="ghost small" type="button" data-copy-text="${esc(images.join("\\n"))}">Copy image links</button>
    <span>${images.length} image${images.length===1?"":"s"} found</span>
  </div>`;
}

function extractListingFields(summary, detailData, matchedFilters=[]){
  const merged=mergeListingData(summary,detailData);
  const combined=merged.combined;
  const text=deepText({summary, detailData}).toLowerCase();
  const title=summary?.title || summary?.item_title || combined.title || combined.item_title || combined.name || "";
  const id=listingId(summary) || listingId(combined) || listingId(merged.detail);
  const seller=normalizeSeller(summary?.seller) || normalizeSeller(combined.seller) || normalizeSeller(combined.user) || firstDeep({summary,detailData},["seller_username","seller_name","username"],"");
  const price=summary?.price ?? summary?.price_usd ?? combined.price ?? combined.price_usd ?? combined.cost ?? combined.amount ?? firstDeep({summary,detailData},["price","price_usd","cost","amount"],"");

  let skinCount =
    summary?.skin_count ?? summary?.skins_count ?? summary?.skins ?? summary?.outfits_count ?? summary?.outfit_count ??
    firstDeep({summary,detailData},["skin_count","skins_count","outfits_count","outfit_count","fortnite_skins_count","skins_total"],"");

  if(!looksKnown(skinCount)){
    skinCount = numberFromTitle(title, [
      /(\d+)\s*skins?/i,
      /(\d+)\s*outfits?/i
    ]);
  }

  let emailChangeable =
    summary?.email_changeable ?? summary?.change_email ?? summary?.changeable_email ?? summary?.can_change_email ??
    firstDeep({summary,detailData},["email_changeable","change_email","changeable_email","can_change_email","emailChangeable"],"");

  if(!looksKnown(emailChangeable)){
    emailChangeable = titleEmailStatus(title) || "Unknown";
  }

  let seasonLevel =
    summary?.season_level ?? summary?.level ?? summary?.account_level ??
    firstDeep({summary,detailData},["season_level","account_level","fortnite_level","level","seasonLevel"],"");

  if(!looksKnown(seasonLevel)){
    seasonLevel = numberFromTitle(title, [
      /level\s*[:#-]?\s*(\d+)/i,
      /lvl\s*[:#-]?\s*(\d+)/i,
      /season\s*level\s*[:#-]?\s*(\d+)/i
    ]);
  }

  const country =
    summary?.country || summary?.country_code || summary?.origin ||
    firstDeep({summary,detailData},["country","country_code","origin","region"],"Unknown");

  const lastActivity =
    summary?.last_activity || summary?.last_activity_at || summary?.last_seen || summary?.last_login ||
    firstDeep({summary,detailData},["last_activity","last_activity_at","last_seen","last_login","last_activity_date","lastVisitDate"],"Unknown");

  const uploadedAt =
    summary?.uploaded_at || summary?.upload_date || summary?.pdate_upload || summary?.pdate ||
    firstDeep({summary,detailData},["uploaded_at","upload_date","pdate_upload","published_upload","created_upload"],"Unknown");

  const listedAt =
    summary?.published_at || summary?.created_at || summary?.pdate || summary?.date ||
    firstDeep({summary,detailData},["published_at","created_at","pdate","date","published_date"],"Unknown");

  let vbucks =
    summary?.vbucks ?? summary?.v_bucks ?? summary?.bucks ??
    firstDeep({summary,detailData},["vbucks","v_bucks","bucks","vb"],"");

  if(!looksKnown(vbucks)){
    vbucks = numberFromTitle(title, [/(\d+)\s*vb/i, /(\d+)\s*v-?bucks/i]);
  }

  const platform =
    summary?.platform || firstDeep({summary,detailData},["platform","platforms"],"");

  const link=id ? `https://lzt.market/${id}/` : "";
  const inventoryImages=uniqueInventoryImages({summary,detailData});

  return {
    createdAt:new Date().toISOString(),
    item_id:id,
    title:title || (id ? `Listing ${id}` : "Listing"),
    skin_count:looksKnown(skinCount) ? skinCount : "Unknown",
    exclusives:Array.isArray(matchedFilters)&&matchedFilters.length ? matchedFilters.join(", ") : "Selected cosmetic filter",
    email_changeable:looksKnown(emailChangeable) ? emailChangeable : "Unknown",
    price:price,
    currency:String(summary?.currency || combined.currency || combined.price_currency || "USD").toUpperCase(),
    seller:seller || "Unknown",
    season_level:looksKnown(seasonLevel) ? seasonLevel : "Unknown",
    country:looksKnown(country) ? country : "Unknown",
    last_activity:looksKnown(lastActivity) ? lastActivity : "Unknown",
    uploaded_at:looksKnown(uploadedAt) ? uploadedAt : "Unknown",
    listed_at:looksKnown(listedAt) ? listedAt : "Unknown",
    vbucks:looksKnown(vbucks) ? vbucks : "",
    platform:looksKnown(platform) ? platform : "",
    url:link,
    image_urls:inventoryImages,
    matched_filters:Array.isArray(matchedFilters)?matchedFilters:[String(matchedFilters)],
    note:"Enriched from listing search/detail data"
  };
}

async function getListingDetail(id){
  if(!/^\d+$/.test(String(id))) return {};
  try{
    return await lztGet(`/${id}`);
  }catch(firstError){
    try{
      return await lztGet(`/fortnite/${id}`);
    }catch(secondError){
      return {detail_error:firstError.message || secondError.message};
    }
  }
}


function listingId(item){
  const raw=item?.item_id ?? item?.itemId ?? item?.account_id ?? item?.accountId ?? "";
  const text=String(raw);
  return /^\d+$/.test(text)?text:"";
}
function isRealListing(item){
  if(!item||typeof item!=="object")return false;
  const id=listingId(item);
  if(!id)return false;
  const idText=String(item.id || item.item_id || "");
  if(idText.toLowerCase().startsWith("cid_") || idText.toLowerCase().includes("athena_commando"))return false;
  const hasTitle=Boolean(item.title || item.item_title || item.name);
  const hasListingField=item.price!==undefined || item.price_usd!==undefined || item.seller!==undefined || item.user!==undefined || item.url!==undefined || item.link!==undefined || item.item_id!==undefined || item.account_id!==undefined;
  return hasTitle && hasListingField;
}
function compactCase(item){
  if(!item||typeof item!=="object")return item;
  const id=listingId(item)||String(item.item_id??item.itemId??item.account_id??"");
  const filters=item.matched_filters||[];
  return {
    createdAt:item.createdAt||item.created_at||new Date().toISOString(),
    item_id:id,
    title:item.title||item.item_title||item.name||(id?`Listing ${id}`:"Listing"),
    skin_count:item.skin_count??item.skins_count??item.skins??item.outfits_count??item.outfit_count??"Unknown",
    exclusives:item.exclusives || (Array.isArray(filters)&&filters.length?filters.join(", "):"Selected cosmetic filter"),
    email_changeable:item.email_changeable??item.change_email??item.changeable_email??item.can_change_email??"Unknown",
    price:item.price??item.price_usd??item.cost??item.amount??"",
    currency:item.currency||item.price_currency||"USD",
    seller:typeof item.seller==="string"?item.seller:(item.seller?.username||item.seller?.name||item.user?.username||item.username||item.seller_username||"Unknown"),
    season_level:item.season_level??item.level??item.account_level??"Unknown",
    country:item.country||item.country_code||item.origin||"Unknown",
    last_activity:item.last_activity||item.last_activity_at||item.last_seen||item.last_login||"Unknown",
    uploaded_at:item.uploaded_at||item.upload_date||item.pdate_upload||item.pdate||"Unknown",
    listed_at:item.listed_at||item.published_at||item.created_at||item.pdate||"Unknown",
    vbucks:item.vbucks??item.v_bucks??item.bucks??"",
    platform:item.platform||"",
    url:id?`https://lzt.market/${id}/`:"",
    image_urls:Array.isArray(item.image_urls)?item.image_urls.slice(0,12):[],
    matched_filters:Array.isArray(filters)?filters:[String(filters)],
    scan_rank:item.scan_rank ?? 0,
    note:item.note||"Matched by selected cosmetic filter"
  };
}


function loadCases(){
  const legacy=safeLocalGet("wrota.selectoutfits.cases.v1",[]);
  memoryCases=Array.isArray(legacy)?legacy.map(compactCase).filter(x=>/^\d+$/.test(String(x.item_id))).slice(0,100):[];
  safeLocalRemove("wrota.polished.results.v1");
  safeLocalRemove("wrota.results");
  safeLocalSet("wrota.selectoutfits.cases.v1",memoryCases);
}
function cases(){return memoryCases;}
function saveCases(list){memoryCases=(Array.isArray(list)?list:[]).map(compactCase).filter(x=>/^\d+$/.test(String(x.item_id))).slice(0,100);safeLocalSet("wrota.selectoutfits.cases.v1",memoryCases);updateStats();}
function currentResults(){return memoryResults;}
function saveCurrentResults(list){memoryResults=(Array.isArray(list)?list:[]).map(compactCase).filter(x=>/^\d+$/.test(String(x.item_id))).slice(0,300);updateStats();}
function setStatus(text,type="idle"){if($("status"))$("status").textContent=text;if($("sessionState"))$("sessionState").textContent=text;const dot=$("statusDot");if(dot)dot.className=`dot ${type}`;}
function setSubtitle(text){if($("resultsSubtitle"))$("resultsSubtitle").textContent=text;}
function toast(text){const el=document.createElement("div");el.className="toast";el.textContent=text;document.body.appendChild(el);setTimeout(()=>el.remove(),3000);}

function buildDirectUrl(path="/fortnite",params={}){
  const cleanPath=path.startsWith("/")?path:`/${path}`;
  const url=new URL(API_BASE+cleanPath);
  Object.entries(params).forEach(([key,value])=>{
    if(value===undefined||value===null||value==="")return;
    if(Array.isArray(value))value.forEach(v=>url.searchParams.append(key,v));
    else url.searchParams.append(key,value);
  });
  return url;
}
async function fetchWithTimeout(url,options={},timeoutMs=45000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(url,{...options,signal:controller.signal});}
  catch(error){if(error.name==="AbortError")throw new Error("Request timed out");throw error;}
  finally{clearTimeout(timer);}
}
async function lztGet(path="/fortnite",params={}){
  if(!token())throw new Error("API key required");
  const direct=buildDirectUrl(path,params);
  const proxy=DEFAULT_PROXY_URL.replace(/\/+$/,"");
  const url=`${proxy}/proxy?url=${encodeURIComponent(direct.toString())}`;
  let response;
  try{response=await fetchWithTimeout(url,{method:"GET",headers:{"Accept":"application/json","X-LZT-Key":token()}},45000);}
  catch{throw new Error("Connection failed");}
  if(response.status===401||response.status===403)throw new Error("API key rejected");
  if(response.status===429){const err=new Error("Rate limited");err.isRateLimit=true;throw err;}
  if(!response.ok)throw new Error(`${response.status} response`);
  const text=await response.text();
  try{return JSON.parse(text);}catch{return {raw:text};}
}
function extractItems(data){
  const seen=new Set(), out=[];
  function add(value){
    if(!isRealListing(value))return;
    const id=listingId(value);
    if(!id||seen.has(id))return;
    seen.add(id);
    out.push(value);
  }
  function walk(value){
    if(!value)return;
    if(Array.isArray(value)){value.forEach(walk);return;}
    if(typeof value!=="object")return;
    add(value);
    const allowed=new Set(["items","data","results","list","accounts","market_items","response"]);
    for(const [key,next] of Object.entries(value)){
      if(allowed.has(key)||Array.isArray(next))walk(next);
    }
  }
  walk(data);
  return out;
}
function paramsForCosmetic(filter,page){
  const params={page,order_by:activeOrderBy(),currency:"usd"};
  params[filter.param]=filter.id;
  return filterParamsForApi(params);
}

function fieldSet(summary,matchedLabel,detailData={}){
  return compactCase(extractListingFields(summary,detailData,[matchedLabel]));
}

function progress(done,total,label){
  const pct=total?Math.round((done/total)*100):0;
  $("progressWrap")?.classList.remove("hidden");
  if($("progressLabel"))$("progressLabel").textContent=label;
  if($("progressNumber"))$("progressNumber").textContent=`${pct}%`;
  if($("progressBar"))$("progressBar").style.width=`${pct}%`;
}

let currentViewMode="cards";
let lastMarketOrderValue="pdate_to_down_upload";


function dateValue(value){
  if(value === undefined || value === null || value === "" || value === "Unknown") return null;
  if(typeof value === "number"){
    const ms = value > 100000000000 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const text=String(value);
  const yyyy=text.match(/\d{4}-\d{2}-\d{2}/);
  if(yyyy){
    const d=new Date(`${yyyy[0]}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d=new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inputDateValue(id){
  const raw=$(id)?.value || "";
  if(!raw) return null;
  const d=new Date(`${raw}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfToday(){
  const d=new Date();
  d.setHours(0,0,0,0);
  return d;
}

function daysAgo(days){
  const d=startOfToday();
  d.setDate(d.getDate()-days);
  return d;
}

function dateCompareValue(item,key){
  const d=dateValue(item?.[key]);
  return d ? d.getTime() : -Infinity;
}

function niceDate(value){
  const d=dateValue(value);
  return d ? d.toISOString().slice(0,10) : cleanDate(value);
}


function setMarketOrder(orderValue, displaySort="market"){
  if($("marketOrder")) $("marketOrder").value=orderValue;
  if($("sortFilter")) $("sortFilter").value=displaySort;
  updateOrderChips();
  refreshFilteredResults();
}

function activeOrderBy(){
  // The API order is the source of truth for newest uploaded.
  // Local uploaded dates are often absent in result payloads, so local sorting can be wrong.
  return $("marketOrder")?.value || "pdate_to_down_upload";
}

function marketOrderValue(){
  return activeOrderBy();
}

function numericValue(value){
  const n=Number(value);
  return Number.isFinite(n) ? n : null;
}

function lower(value){
  return String(value ?? "").toLowerCase();
}

function splitTerms(value){
  return String(value || "")
    .split(/[,|]+/)
    .map(x=>x.trim().toLowerCase())
    .filter(Boolean);
}

function filterState(){
  return {
    search: lower($("filterSearch")?.value || "").trim(),
    priceMin: numericValue($("priceMin")?.value),
    priceMax: numericValue($("priceMax")?.value),
    skinMin: numericValue($("skinMin")?.value),
    skinMax: numericValue($("skinMax")?.value),
    levelMin: numericValue($("levelMin")?.value),
    levelMax: numericValue($("levelMax")?.value),
    seller: lower($("sellerFilter")?.value || "").trim(),
    country: lower($("countryFilter")?.value || "").trim(),
    email: $("emailFilter")?.value || "",
    sort: $("sortFilter")?.value || "market",
    marketOrder: $("marketOrder")?.value || "pdate_to_down_upload",
    quickOrder: $("quickOrder")?.value || "",
    uploadedAfter: inputDateValue("uploadedAfter"),
    uploadedBefore: inputDateValue("uploadedBefore"),
    activityAfter: inputDateValue("activityAfter"),
    activityBefore: inputDateValue("activityBefore"),
    includeTerms: splitTerms($("includeTerms")?.value || ""),
    excludeTerms: splitTerms($("excludeTerms")?.value || ""),
    hideUnknownPrice: Boolean($("hideUnknownPrice")?.checked),
    hideUnknownSeller: Boolean($("hideUnknownSeller")?.checked),
    hideUnknownCountry: Boolean($("hideUnknownCountry")?.checked),
    onlyFullInfo: Boolean($("onlyFullInfo")?.checked),
    hasImagesOnly: Boolean($("hasImagesOnly")?.checked)
  };
}

function listingText(item){
  return [
    item.title,
    item.seller,
    item.country,
    item.exclusives,
    item.email_changeable,
    item.season_level,
    item.skin_count,
    item.price,
    item.vbucks,
    item.platform
  ].map(x=>String(x ?? "")).join(" ").toLowerCase();
}

function fieldNumber(item,key){
  const value = item?.[key];
  if(value === undefined || value === null || value === "" || value === "Unknown") return null;
  const match = String(value).match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function isUnknown(value){
  return value === undefined || value === null || value === "" || String(value).toLowerCase() === "unknown";
}

function emailMatches(value,mode){
  if(!mode) return true;
  const text=lower(value);
  const icon=iconBool(value);
  if(mode==="yes") return icon==="✅";
  if(mode==="no") return icon==="❌";
  if(mode==="known") return icon==="✅" || icon==="❌" || text.includes("same");
  if(mode==="same") return text.includes("same");
  return true;
}

function passesFilters(item,state=filterState()){
  const text=listingText(item);

  if(state.search && !text.includes(state.search)) return false;
  if(state.seller && !lower(item.seller).includes(state.seller)) return false;
  if(state.country && !lower(item.country).includes(state.country)) return false;

  const price=fieldNumber(item,"price");
  if(state.priceMin !== null && (price === null || price < state.priceMin)) return false;
  if(state.priceMax !== null && (price === null || price > state.priceMax)) return false;
  if(state.hideUnknownPrice && price === null) return false;

  const skins=fieldNumber(item,"skin_count");
  if(state.skinMin !== null && (skins === null || skins < state.skinMin)) return false;
  if(state.skinMax !== null && (skins === null || skins > state.skinMax)) return false;

  const level=fieldNumber(item,"season_level");
  if(state.levelMin !== null && (level === null || level < state.levelMin)) return false;
  if(state.levelMax !== null && (level === null || level > state.levelMax)) return false;

  if(!emailMatches(item.email_changeable,state.email)) return false;

  const uploaded=dateValue(item.uploaded_at || item.listed_at);
  const activity=dateValue(item.last_activity);

  if(state.uploadedAfter && (!uploaded || uploaded < state.uploadedAfter)) return false;
  if(state.uploadedBefore && (!uploaded || uploaded > state.uploadedBefore)) return false;
  if(state.activityAfter && (!activity || activity < state.activityAfter)) return false;
  if(state.activityBefore && (!activity || activity > state.activityBefore)) return false;

  if(state.quickOrder==="today"){
    const today=startOfToday();
    if(!uploaded || uploaded < today) return false;
  }
  if(state.quickOrder==="week"){
    const week=daysAgo(7);
    if(!uploaded || uploaded < week) return false;
  }
  if(state.quickOrder==="active30"){
    const active=daysAgo(30);
    if(!activity || activity < active) return false;
  }
  if(state.quickOrder==="has_price" && price===null) return false;

  if(state.includeTerms.length && !state.includeTerms.every(term=>text.includes(term))) return false;
  if(state.excludeTerms.length && state.excludeTerms.some(term=>text.includes(term))) return false;

  if(state.hideUnknownSeller && isUnknown(item.seller)) return false;
  if(state.hideUnknownCountry && isUnknown(item.country)) return false;

  if(state.onlyFullInfo){
    if(isUnknown(item.skin_count) || isUnknown(item.seller) || isUnknown(item.price) || isUnknown(item.country) || isUnknown(item.last_activity)) return false;
  }

  if(state.hasImagesOnly && (!Array.isArray(item.image_urls) || !item.image_urls.length)) return false;

  return true;
}

function sortResults(list,state=filterState()){
  const copy=list.slice();
  const num=(item,key)=>fieldNumber(item,key) ?? -Infinity;
  if(state.sort==="market") copy.sort((a,b)=>(a.scan_rank??0)-(b.scan_rank??0));

  if(state.sort==="uploaded_desc") copy.sort((a,b)=>dateCompareValue(b,"uploaded_at")-dateCompareValue(a,"uploaded_at"));
  if(state.sort==="uploaded_asc") copy.sort((a,b)=>dateCompareValue(a,"uploaded_at")-dateCompareValue(b,"uploaded_at"));
  if(state.sort==="listed_desc") copy.sort((a,b)=>dateCompareValue(b,"listed_at")-dateCompareValue(a,"listed_at"));
  if(state.sort==="activity_desc") copy.sort((a,b)=>dateCompareValue(b,"last_activity")-dateCompareValue(a,"last_activity"));
  if(state.sort==="price_asc") copy.sort((a,b)=>(fieldNumber(a,"price") ?? Infinity)-(fieldNumber(b,"price") ?? Infinity));
  if(state.sort==="price_desc") copy.sort((a,b)=>num(b,"price")-num(a,"price"));
  if(state.sort==="skins_desc") copy.sort((a,b)=>num(b,"skin_count")-num(a,"skin_count"));
  if(state.sort==="level_desc") copy.sort((a,b)=>num(b,"season_level")-num(a,"season_level"));

  return copy;
}

function visibleResults(){
  const state=filterState();
  return sortResults(currentResults().filter(item=>passesFilters(item,state)),state);
}

function filterSummaryText(){
  const s=filterState();
  const parts=[];
  if(s.search)parts.push(`search: ${s.search}`);
  if(s.priceMin!==null||s.priceMax!==null)parts.push(`price ${s.priceMin ?? 0}–${s.priceMax ?? "∞"}`);
  if(s.skinMin!==null||s.skinMax!==null)parts.push(`skins ${s.skinMin ?? 0}–${s.skinMax ?? "∞"}`);
  if(s.levelMin!==null||s.levelMax!==null)parts.push(`level ${s.levelMin ?? 0}–${s.levelMax ?? "∞"}`);
  if(s.seller)parts.push(`seller: ${s.seller}`);
  if(s.country)parts.push(`country: ${s.country}`);
  if(s.email)parts.push(`email: ${s.email}`);
  if(s.marketOrder)parts.push(`order: ${marketOrderLabel(s.marketOrder)}`);
  if(s.quickOrder)parts.push(`quick: ${s.quickOrder}`);
  if(s.uploadedAfter||s.uploadedBefore)parts.push(`uploaded ${$("uploadedAfter")?.value || "…"}–${$("uploadedBefore")?.value || "…"}`);
  if(s.activityAfter||s.activityBefore)parts.push(`activity ${$("activityAfter")?.value || "…"}–${$("activityBefore")?.value || "…"}`);
  if(s.includeTerms.length)parts.push(`include: ${s.includeTerms.join(", ")}`);
  if(s.excludeTerms.length)parts.push(`exclude: ${s.excludeTerms.join(", ")}`);
  if(s.onlyFullInfo)parts.push("full info only");
  if(s.hasImagesOnly)parts.push("has images");
  return parts.length ? parts.join(" · ") : "No extra filters active";
}

function marketOrderLabel(value){
  return ({
    pdate_to_down_upload:"newest uploaded",
    pdate_to_up_upload:"oldest uploaded",
    price_to_up:"cheapest first",
    price_to_down:"highest price",
    pdate_to_down:"newest listed",
    pdate_to_up:"oldest listed"
  })[value] || value;
}

function updateOrderChips(){
  const order=marketOrderValue();
  document.querySelectorAll("[data-order-preset]").forEach(btn=>{
    btn.classList.toggle("active",btn.dataset.orderPreset===order);
  });
}

function updateFilterSummary(){
  const el=$("filterSummary");
  if(el) el.textContent=filterSummaryText();

  const note=$("resultNote");
  updateOrderChips();
  if(note){
    const total=currentResults().length;
    const shown=visibleResults().length;
    note.textContent=total ? `${shown}/${total} shown after filters` : "Turbo results update live.";
  }
}

function refreshFilteredResults(){
  updateFilterSummary();
  renderResults();
}

function resetListingFilters(){
  ["filterSearch","priceMin","priceMax","skinMin","skinMax","levelMin","levelMax","sellerFilter","countryFilter","includeTerms","excludeTerms","uploadedAfter","uploadedBefore","activityAfter","activityBefore"].forEach(id=>{
    if($(id)) $(id).value="";
  });
  if($("emailFilter")) $("emailFilter").value="";
  if($("marketOrder")) $("marketOrder").value="pdate_to_down_upload";
  if($("sortFilter")) $("sortFilter").value="market";
  if($("quickOrder")) $("quickOrder").value="";
  ["hideUnknownPrice","hideUnknownSeller","hideUnknownCountry","onlyFullInfo"].forEach(id=>{
    if($(id)) $(id).checked=false;
  });
  refreshFilteredResults();
  toast("Filters reset");
}

function applyPreset(kind){
  resetListingFilters();

  if(kind==="fresh"){
    if($("marketOrder")) $("marketOrder").value="pdate_to_down_upload";
  if($("sortFilter")) $("sortFilter").value="market";
  if($("quickOrder")) $("quickOrder").value="";
    if($("hideUnknownPrice")) $("hideUnknownPrice").checked=true;
  }

  if(kind==="budget"){
    if($("priceMax")) $("priceMax").value="250";
    if($("marketOrder")) $("marketOrder").value="price_to_up";
    if($("sortFilter")) $("sortFilter").value="price_asc";
    if($("hideUnknownPrice")) $("hideUnknownPrice").checked=true;
  }

  if(kind==="premium"){
    if($("priceMin")) $("priceMin").value="250";
    if($("marketOrder")) $("marketOrder").value="price_to_down";
    if($("sortFilter")) $("sortFilter").value="price_desc";
  }

  refreshFilteredResults();
  toast(`${kind[0].toUpperCase()+kind.slice(1)} preset applied`);
}

function filterParamsForApi(params){
  const state=filterState();

  // These are common marketplace-style params. If LZT ignores one, local filters still apply.
  if(state.priceMin!==null) params.pmin=state.priceMin;
  if(state.priceMax!==null) params.pmax=state.priceMax;
  if(state.search) params.title=state.search;

  // Local filtering is the source of truth. These params are passed where the marketplace supports them.
  if(state.uploadedAfter) params.pdate_from = $("uploadedAfter")?.value;
  if(state.uploadedBefore) params.pdate_to = $("uploadedBefore")?.value;

  return params;
}

function bindFilterUi(){
  const ids=[
    "filterSearch","priceMin","priceMax","skinMin","skinMax","levelMin","levelMax",
    "sellerFilter","countryFilter","emailFilter","sortFilter","marketOrder","quickOrder","uploadedAfter","uploadedBefore","activityAfter","activityBefore","includeTerms","excludeTerms",
    "hideUnknownPrice","hideUnknownSeller","hideUnknownCountry","onlyFullInfo"
  ];

  ids.forEach(id=>{
    const el=$(id);
    if(!el)return;
    el.addEventListener("input",refreshFilteredResults);
    el.addEventListener("change",refreshFilteredResults);
  });

  if($("clearSearchBtn")) $("clearSearchBtn").onclick=()=>{if($("filterSearch")) $("filterSearch").value="";refreshFilteredResults();};
  if($("resetFiltersBtn")) $("resetFiltersBtn").onclick=resetListingFilters;
  if($("applyPresetFresh")) $("applyPresetFresh").onclick=()=>applyPreset("fresh");
  if($("applyPresetBudget")) $("applyPresetBudget").onclick=()=>applyPreset("budget");
  if($("applyPresetPremium")) $("applyPresetPremium").onclick=()=>applyPreset("premium");
  document.querySelectorAll("[data-order-preset]").forEach(btn=>{
    btn.onclick=()=>{
      const order=btn.dataset.orderPreset;
      if(order==="pdate_to_down_upload") setMarketOrder(order,"market");
      else if(order==="pdate_to_up_upload") setMarketOrder(order,"market");
      else if(order==="price_to_up") setMarketOrder(order,"price_asc");
      else if(order==="price_to_down") setMarketOrder(order,"price_desc");
      else if(order==="pdate_to_down") setMarketOrder(order,"market");
      else setMarketOrder(order,"market");
      toast(`${btn.textContent.trim()} order selected`);
      toast("Run scan again to apply marketplace order.");
    };
  });

  if($("marketOrder")){
    lastMarketOrderValue=$("marketOrder").value;
    $("marketOrder").addEventListener("change",()=>{
      updateOrderChips();
      refreshFilteredResults();
      if(currentResults().length) toast("Run scan again to apply the new marketplace order.");
      lastMarketOrderValue=$("marketOrder").value;
    });
  }

  // marketOrder changed handler above keeps API order honest.
  if($("viewCardsBtn")) $("viewCardsBtn").onclick=()=>{
    currentViewMode="cards";
    $("viewCardsBtn").classList.add("active");
    $("viewCompactBtn")?.classList.remove("active");
    renderResults();
  };
  if($("viewCompactBtn")) $("viewCompactBtn").onclick=()=>{
    currentViewMode="compact";
    $("viewCompactBtn").classList.add("active");
    $("viewCardsBtn")?.classList.remove("active");
    renderResults();
  };

  updateFilterSummary();
}

function card(caseItem){
  const link=/^\d+$/.test(String(caseItem.item_id))?`https://lzt.market/${caseItem.item_id}/`:"";
  const emailIcon=iconBool(caseItem.email_changeable);
  const extraLines=[
    caseItem.vbucks ? `💎 V-Bucks: ${caseItem.vbucks}` : "",
    caseItem.platform ? `🎮 Platform: ${caseItem.platform}` : "",
    caseItem.uploaded_at && caseItem.uploaded_at !== "Unknown" ? `🆕 Uploaded: ${niceDate(caseItem.uploaded_at)}` : "",
    caseItem.listed_at && caseItem.listed_at !== "Unknown" ? `📌 Listed: ${niceDate(caseItem.listed_at)}` : ""
  ].filter(Boolean).join("\n");

  const output=
`New Fortnite listing on LZT Market

Skin Count: ${caseItem.skin_count||"Unknown"}
Exclusives: ${caseItem.exclusives||(caseItem.matched_filters||[]).join(", ")||"Selected cosmetic filter"}
Email Changeable: ${emailIcon}

🏷️ Title: ${caseItem.title||"Untitled listing"}
👤 Seller: ${caseItem.seller||"Unknown"}
💵 Price: ${priceText(caseItem.price)}
🔢 Season Level: ${caseItem.season_level||"Unknown"}
🌍 Country: ${caseItem.country||"Unknown"}
⏱️ Last Activity: ${cleanDate(caseItem.last_activity)}${caseItem.uploaded_at && caseItem.uploaded_at !== "Unknown" ? `\n🆕 Uploaded: ${niceDate(caseItem.uploaded_at)}` : ""}${extraLines ? "\n"+extraLines : ""}
🔗 Link: ${link||"Unavailable"}`;

  return `<article class="listing-alert-card premium-card ${currentViewMode==="compact"?"compact-result":""}">
    <div class="listing-top">
      <div>
        <span class="listing-kicker">New Fortnite listing</span>
        <h4>${esc(caseItem.title || "Untitled listing")}</h4>
        <p class="exclusive-line">${esc(caseItem.exclusives || "Selected cosmetic filter")}</p>
      </div>
      <div class="price-badge">${esc(priceText(caseItem.price))}</div>
    </div>

    <div class="info-grid">
      <div><span>Skins</span><strong>${esc(caseItem.skin_count||"Unknown")}</strong></div>
      <div><span>Email</span><strong>${esc(emailIcon)}</strong></div>
      <div><span>Level</span><strong>${esc(caseItem.season_level||"Unknown")}</strong></div>
      <div><span>Country</span><strong>${esc(caseItem.country||"Unknown")}</strong></div>
      <div><span>Uploaded</span><strong>${esc(niceDate(caseItem.uploaded_at||"Unknown"))}</strong></div>
    </div>

    <pre class="listing-output">${esc(output)}</pre>

    <details class="inventory-section" open>
      <summary>Locker / inventory images</summary>
      ${renderInventoryImages(caseItem)}
    </details>

    <div class="card-actions">
      ${link?`<a class="ghost small" target="_blank" rel="noopener" href="${esc(link)}">Open source</a>`:""}
      <button class="ghost small" type="button" data-copy-text="${esc(output)}">Copy message</button>
      ${caseItem.item_id?`<button class="ghost small" type="button" data-copy="${esc(caseItem.item_id)}">Copy ID</button>`:""}
    </div>
    <details class="raw"><summary>Case data</summary><pre>${esc(JSON.stringify(caseItem,null,2))}</pre></details>
  </article>`;
}

function wireCopyButtons(){
  document.querySelectorAll("[data-copy], [data-copy-text]").forEach(btn=>{
    btn.onclick=async()=>{try{await navigator.clipboard.writeText(btn.dataset.copyText||btn.dataset.copy||"");toast("Copied");}catch{toast("Copy failed");}};
  });
}
function renderResults(items=null){
  const box=$("resultsBox");
  if(!box)return;

  const list = items || visibleResults();
  updateFilterSummary();

  if(!list.length){
    box.className="empty-state";
    const total=currentResults().length;
    box.innerHTML= total
      ? `<div class="empty-icon">⌕</div><h4>No results match your filters</h4><p>Relax the Filter Lab settings to show more listings.</p>`
      : `<div class="empty-icon">⌕</div><h4>No results yet</h4><p>Start a scan to populate this workspace.</p>`;
    return;
  }

  box.className=currentViewMode==="compact" ? "cards compact-cards" : "cards";
  box.innerHTML=list.map(card).join("");
  wireCopyButtons();
  hydrateInventoryImages(box);
}

function renderCases(){
  const box=$("casesBox");
  if(!box)return;
  const list=cases();
  if(!list.length){box.className="empty-state small-empty";box.innerHTML=`<div class="empty-icon">□</div><h4>No saved cases</h4><p>Matches will appear here after scanning.</p>`;return;}
  box.className="cards";box.innerHTML=list.map(card).join("");wireCopyButtons();
}
function updateStats(){
  if($("statMatches"))$("statMatches").textContent=String(visibleResults().length || currentResults().length);
  if($("statCases"))$("statCases").textContent=String(cases().length);
  if($("statLastScan"))$("statLastScan").textContent=safeLocalGet("wrota.selectoutfits.lastScan","—");
  if(typeof updateFilterSummary==="function") updateFilterSummary();
}
async function testKey(){
  setStatus("Testing","warn");if($("testBtn"))$("testBtn").disabled=true;
  try{await lztGet("/fortnite",{page:1,order_by:activeOrderBy(),currency:"usd"});setStatus("Connected","ok");toast("Key accepted");}
  catch(error){setStatus(error.message==="Rate limited"?"Rate limited":"Check failed","bad");toast(error.message==="Rate limited"?"Rate limited. Try again later.":`Key test failed: ${error.message}`);}
  finally{if($("testBtn"))$("testBtn").disabled=false;}
}

function limitNumber(value,min,max,fallback){
  const n=Number(value);
  if(Number.isNaN(n)) return fallback;
  return Math.max(min,Math.min(max,n));
}

async function runPool(tasks, limit, onProgress){
  const results=[];
  let index=0;
  let finished=0;

  async function worker(){
    while(index < tasks.length){
      const taskIndex=index++;
      try{
        results[taskIndex]=await tasks[taskIndex]();
      }catch(error){
        results[taskIndex]={error};
      }
      finished++;
      if(onProgress) onProgress(finished,tasks.length,taskIndex,results[taskIndex]);
    }
  }

  const workers=Array.from({length:Math.max(1,Math.min(limit,tasks.length))},worker);
  await Promise.all(workers);
  return results;
}

function mergeFound(found,item,label){
  const id=listingId(item);
  if(!id)return;
  const existing=found.get(id) || {summary:{}, labels:[]};
  existing.summary={...existing.summary,...item};
  existing.labels=[...new Set([...(existing.labels||[]),label])];
  found.set(id,existing);
}

function updateSpeedBadge(text){
  const el=$("speedBadge");
  if(el) el.textContent=text;
}

async function scan(){
  const cosmeticFilters=parseCosmeticInput();
  renderActiveCosmetics();

  if(!cosmeticFilters.length){
    toast("Paste filter params or cosmetic IDs first.");
    setSubtitle("No cosmetic filters found.");
    return;
  }

  const pages=limitNumber($("pagesPerFilter")?.value,1,25,3);
  const delay=limitNumber($("requestDelay")?.value,0,15000,250);
  const maxConcurrent=limitNumber($("maxConcurrent")?.value,1,10,5);
  const enrichDetails=Boolean($("enrichDetails")?.checked);
  const stopOn429=Boolean($("stopOn429")?.checked);

  const found=new Map();
  const pageTasks=[];

  for(const filter of cosmeticFilters){
    for(let page=1;page<=pages;page++){
      pageTasks.push(async()=>{
        if(delay) await sleep(delay);
        const data=await lztGet("/fortnite",paramsForCosmetic(filter,page));
        const items=extractItems(data);
        return {filter,page,items};
      });
    }
  }

  clearImageBlobCache();
  saveCurrentResults([]);
  renderResults([]);
  setStatus("Turbo scanning","warn");
  updateSpeedBadge(`⚡ ${maxConcurrent}x parallel`);
  setSubtitle("Turbo scan running. Results appear as soon as they are found.");
  if($("scanBtn"))$("scanBtn").disabled=true;

  try{
    await runPool(pageTasks,maxConcurrent,(done,total,taskIndex,result)=>{
      if(result?.error){
        if(result.error.isRateLimit && stopOn429){
          throw result.error;
        }
      }else if(result?.items){
        const label=result.filter.label || labelForCosmetic(result.filter.param,result.filter.id);
        for(const item of result.items){
          mergeFound(found,item,label);
        }

        const quick=[...found.values()].map(pack=>{
          const record=extractListingFields(pack.summary,{},pack.labels);
          record.note="Fast result; detail enrichment pending";
          return compactCase(record);
        });

        saveCurrentResults(quick);
        renderResults();
      }

      progress(done,total,`Turbo page scan ${done}/${total}`);
      setSubtitle(`${visibleResults().length}/${found.size} listing(s) shown after filters.`);
    });

    let quickResults=[...found.values()].map((pack,scanIndex)=>{
      const record=extractListingFields(pack.summary,{},pack.labels);
      record.note=enrichDetails ? "Fast result; enriching details" : "Fast result";
      const compact=compactCase(record);
      compact.scan_rank=scanIndex;
      return compact;
    });

    saveCurrentResults(quickResults);
    renderResults();

    if(enrichDetails && found.size){
      setStatus("Enriching","warn");
      setSubtitle("Filling missing fields with listing detail data.");
      const entries=[...found.entries()];

      const detailTasks=entries.map(([id,pack])=>async()=>{
        if(delay) await sleep(Math.min(delay,700));
        const detailData=await getListingDetail(id);
        let pageImages=[];
        if($("scrapeListingPageImages") ? $("scrapeListingPageImages").checked : true){
          const html=await fetchListingPageHtml(id);
          pageImages=extractLockerImagesFromHtml(html);
        }
        return {id,pack,detailData,pageImages};
      });

      const enrichedById=new Map();

      await runPool(detailTasks,Math.max(1,Math.min(maxConcurrent,6)),(done,total,taskIndex,result)=>{
        if(result && !result.error){
          const record=extractListingFields(result.pack.summary,result.detailData,result.pack.labels);
          record.image_urls=combineImageLists(result.pageImages,record.image_urls);
          enrichedById.set(result.id,compactCase(record));

          const merged=entries.map(([id,pack])=>{
            if(enrichedById.has(id)) return enrichedById.get(id);
            const pending=extractListingFields(pack.summary,{},pack.labels);
            pending.note="Fast result; detail enrichment pending";
            return compactCase(pending);
          });

          saveCurrentResults(merged);
          renderResults();
        }

        progress(done,total,`Turbo enrichment ${done}/${total}`);
        setSubtitle(`Enriched ${done}/${total} listing(s).`);
      });
    }

    const old=cases();
    const seen=new Set(old.map(c=>String(c.item_id)));
    for(const result of currentResults()){
      if(result.item_id&&!seen.has(String(result.item_id))){
        old.unshift(result);
        seen.add(String(result.item_id));
      }
    }
    saveCases(old);

    const stamp=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    safeLocalSet("wrota.selectoutfits.lastScan",stamp);
    updateStats();
    setSubtitle(currentResults().length ? "Turbo scan complete." : "No numeric listings found for the selected exact filters.");
    setStatus(`Done · ${currentResults().length} found`,"ok");
    updateSpeedBadge("⚡ Turbo complete");
  }catch(error){
    if(error.isRateLimit){
      setStatus("Rate limited","bad");
      updateSpeedBadge("⚠️ Rate limited");
      setSubtitle("Rate limit reached. Lower parallel requests or raise delay.");
      toast("Rate limited. Try lower parallel requests.");
    }else{
      setStatus("Scan failed","bad");
      updateSpeedBadge("⚠️ Scan issue");
      setSubtitle(error.message);
      toast(`Scan failed: ${error.message}`);
    }
  }finally{
    if($("scanBtn"))$("scanBtn").disabled=false;
    $("progressWrap")?.classList.add("hidden");
    updateStats();
  }
}


function downloadJson(filename,data){
  const blob=new Blob([JSON.stringify(data.map?data.map(compactCase):data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}
function bind(){
  $("accessForm")?.addEventListener("submit",event=>{event.preventDefault();testKey();});
  if($("toggleKey"))$("toggleKey").onclick=()=>{const input=$("apiToken");if(!input)return;const showing=input.type==="text";input.type=showing?"password":"text";$("toggleKey").textContent=showing?"Show":"Hide";};
  if($("clearKeyBtn"))$("clearKeyBtn").onclick=()=>{if($("apiToken"))$("apiToken").value="";setStatus("Not connected","idle");toast("Cleared for this page");};
  if($("testBtn"))$("testBtn").onclick=testKey;
  if($("scanBtn"))$("scanBtn").onclick=scan;
  if($("exportResultsBtn"))$("exportResultsBtn").onclick=()=>downloadJson("wrota-results.json",currentResults());
  if($("exportCasesBtn"))$("exportCasesBtn").onclick=()=>downloadJson("wrota-cases.json",cases());
  if($("clearCasesBtn"))$("clearCasesBtn").onclick=()=>{saveCases([]);renderCases();toast("Cases cleared");};
  bindFilterUi();
  if($("resetCosmeticsBtn"))$("resetCosmeticsBtn").onclick=()=>{$("cosmeticSearchInput").value="";renderActiveCosmetics();toast("Cosmetic filters reset");};
  if($("cosmeticSearchInput"))$("cosmeticSearchInput").addEventListener("input",renderActiveCosmetics);
}
function init(){
  try{
    loadCases();
    renderActiveCosmetics();
    renderResults();
    renderCases();
    updateStats();
    bind();
    setStatus("Ready","idle");
  }catch(error){
    console.error(error);
    setStatus("Load issue","bad");
    setSubtitle(error.message||"Load issue");
  }
}
window.addEventListener("error",event=>{console.error(event.error||event.message);setStatus("Load issue","bad");setSubtitle(event.message||"Script issue");});
window.addEventListener("unhandledrejection",event=>{console.error(event.reason);setStatus("Request issue","bad");setSubtitle(event?.reason?.message||String(event.reason||"Request issue"));});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
else init();
