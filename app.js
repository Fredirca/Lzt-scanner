const DEFAULT_PROXY_URL="https://shiny-shape-49fd.flruming.workers.dev";
const API_BASE="https://prod-api.lzt.market";

const DEFAULT_TARGETS=[
  {param:"pickaxe[]",id:"pickaxe_lockjaw_og",label:"Raider’s Revenge OG Style"},
  {param:"skin[]",id:"030_athena_commando_m_halloween_og",label:"OG Skull Trooper / Purple Skull"},
  {param:"skin[]",id:"029_athena_commando_f_halloween_og",label:"OG Ghoul Trooper / Pink Ghoul"},
  {param:"skin[]",id:"028_athena_commando_f_og",label:"Renegade Raider OG Style"},
  {param:"skin[]",id:"017_athena_commando_m_og",label:"Aerial Assault Trooper OG Style"}
];

let targets=DEFAULT_TARGETS.slice();
let results=[];
let saved=[];
let viewMode="cards";
let imageBlobCache=new Map();

const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function toast(text){
  const el=document.createElement("div");
  el.className="toast";
  el.textContent=text;
  $("toastHost")?.appendChild(el);
  setTimeout(()=>el.remove(),3200);
}
function setStatus(text,type=""){
  if($("sessionState"))$("sessionState").textContent=text;
  if($("speedBadge"))$("speedBadge").textContent=type==="running"?"⚡ Scanning":type==="done"?"⚡ Complete":type==="bad"?"⚠️ Issue":"⚡ Ready";
}
function token(){return ($("apiToken")?.value||"").trim();}
function clampNum(value,min,max,fall){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fall;
}
function safeGet(key,fall){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fall;}catch{return fall;}}
function safeSet(key,val){try{localStorage.setItem(key,JSON.stringify(val));}catch{}}
function proxiedUrl(url){return `${DEFAULT_PROXY_URL.replace(/\/+$/,"")}/proxy?url=${encodeURIComponent(url)}`;}
async function fetchTimeout(url,options={},ms=45000){
  const c=new AbortController();
  const t=setTimeout(()=>c.abort(),ms);
  try{return await fetch(url,{...options,signal:c.signal});}
  catch(e){if(e.name==="AbortError")throw new Error("Request timed out");throw e;}
  finally{clearTimeout(t);}
}
async function lztGet(path="/fortnite",params={}){
  if(!token())throw new Error("API key required");
  const url=new URL(API_BASE+(path.startsWith("/")?path:`/${path}`));
  Object.entries(params).forEach(([k,v])=>{
    if(v===undefined||v===null||v==="")return;
    if(Array.isArray(v))v.forEach(x=>url.searchParams.append(k,x));
    else url.searchParams.append(k,v);
  });
  const res=await fetchTimeout(proxiedUrl(url.toString()),{headers:{"Accept":"application/json","X-LZT-Key":token()}});
  if(res.status===401||res.status===403)throw new Error("API key rejected");
  if(res.status===429){const e=new Error("Rate limited");e.isRateLimit=true;throw e;}
  if(!res.ok)throw new Error(`${res.status} response`);
  const text=await res.text();
  try{return JSON.parse(text);}catch{return {raw:text};}
}
async function fetchPageHtml(id){
  if(!/^\d+$/.test(String(id)))return "";
  try{
    const res=await fetchTimeout(proxiedUrl(`https://lzt.market/${id}/`),{headers:{"Accept":"text/html,*/*","X-LZT-Key":token()}});
    if(!res.ok)return "";
    return await res.text();
  }catch{return "";}
}
async function loadImage(img,url){
  if(!img||!url)return;
  if(imageBlobCache.has(url)){img.src=imageBlobCache.get(url);img.classList.add("loaded");return;}
  try{
    const res=await fetchTimeout(proxiedUrl(url),{headers:{"Accept":"image/avif,image/webp,image/apng,image/*,*/*;q=0.8","X-LZT-Key":token()}},45000);
    if(!res.ok)throw new Error("image failed");
    const blob=await res.blob();
    if(!blob.type.startsWith("image/"))throw new Error("not image");
    const obj=URL.createObjectURL(blob);
    imageBlobCache.set(url,obj);
    img.src=obj;img.classList.add("loaded");
  }catch{
    img.src=url;img.classList.add("fallback");
  }
}
function hydrateImages(root=document){
  root.querySelectorAll("img[data-img]").forEach(img=>{
    if(img.dataset.loaded==="1")return;
    img.dataset.loaded="1";
    loadImage(img,img.dataset.img);
  });
}
function clearImageCache(){
  for(const v of imageBlobCache.values())try{URL.revokeObjectURL(v);}catch{}
  imageBlobCache.clear();
}

function decodeHtml(s){const x=document.createElement("textarea");x.innerHTML=String(s||"");return x.value;}
function absoluteImg(url){
  const raw=decodeHtml(String(url||"").replace(/\\\//g,"/").replace(/&amp;/g,"&")).trim();
  if(raw.startsWith("//"))return `https:${raw}`;
  if(/^https?:\/\//i.test(raw))return raw;
  return "";
}
function imageOkay(url){
  const l=String(url).toLowerCase();
  if(!/^https?:\/\//.test(l))return false;
  if(l.includes("avatar")||l.includes("smilie")||l.includes("emoji")||l.includes("logo"))return false;
  return /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(l)||l.includes("locker")||l.includes("inventory")||l.includes("fortnite")||l.includes("cdn")||l.includes("image");
}
function extractImages(value,seen=new WeakSet(),out=[]){
  if(value==null)return out;
  if(typeof value==="string"){
    const txt=decodeHtml(value);
    const attrs=[...txt.matchAll(/(?:src|data-src|data-original|data-full|href)=["']([^"']+)["']/gi)].map(m=>m[1]);
    const srcsets=[...txt.matchAll(/srcset=["']([^"']+)["']/gi)].flatMap(m=>m[1].split(",").map(x=>x.trim().split(/\s+/)[0]));
    const css=[...txt.matchAll(/url\((["']?)([^"')]+)\1\)/gi)].map(m=>m[2]);
    const raw=[...txt.matchAll(/https?:\\?\/\\?\/[^"'<>)\s]+?\.(?:png|jpe?g|webp|gif)(?:\?[^"'<>)\s]*)?/gi)].map(m=>m[0].replace(/\\\//g,"/"));
    out.push(...attrs,...srcsets,...css,...raw);
    return out;
  }
  if(typeof value!=="object")return out;
  if(seen.has(value))return out;
  seen.add(value);
  if(Array.isArray(value)){value.forEach(x=>extractImages(x,seen,out));return out;}
  Object.values(value).forEach(x=>extractImages(x,seen,out));
  return out;
}
function uniqueImages(payload){
  const seen=new Set();
  return extractImages(payload).map(absoluteImg).filter(imageOkay).filter(u=>{
    const key=u.split("#")[0];
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).slice(0,18);
}

function canonicalParam(k){
  const key=decodeURIComponent(String(k||"")).toLowerCase();
  if(key.startsWith("skin"))return "skin[]";
  if(key.startsWith("pickaxe"))return "pickaxe[]";
  if(key.startsWith("dance")||key.startsWith("emote"))return "dance[]";
  if(key.startsWith("glider"))return "glider[]";
  return "";
}
function inferParam(id){
  const l=String(id).toLowerCase();
  if(l.startsWith("pickaxe"))return "pickaxe[]";
  if(l.includes("athena_commando")||l.includes("commando"))return "skin[]";
  return "skin[]";
}
function labelFor(param,id){
  const l=String(id).toLowerCase();
  if(param==="pickaxe[]"&&l.includes("lockjaw_og"))return "Raider’s Revenge OG Style";
  if(l.includes("030_athena_commando_m_halloween_og"))return "OG Skull Trooper / Purple Skull";
  if(l.includes("029_athena_commando_f_halloween_og"))return "OG Ghoul Trooper / Pink Ghoul";
  if(l.includes("028_athena_commando_f_og"))return "Renegade Raider OG Style";
  if(l.includes("017_athena_commando_m_og"))return "Aerial Assault Trooper OG Style";
  return `${param} ${id}`;
}
function pushTarget(list,param,id){
  const clean=decodeURIComponent(String(id||"")).trim().replace(/^cid_/i,"").split(/[&#]/)[0];
  if(!param||!clean)return;
  const key=`${param}:${clean}`;
  if(list.some(x=>`${x.param}:${x.id}`===key))return;
  list.push({param,id:clean,label:labelFor(param,clean)});
}
function parseTargets(text){
  const out=[];
  const raw=decodeURIComponent(String(text||""));
  try{
    if(raw.includes("http")){
      const u=new URL(raw);
      for(const [k,v] of u.searchParams.entries()){const p=canonicalParam(k);if(p)pushTarget(out,p,v);}
    }
  }catch{}
  const re=/(skin|pickaxe|dance|emote|glider)(?:\[\]|%5B%5D)?\s*=\s*([a-zA-Z0-9_'’-]+)/gi;
  let m;while((m=re.exec(raw))!==null)pushTarget(out,canonicalParam(m[1]),m[2]);
  raw.split(/[\s,;|]+/).forEach(tok=>{
    const t=tok.trim();
    if(!t||t.includes("=")||t.includes("http"))return;
    if(/^[a-zA-Z0-9_'’-]+$/.test(t)&&(t.includes("athena")||t.includes("pickaxe")||t.includes("commando")))pushTarget(out,inferParam(t),t);
  });
  return out;
}
function renderTargets(){
  $("targetChips").innerHTML=targets.map((t,i)=>`<span class="target-chip">${esc(t.label)}<button data-remove-target="${i}" type="button">×</button></span>`).join("");
  document.querySelectorAll("[data-remove-target]").forEach(btn=>btn.onclick=()=>{targets.splice(Number(btn.dataset.removeTarget),1);renderTargets();});
}

function listingId(item){
  const raw=item?.item_id??item?.itemId??item?.account_id??item?.accountId??"";
  const s=String(raw);
  return /^\d+$/.test(s)?s:"";
}
function isListing(item){
  if(!item||typeof item!=="object")return false;
  const id=listingId(item);
  if(!id)return false;
  const txt=String(item.id||item.item_id||"").toLowerCase();
  if(txt.startsWith("cid_")||txt.includes("athena_commando"))return false;
  return Boolean(item.title||item.item_title||item.name) && (item.price!==undefined||item.price_usd!==undefined||item.seller||item.user||item.item_id||item.account_id);
}
function extractItems(data){
  const out=[],seen=new Set();
  function walk(v){
    if(!v)return;
    if(Array.isArray(v)){v.forEach(walk);return;}
    if(typeof v!=="object")return;
    if(isListing(v)){
      const id=listingId(v);
      if(!seen.has(id)){seen.add(id);out.push(v);}
    }
    for(const [k,n] of Object.entries(v)){
      if(["items","data","results","list","accounts","market_items","response"].includes(k)||Array.isArray(n))walk(n);
    }
  }
  walk(data);
  return out;
}
function deepText(v,seen=new WeakSet()){ 
  if(v==null)return "";
  if(["string","number","boolean"].includes(typeof v))return String(v);
  if(typeof v!=="object"||seen.has(v))return "";
  seen.add(v);
  if(Array.isArray(v))return v.map(x=>deepText(x,seen)).join(" ");
  return Object.values(v).map(x=>deepText(x,seen)).join(" ");
}
function firstDeep(v,keys){
  let found="";
  function walk(x){
    if(found||!x||typeof x!=="object")return;
    if(Array.isArray(x)){x.forEach(walk);return;}
    for(const k of keys)if(x[k]!==undefined&&x[k]!==null&&x[k]!==""){found=x[k];return;}
    Object.values(x).forEach(walk);
  }
  walk(v);return found;
}
function numFromTitle(title,patterns){
  for(const p of patterns){const m=String(title||"").match(p);if(m)return m[1];}
  return "";
}
function known(v){return v!==undefined&&v!==null&&v!==""&&String(v).toLowerCase()!=="unknown";}
function boolIcon(v){
  if(typeof v==="boolean")return v?"✅":"❌";
  const s=String(v??"").toLowerCase();
  if(["1","true","yes","changeable","available"].includes(s))return "✅";
  if(["0","false","no","none","not"].includes(s))return "❌";
  if(s.includes("same"))return "Same email";
  return "❔";
}
function priceText(v){
  if(!known(v))return "Unknown";
  const n=Number(v);
  if(Number.isFinite(n))return `$${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  return String(v).startsWith("$")?String(v):`$${v}`;
}
function dateVal(v){
  if(!known(v))return null;
  if(typeof v==="number"){const d=new Date((v>1e11?v:v*1000));return Number.isNaN(d.getTime())?null:d;}
  const m=String(v).match(/\d{4}-\d{2}-\d{2}/);
  const d=new Date(m?`${m[0]}T00:00:00`:String(v));
  return Number.isNaN(d.getTime())?null:d;
}
function niceDate(v){const d=dateVal(v);return d?d.toISOString().slice(0,10):"Unknown";}

function compact(item){
  const id=listingId(item)||String(item.item_id??"");
  const filters=item.matched_filters||[];
  return {
    scan_rank:item.scan_rank??0,
    item_id:id,
    title:item.title||item.item_title||item.name||(id?`Listing ${id}`:"Listing"),
    skin_count:item.skin_count??item.skins_count??item.skins??item.outfits_count??"Unknown",
    exclusives:item.exclusives||(filters.length?filters.join(", "):"Selected cosmetic filter"),
    email_changeable:item.email_changeable??item.change_email??item.changeable_email??"Unknown",
    price:item.price??item.price_usd??item.cost??item.amount??"",
    currency:item.currency||"USD",
    seller:typeof item.seller==="string"?item.seller:(item.seller?.username||item.seller?.name||item.user?.username||item.username||item.seller_username||"Unknown"),
    season_level:item.season_level??item.level??item.account_level??"Unknown",
    country:item.country||item.country_code||item.origin||"Unknown",
    last_activity:item.last_activity||item.last_activity_at||item.last_seen||item.last_login||"Unknown",
    uploaded_at:item.uploaded_at||item.upload_date||item.pdate_upload||item.pdate||"Unknown",
    vbucks:item.vbucks??item.v_bucks??"",
    platform:item.platform||"",
    image_urls:Array.isArray(item.image_urls)?item.image_urls.slice(0,18):[],
    matched_filters:filters,
    url:id?`https://lzt.market/${id}/`:"",
    note:item.note||""
  };
}
function buildRecord(summary,detail,labels,rank=0){
  const root=detail?.item||detail?.data||detail?.account||detail?.response||detail||{};
  const merged={...summary,...root};
  const id=listingId(summary)||listingId(merged);
  const title=summary.title||summary.item_title||merged.title||merged.item_title||merged.name||`Listing ${id}`;
  const sellerObj=summary.seller||merged.seller||summary.user||merged.user||{};
  let skin=summary.skin_count??summary.skins_count??summary.skins??merged.skin_count??merged.skins_count??merged.skins??firstDeep({summary,detail},["skin_count","skins_count","outfits_count","fortnite_skins_count"]);
  if(!known(skin))skin=numFromTitle(title, [/(\d+)\s*skins?/i,/(\d+)\s*outfits?/i]);
  let email=summary.email_changeable??merged.email_changeable??merged.change_email??firstDeep({summary,detail},["email_changeable","change_email","changeable_email","can_change_email"]);
  if(!known(email)){const s=title.toLowerCase();email=s.includes("same email")?"Same email":s.includes("changeable email")?"yes":"Unknown";}
  let level=summary.season_level??summary.level??merged.season_level??merged.level??firstDeep({summary,detail},["season_level","account_level","fortnite_level","level"]);
  if(!known(level))level=numFromTitle(title,[/level\s*[:#-]?\s*(\d+)/i,/lvl\s*[:#-]?\s*(\d+)/i]);
  const imgs=uniqueImages({summary,detail});
  return compact({
    scan_rank:rank,
    item_id:id,
    title,
    skin_count:known(skin)?skin:"Unknown",
    exclusives:labels.join(", "),
    email_changeable:known(email)?email:"Unknown",
    price:summary.price??summary.price_usd??merged.price??merged.price_usd??merged.cost??"",
    currency:String(summary.currency||merged.currency||"USD").toUpperCase(),
    seller:typeof sellerObj==="string"?sellerObj:(sellerObj.username||sellerObj.name||summary.seller_username||merged.username||"Unknown"),
    season_level:known(level)?level:"Unknown",
    country:summary.country||merged.country||summary.country_code||merged.country_code||merged.origin||"Unknown",
    last_activity:summary.last_activity||merged.last_activity||summary.last_activity_at||merged.last_activity_at||summary.last_seen||merged.last_seen||"Unknown",
    uploaded_at:summary.uploaded_at||summary.upload_date||summary.pdate_upload||summary.pdate||merged.uploaded_at||merged.pdate||"Unknown",
    vbucks:summary.vbucks??merged.vbucks??numFromTitle(title, [/(\d+)\s*vb/i,/(\d+)\s*v-?bucks/i]),
    platform:summary.platform||merged.platform||"",
    image_urls:imgs,
    matched_filters:labels,
    note:detail?.detail_error?"Detail unavailable":""
  });
}
async function detail(id){
  try{return await lztGet(`/${id}`);}catch(e1){try{return await lztGet(`/fortnite/${id}`);}catch(e2){return {detail_error:e1.message};}}
}
async function enrichImagesFromPage(record){
  if(!$("lockerImages")?.checked||!record.item_id)return record;
  const html=await fetchPageHtml(record.item_id);
  const imgs=uniqueImages({html});
  record.image_urls=[...new Set([...imgs,...(record.image_urls||[])])].slice(0,18);
  return record;
}

function paramsFor(t,page){
  const p={page,order_by:$("marketOrder")?.value||"pdate_to_down_upload",currency:"usd"};
  p[t.param]=t.id;
  const f=getFilters();
  if(f.search)p.title=f.search;
  if(f.priceMin!==null)p.pmin=f.priceMin;
  if(f.priceMax!==null)p.pmax=f.priceMax;
  return p;
}
async function pool(tasks,limit,onDone){
  const out=[];let i=0,done=0;
  async function worker(){
    while(i<tasks.length){
      const idx=i++;
      try{out[idx]=await tasks[idx]();}catch(e){out[idx]={error:e};}
      done++;onDone?.(done,tasks.length,idx,out[idx]);
    }
  }
  await Promise.all(Array.from({length:Math.max(1,Math.min(limit,tasks.length))},worker));
  return out;
}

function textOf(r){return [r.title,r.seller,r.country,r.exclusives,r.email_changeable,r.price,r.skin_count,r.season_level].join(" ").toLowerCase();}
function nField(r,k){const m=String(r[k]??"").match(/-?\d+(\.\d+)?/);return m?Number(m[0]):null;}
function terms(v){return String(v||"").split(/[,|]+/).map(x=>x.trim().toLowerCase()).filter(Boolean);}
function getFilters(){
  return {
    search:String($("filterSearch")?.value||"").toLowerCase().trim(),
    priceMin:numOrNull("priceMin"),priceMax:numOrNull("priceMax"),
    skinMin:numOrNull("skinMin"),skinMax:numOrNull("skinMax"),
    levelMin:numOrNull("levelMin"),levelMax:numOrNull("levelMax"),
    seller:String($("sellerFilter")?.value||"").toLowerCase().trim(),
    country:String($("countryFilter")?.value||"").toLowerCase().trim(),
    email:$("emailFilter")?.value||"",
    sort:$("displaySort")?.value||"market",
    uploadedAfter:dateInput("uploadedAfter"),activityAfter:dateInput("activityAfter"),
    include:terms($("includeTerms")?.value),exclude:terms($("excludeTerms")?.value),
    hideUnknownPrice:$("hideUnknownPrice")?.checked,hideUnknownSeller:$("hideUnknownSeller")?.checked,hideUnknownCountry:$("hideUnknownCountry")?.checked,
    hasImagesOnly:$("hasImagesOnly")?.checked,onlyFullInfo:$("onlyFullInfo")?.checked
  };
}
function numOrNull(id){const n=Number($(id)?.value);return Number.isFinite(n)?n:null;}
function dateInput(id){const v=$(id)?.value;if(!v)return null;const d=new Date(`${v}T00:00:00`);return Number.isNaN(d.getTime())?null:d;}
function passes(r,f=getFilters()){
  const txt=textOf(r);
  if(f.search&&!txt.includes(f.search))return false;
  if(f.seller&&!String(r.seller).toLowerCase().includes(f.seller))return false;
  if(f.country&&!String(r.country).toLowerCase().includes(f.country))return false;
  const price=nField(r,"price"),skins=nField(r,"skin_count"),level=nField(r,"season_level");
  if(f.priceMin!==null&&(price===null||price<f.priceMin))return false;
  if(f.priceMax!==null&&(price===null||price>f.priceMax))return false;
  if(f.skinMin!==null&&(skins===null||skins<f.skinMin))return false;
  if(f.skinMax!==null&&(skins===null||skins>f.skinMax))return false;
  if(f.levelMin!==null&&(level===null||level<f.levelMin))return false;
  if(f.levelMax!==null&&(level===null||level>f.levelMax))return false;
  const em=boolIcon(r.email_changeable), et=String(r.email_changeable).toLowerCase();
  if(f.email==="yes"&&em!=="✅")return false;
  if(f.email==="no"&&em!=="❌")return false;
  if(f.email==="known"&&em!=="✅"&&em!=="❌"&&!et.includes("same"))return false;
  if(f.email==="same"&&!et.includes("same"))return false;
  if(f.uploadedAfter){const d=dateVal(r.uploaded_at);if(!d||d<f.uploadedAfter)return false;}
  if(f.activityAfter){const d=dateVal(r.last_activity);if(!d||d<f.activityAfter)return false;}
  if(f.include.length&&!f.include.every(t=>txt.includes(t)))return false;
  if(f.exclude.length&&f.exclude.some(t=>txt.includes(t)))return false;
  if(f.hideUnknownPrice&&price===null)return false;
  if(f.hideUnknownSeller&&String(r.seller).toLowerCase()==="unknown")return false;
  if(f.hideUnknownCountry&&String(r.country).toLowerCase()==="unknown")return false;
  if(f.hasImagesOnly&&!(r.image_urls||[]).length)return false;
  if(f.onlyFullInfo&&["skin_count","seller","price","country","last_activity"].some(k=>!known(r[k])))return false;
  return true;
}
function visible(){
  const f=getFilters();const arr=results.filter(r=>passes(r,f)).slice();
  const num=(r,k)=>nField(r,k)??-Infinity;
  if(f.sort==="market")arr.sort((a,b)=>(a.scan_rank??0)-(b.scan_rank??0));
  if(f.sort==="price_asc")arr.sort((a,b)=>(nField(a,"price")??Infinity)-(nField(b,"price")??Infinity));
  if(f.sort==="price_desc")arr.sort((a,b)=>num(b,"price")-num(a,"price"));
  if(f.sort==="skins_desc")arr.sort((a,b)=>num(b,"skin_count")-num(a,"skin_count"));
  if(f.sort==="level_desc")arr.sort((a,b)=>num(b,"season_level")-num(a,"season_level"));
  if(f.sort==="activity_desc")arr.sort((a,b)=>(dateVal(b.last_activity)?.getTime()??-Infinity)-(dateVal(a.last_activity)?.getTime()??-Infinity));
  return arr;
}

function alertText(r){
  const extra=[
    r.vbucks?`💎 V-Bucks: ${r.vbucks}`:"",
    r.uploaded_at&&r.uploaded_at!=="Unknown"?`🆕 Uploaded: ${niceDate(r.uploaded_at)}`:""
  ].filter(Boolean).join("\n");
  return `New Fortnite listing on LZT Market\n\nSkin Count: ${r.skin_count||"Unknown"}\nExclusives: ${r.exclusives||"Selected cosmetic filter"}\nEmail Changeable: ${boolIcon(r.email_changeable)}\n\n🏷️ Title: ${r.title||"Untitled listing"}\n👤 Seller: ${r.seller||"Unknown"}\n💵 Price: ${priceText(r.price)}\n🔢 Season Level: ${r.season_level||"Unknown"}\n🌍 Country: ${r.country||"Unknown"}\n⏱️ Last Activity: ${niceDate(r.last_activity)}${extra?"\n"+extra:""}\n🔗 Link: https://lzt.market/${r.item_id}/`;
}
function card(r){
  const msg=alertText(r);
  const imgs=r.image_urls||[];
  return `<article class="card">
    <div class="card-top">
      <div><span class="pill">New listing</span><h3>${esc(r.title)}</h3><p class="exclusive">${esc(r.exclusives)}</p></div>
      <div class="price">${esc(priceText(r.price))}</div>
    </div>
    <div class="info">
      <div><span>Skins</span><strong>${esc(r.skin_count)}</strong></div>
      <div><span>Email</span><strong>${esc(boolIcon(r.email_changeable))}</strong></div>
      <div><span>Level</span><strong>${esc(r.season_level)}</strong></div>
      <div><span>Country</span><strong>${esc(r.country)}</strong></div>
      <div><span>Uploaded</span><strong>${esc(niceDate(r.uploaded_at))}</strong></div>
    </div>
    <pre class="message">${esc(msg)}</pre>
    <details class="gallery-wrap" open>
      <summary>Locker images</summary>
      ${imgs.length?`<div class="gallery">${imgs.map((u,i)=>`<a class="thumb" href="${esc(u)}" target="_blank" rel="noopener"><img data-img="${esc(u)}" alt="Locker image ${i+1}"><span class="loader">Loading…</span></a>`).join("")}</div><div class="image-actions"><button class="ghost small" data-copy-text="${esc(imgs.join("\\n"))}" type="button">Copy image links</button><span>${imgs.length} image${imgs.length===1?"":"s"}</span></div>`:`<div class="no-images">No locker images found yet.</div>`}
    </details>
    <div class="card-actions">
      <a class="ghost small" href="https://lzt.market/${esc(r.item_id)}/" target="_blank" rel="noopener">Open source</a>
      <button class="ghost small" data-copy-text="${esc(msg)}" type="button">Copy message</button>
      <button class="ghost small" data-save="${esc(r.item_id)}" type="button">Save</button>
    </div>
    <details class="raw"><summary>Case data</summary><pre>${esc(JSON.stringify(r,null,2))}</pre></details>
  </article>`;
}
function renderResults(){
  const list=visible();
  $("statShown").textContent=list.length;
  $("statFound").textContent=results.length;
  $("statSaved").textContent=saved.length;
  $("statLast").textContent=safeGet("wrota.rebuilt.last","—");
  $("filterSummary").textContent=summaryText();

  const box=$("resultsBox");
  if(!list.length){
    box.className="empty";
    box.innerHTML=results.length?`<div class="empty-icon">⌕</div><h3>No matches with current filters</h3><p>Open Filter Lab and relax your filters.</p>`:`<div class="empty-icon">⌕</div><h3>No results yet</h3><p>Hit Scan now when your targets are ready.</p>`;
    return;
  }
  box.className=viewMode==="compact"?"cards compact":"cards";
  box.innerHTML=list.map(card).join("");
  wireButtons(box);
  hydrateImages(box);
}
function renderSaved(){
  const box=$("savedBox");
  $("statSaved").textContent=saved.length;
  if(!saved.length){box.className="empty small-empty";box.innerHTML=`<div class="empty-icon">□</div><h3>No saved cases</h3>`;return;}
  box.className="cards compact";
  box.innerHTML=saved.map(card).join("");
  wireButtons(box);hydrateImages(box);
}
function wireButtons(root=document){
  root.querySelectorAll("[data-copy-text]").forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copyText||"");toast("Copied");}catch{toast("Copy failed");}});
  root.querySelectorAll("[data-save]").forEach(b=>b.onclick=()=>{const r=results.find(x=>x.item_id===b.dataset.save);if(!r)return;if(!saved.some(x=>x.item_id===r.item_id))saved.unshift(r);saved=saved.slice(0,100);safeSet("wrota.rebuilt.saved",saved);renderSaved();renderResults();toast("Saved");});
}
function summaryText(){
  const f=getFilters();const p=[];
  if(f.search)p.push(`search: ${f.search}`);
  if(f.priceMin!==null||f.priceMax!==null)p.push(`price ${f.priceMin??0}–${f.priceMax??"∞"}`);
  if(f.seller)p.push(`seller: ${f.seller}`);
  if(f.country)p.push(`country: ${f.country}`);
  if(f.email)p.push(`email: ${f.email}`);
  if(f.hasImagesOnly)p.push("has images");
  if(f.onlyFullInfo)p.push("full info");
  return p.length?p.join(" · "):"No extra filters active";
}
function progress(done,total,label){
  $("progressWrap").classList.remove("hidden");
  $("progressLabel").textContent=label;
  const pct=total?Math.round(done/total*100):0;
  $("progressNumber").textContent=`${pct}%`;
  $("progressBar").style.width=`${pct}%`;
}

async function scan(){
  if(!targets.length){toast("Add targets first");return;}
  clearImageCache();
  results=[];renderResults();
  const pages=clampNum($("pagesPerTarget").value,1,25,3);
  const parallel=clampNum($("parallelRequests").value,1,10,5);
  const delay=clampNum($("scanDelay").value,0,15000,250);
  const tasks=[];
  targets.forEach(t=>{for(let page=1;page<=pages;page++)tasks.push(async()=>{if(delay)await sleep(delay);const data=await lztGet("/fortnite",paramsFor(t,page));return {target:t,page,items:extractItems(data)};});});
  const found=new Map();
  $("scanBtn").disabled=true;setStatus("Scanning","running");$("resultSubtitle").textContent="Scanning pages. Results appear instantly.";

  try{
    await pool(tasks,parallel,(done,total,idx,res)=>{
      if(res?.error){if(res.error.isRateLimit)throw res.error;return;}
      const label=res.target.label;
      res.items.forEach(item=>{
        const id=listingId(item);if(!id)return;
        const pack=found.get(id)||{summary:{},labels:[],rank:found.size};
        pack.summary={...pack.summary,...item};
        pack.labels=[...new Set([...pack.labels,label])];
        found.set(id,pack);
      });
      results=[...found.values()].map(p=>buildRecord(p.summary,{},p.labels,p.rank));
      renderResults();
      progress(done,total,`Page scan ${done}/${total}`);
    });

    if($("enrichDetails").checked&&found.size){
      const entries=[...found.entries()];
      $("resultSubtitle").textContent="Enriching details and locker images.";
      await pool(entries.map(([id,p])=>async()=>{
        const d=await detail(id);
        let rec=buildRecord(p.summary,d,p.labels,p.rank);
        if($("lockerImages").checked)rec=await enrichImagesFromPage(rec);
        return rec;
      }),Math.min(parallel,6),(done,total,idx,res)=>{
        if(res&&!res.error){
          const pos=results.findIndex(x=>x.item_id===res.item_id);
          if(pos>=0)results[pos]=res;else results.push(res);
          renderResults();
        }
        progress(done,total,`Enrichment ${done}/${total}`);
      });
    }

    saved=safeGet("wrota.rebuilt.saved",[]);
    const stamp=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    safeSet("wrota.rebuilt.last",stamp);
    $("resultSubtitle").textContent=results.length?"Scan complete.":"No numeric listings found.";
    setStatus("Done","done");
  }catch(e){
    $("resultSubtitle").textContent=e.isRateLimit?"Rate limited. Lower parallel requests or raise delay.":e.message;
    setStatus("Issue","bad");
    toast(e.isRateLimit?"Rate limited":"Scan failed");
  }finally{
    $("scanBtn").disabled=false;
    $("progressWrap").classList.add("hidden");
    renderResults();renderSaved();
  }
}

function exportJson(name,data){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}
async function testKey(e){
  e?.preventDefault();
  try{setStatus("Testing","running");await lztGet("/fortnite",{page:1,order_by:"pdate_to_down_upload",currency:"usd"});setStatus("Connected","done");toast("Key accepted");}
  catch(err){setStatus("Key issue","bad");toast(err.message);}
}
function bind(){
  $("accessForm").addEventListener("submit",testKey);
  $("toggleKey").onclick=()=>{const i=$("apiToken");const show=i.type==="password";i.type=show?"text":"password";$("toggleKey").textContent=show?"Hide":"Show";};
  $("clearKeyBtn").onclick=()=>{$("apiToken").value="";setStatus("Ready");};
  $("scanBtn").onclick=scan;
  $("addTargetBtn").onclick=()=>{parseTargets($("targetInput").value).forEach(t=>pushTarget(targets,t.param,t.id));$("targetInput").value="";renderTargets();};
  $("parseBulkBtn").onclick=()=>{parseTargets($("bulkTargets").value).forEach(t=>pushTarget(targets,t.param,t.id));$("bulkTargets").value="";renderTargets();};
  $("ogPresetBtn").onclick=()=>{targets=DEFAULT_TARGETS.slice();renderTargets();toast("OG set loaded");};
  $("resetTargetsBtn").onclick=()=>{targets=[];renderTargets();};
  document.querySelectorAll("[data-order]").forEach(b=>b.onclick=()=>{$("marketOrder").value=b.dataset.order;document.querySelectorAll("[data-order]").forEach(x=>x.classList.toggle("active",x===b));toast("Order set. Run scan to apply.");});
  $("openFiltersBtn").onclick=()=>$("filterDrawer").classList.add("open");
  $("closeFiltersBtn").onclick=()=>$("filterDrawer").classList.remove("open");
  $("closeFiltersBackdrop").onclick=()=>$("filterDrawer").classList.remove("open");
  ["filterSearch","priceMin","priceMax","skinMin","skinMax","levelMin","levelMax","sellerFilter","countryFilter","emailFilter","displaySort","uploadedAfter","activityAfter","includeTerms","excludeTerms","hideUnknownPrice","hideUnknownSeller","hideUnknownCountry","hasImagesOnly","onlyFullInfo"].forEach(id=>$(id)?.addEventListener("input",renderResults));
  ["emailFilter","displaySort","hideUnknownPrice","hideUnknownSeller","hideUnknownCountry","hasImagesOnly","onlyFullInfo"].forEach(id=>$(id)?.addEventListener("change",renderResults));
  $("resetFiltersBtn").onclick=()=>{["filterSearch","priceMin","priceMax","skinMin","skinMax","levelMin","levelMax","sellerFilter","countryFilter","uploadedAfter","activityAfter","includeTerms","excludeTerms"].forEach(id=>$(id).value="");$("emailFilter").value="";$("displaySort").value="market";["hideUnknownPrice","hideUnknownSeller","hideUnknownCountry","hasImagesOnly","onlyFullInfo"].forEach(id=>$(id).checked=false);renderResults();};
  $("presetFreshBtn").onclick=()=>{$("marketOrder").value="pdate_to_down_upload";$("displaySort").value="market";toast("Fresh preset set. Run scan.");};
  $("presetBudgetBtn").onclick=()=>{$("marketOrder").value="price_to_up";$("displaySort").value="price_asc";$("priceMax").value=250;renderResults();toast("Budget preset set.");};
  $("presetPremiumBtn").onclick=()=>{$("marketOrder").value="price_to_down";$("displaySort").value="price_desc";$("priceMin").value=250;renderResults();toast("Premium preset set.");};
  $("compactViewBtn").onclick=()=>{viewMode=viewMode==="cards"?"compact":"cards";$("compactViewBtn").textContent=viewMode==="cards"?"Compact":"Cards";renderResults();};
  $("exportResultsBtn").onclick=()=>exportJson("wrota-results.json",results);
  $("exportSavedBtn").onclick=()=>exportJson("wrota-saved.json",saved);
  $("clearSavedBtn").onclick=()=>{saved=[];safeSet("wrota.rebuilt.saved",saved);renderSaved();renderResults();toast("Saved cleared");};
}
function init(){
  saved=safeGet("wrota.rebuilt.saved",[]);
  renderTargets();renderResults();renderSaved();bind();setStatus("Ready");
}
window.addEventListener("error",e=>{console.error(e.error||e.message);toast("Script issue: "+(e.message||"unknown"));});
window.addEventListener("unhandledrejection",e=>{console.error(e.reason);toast("Request issue: "+(e.reason?.message||e.reason||"unknown"));});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
