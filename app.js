const DEFAULT_WORKER="https://shiny-shape-49fd.flruming.workers.dev";

const OG_TARGETS=[
  {param:"pickaxe[]",id:"pickaxe_lockjaw_og",label:"Raider’s Revenge OG Style",kind:"pickaxe"},
  {param:"skin[]",id:"030_athena_commando_m_halloween_og",label:"OG Skull Trooper / Purple Skull",kind:"skin"},
  {param:"skin[]",id:"029_athena_commando_f_halloween_og",label:"OG Ghoul Trooper / Pink Ghoul",kind:"skin"},
  {param:"skin[]",id:"028_athena_commando_f_og",label:"Renegade Raider OG Style",kind:"skin"},
  {param:"skin[]",id:"017_athena_commando_m_og",label:"Aerial Assault Trooper OG Style",kind:"skin"}
];

let targets=[...OG_TARGETS];
let results=[];
let saved=[];
let compact=false;
let imageFailures=0;
let currentController=null;

const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function log(msg,data){
  const line=`[${new Date().toLocaleTimeString()}] ${msg}${data?` ${JSON.stringify(data)}`:""}`;
  const el=$("debugLog");
  if(el){el.textContent=line+"\n"+el.textContent.slice(0,12000);}
  console.log(msg,data||"");
}
function toast(text){const t=document.createElement("div");t.className="toast";t.textContent=text;$("toastHost")?.appendChild(t);setTimeout(()=>t.remove(),3300);}
function setStatus(text,kind="ready"){const el=$("statusPill");if(!el)return;el.textContent=text;el.dataset.kind=kind;}
function localGet(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f;}catch{return f;}}
function localSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}
function numInput(id){const raw=$(id)?.value;if(raw==null||String(raw).trim()==="")return null;const n=Number(raw);return Number.isFinite(n)?n:null;}
function clamp(v,min,max,f){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):f;}
function workerUrl(){return ($("workerUrl")?.value||DEFAULT_WORKER).replace(/\/+$/,"");}
function apiKey(){return ($("apiKey")?.value||"").trim();}
function cookie(){return ($("lztCookie")?.value||"").trim();}
function headers(){
  const h={"Accept":"application/json"};
  if(apiKey())h["X-LZT-Key"]=apiKey();
  if(cookie())h["X-LZT-Cookie"]=cookie();
  return h;
}
async function api(path,params={},opts={}){
  const u=new URL(workerUrl()+path);
  Object.entries(params).forEach(([k,v])=>{
    if(v===undefined||v===null||v==="")return;
    if(Array.isArray(v))v.forEach(x=>u.searchParams.append(k,x));
    else u.searchParams.set(k,v);
  });
  const res=await fetch(u.toString(),{headers:headers(),signal:opts.signal});
  if(res.status===429){const e=new Error("Rate limited");e.rateLimited=true;throw e;}
  if(!res.ok)throw new Error(`Worker/API ${res.status}`);
  return await res.json();
}
function imageDirectUrl(id,type){return `https://lzt.market/${id}/image?type=${type}`;}
function imageProxyUrl(id,type){return `${workerUrl()}/image/${encodeURIComponent(id)}/${encodeURIComponent(type)}?key=${encodeURIComponent(apiKey())}${cookie()?`&cookie=${encodeURIComponent(cookie())}`:""}`;}
function preferredImageUrl(id,type){return $("useImageProxy")?.checked?imageProxyUrl(id,type):imageDirectUrl(id,type);}

function canonicalParam(k){const s=decodeURIComponent(String(k||"")).toLowerCase();if(s.startsWith("skin"))return"skin[]";if(s.startsWith("pickaxe"))return"pickaxe[]";if(s.startsWith("dance")||s.startsWith("emote"))return"dance[]";if(s.startsWith("glider"))return"glider[]";return"";}
function inferParam(id){const l=String(id).toLowerCase();if(l.startsWith("pickaxe"))return"pickaxe[]";if(l.includes("athena_commando")||l.includes("commando"))return"skin[]";if(l.startsWith("eid_"))return"dance[]";if(l.includes("glider"))return"glider[]";return"skin[]";}
function labelFor(param,id){const l=String(id).toLowerCase();if(param==="pickaxe[]"&&l.includes("lockjaw_og"))return"Raider’s Revenge OG Style";if(l.includes("030_athena_commando_m_halloween_og"))return"OG Skull Trooper / Purple Skull";if(l.includes("029_athena_commando_f_halloween_og"))return"OG Ghoul Trooper / Pink Ghoul";if(l.includes("028_athena_commando_f_og"))return"Renegade Raider OG Style";if(l.includes("017_athena_commando_m_og"))return"Aerial Assault Trooper OG Style";return `${param} ${id}`;}
function targetKind(param){if(param.startsWith("pickaxe"))return"pickaxe";if(param.startsWith("skin"))return"skin";if(param.startsWith("dance"))return"emote";if(param.startsWith("glider"))return"glider";return"cosmetic";}
function addTarget(list,param,id){
  const clean=decodeURIComponent(String(id||"")).trim().replace(/^cid_/i,"").split(/[&#]/)[0];
  if(!param||!clean)return;
  const key=`${param}:${clean}`;
  if(list.some(t=>`${t.param}:${t.id}`===key))return;
  list.push({param,id:clean,label:labelFor(param,clean),kind:targetKind(param)});
}
function parseTargets(text){
  const out=[];const raw=String(text||"");
  try{if(raw.includes("http")){const u=new URL(raw);for(const[k,v]of u.searchParams.entries()){const p=canonicalParam(k);if(p)addTarget(out,p,v);}}}catch{}
  const dec=decodeURIComponent(raw);
  let m;const re=/(skin|pickaxe|dance|emote|glider)(?:\[\]|%5B%5D)?\s*=\s*([a-zA-Z0-9_'’-]+)/gi;
  while((m=re.exec(dec))!==null)addTarget(out,canonicalParam(m[1]),m[2]);
  dec.split(/[\s,;|]+/).forEach(tok=>{
    const t=tok.trim();if(!t||t.includes("=")||t.includes("http"))return;
    if(/^[a-zA-Z0-9_'’-]+$/.test(t)&&(t.includes("athena")||t.includes("pickaxe")||t.includes("commando")||t.startsWith("eid_")))addTarget(out,inferParam(t),t);
  });
  return out;
}
function renderTargets(){
  $("targetCount").textContent=String(targets.length);
  $("targetList").innerHTML=targets.map((t,i)=>`<span class="target-chip"><code>${esc(t.param)}</code>${esc(t.label)}<button data-rm-target="${i}" type="button">×</button></span>`).join("");
  document.querySelectorAll("[data-rm-target]").forEach(b=>b.onclick=()=>{targets.splice(Number(b.dataset.rmTarget),1);renderTargets();});
}

function idOf(item){const raw=item?.item_id??item?.itemId??item?.account_id??item?.accountId??item?.id??"";return /^\d+$/.test(String(raw))?String(raw):"";}
function isListing(item){
  if(!item||typeof item!=="object")return false;
  const id=idOf(item);if(!id)return false;
  const s=String(item.id||item.item_id||"").toLowerCase();
  if(s.startsWith("cid_")||s.includes("athena_commando")||s.includes("pickaxe_"))return false;
  return item.title!==undefined||item.item_title!==undefined||item.name!==undefined||item.price!==undefined||item.price_usd!==undefined||item.seller!==undefined||item.user!==undefined||item.item_id!==undefined||item.account_id!==undefined;
}
function extractItems(data){
  const out=[];const seen=new Set();
  function walk(v){
    if(!v)return;
    if(Array.isArray(v)){v.forEach(walk);return;}
    if(typeof v!=="object")return;
    if(isListing(v)){const id=idOf(v);if(!seen.has(id)){seen.add(id);out.push(v);}}
    for(const[k,n]of Object.entries(v)){
      if(/^\d+$/.test(k)&&n&&typeof n==="object"&&!Array.isArray(n)&&!idOf(n))n.item_id=k;
      if(["items","data","results","list","accounts","market_items","response","values"].includes(k)||Array.isArray(n)||/^\d+$/.test(k))walk(n);
    }
  }
  walk(data);return out;
}
function deep(v,seen=new WeakSet()){
  if(v==null)return"";if(["string","number","boolean"].includes(typeof v))return String(v);
  if(typeof v!=="object"||seen.has(v))return"";seen.add(v);
  if(Array.isArray(v))return v.map(x=>deep(x,seen)).join(" ");
  return Object.values(v).map(x=>deep(x,seen)).join(" ");
}
function firstDeep(v,keys){
  let found="";
  function walk(x){
    if(found||!x||typeof x!=="object")return;
    if(Array.isArray(x)){x.forEach(walk);return;}
    for(const k of keys){if(x[k]!==undefined&&x[k]!==null&&x[k]!==""){found=x[k];return;}}
    Object.values(x).forEach(walk);
  }
  walk(v);return found;
}
function known(v){return v!==undefined&&v!==null&&v!==""&&String(v).toLowerCase()!=="unknown";}
function titleNum(title,patterns){for(const p of patterns){const m=String(title||"").match(p);if(m)return m[1];}return"";}
function boolIcon(v){if(typeof v==="boolean")return v?"✅":"❌";const s=String(v??"").toLowerCase();if(["1","true","yes","changeable","available"].includes(s)||s.includes("changeable email"))return"✅";if(["0","false","no","none"].includes(s)||s.includes("without email")||s.includes("no email"))return"❌";if(s.includes("same"))return"Same email";return"❔";}
function priceText(v){if(!known(v))return"Unknown";const n=Number(String(v).replace(/[^\d.]/g,""));if(Number.isFinite(n))return `$${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;return String(v);}
function dateVal(v){if(!known(v))return null;if(typeof v==="number"){const d=new Date((v>1e11?v:v*1000));return isNaN(d)?null:d;}const m=String(v).match(/\d{4}-\d{2}-\d{2}/);const d=new Date(m?`${m[0]}T00:00:00`:String(v));return isNaN(d)?null:d;}
function niceDate(v){const d=dateVal(v);return d?d.toISOString().slice(0,10):"Unknown";}
function nField(r,k){const m=String(r[k]??"").match(/-?\d+(\.\d+)?/);return m?Number(m[0]):null;}

function parseHtmlFields(html){
  const text=String(html||"");const f={};
  const price=text.match(/id=["']price["'][^>]*data-value=["']([^"']+)["']/i);if(price)f.price=price[1];
  const title=text.match(/<span[^>]*class=["'][^"']*title-account[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);if(title)f.title=title[1].replace(/<[^>]+>/g,"").trim();
  const pub=text.match(/class=["'][^"']*published_date[^"']*["'][^>]*data-value=["']([^"']+)["']/i);if(pub)f.uploaded_at=Number(pub[1]);
  const upd=text.match(/class=["'][^"']*refreshed_date[^"']*["'][^>]*data-value=["']([^"']+)["']/i);if(upd)f.updated_at=Number(upd[1]);
  const seller=text.match(/data-user=["'][^,"']+,\s*([^"']+)["']/i);if(seller)f.seller=seller[1].trim();
  const country=text.match(/Country<\/[^>]+>[\s\S]{0,300}?<[^>]+>([^<]+)<\/[^>]+>/i);if(country)f.country=country[1].trim();
  return f;
}
function normalize(summary={},detail={},labels=[],rank=0){
  const root=detail?.item||detail?.data||detail?.account||detail?.response||detail||{};
  const merged={...summary,...root};
  const id=idOf(summary)||idOf(merged);
  const title=summary.title||summary.item_title||merged.title||merged.item_title||merged.name||`Listing ${id}`;
  const sellerObj=summary.seller||merged.seller||summary.user||merged.user||{};
  let skins=summary.skin_count??summary.skins_count??summary.skins??merged.skin_count??merged.skins_count??merged.skins??firstDeep({summary,detail},["skin_count","skins_count","outfits_count","fortnite_skins_count"]);
  if(!known(skins))skins=titleNum(title,[/(\d+)\s*skins?/i,/(\d+)\s*outfits?/i]);
  let email=summary.email_changeable??merged.email_changeable??merged.change_email??firstDeep({summary,detail},["email_changeable","change_email","changeable_email","can_change_email"]);
  if(!known(email)){const s=title.toLowerCase();email=s.includes("same email")?"Same email":s.includes("changeable email")?"yes":s.includes("no email")?"no":"Unknown";}
  let level=summary.season_level??summary.level??merged.season_level??merged.level??firstDeep({summary,detail},["season_level","account_level","fortnite_level","level"]);
  if(!known(level))level=titleNum(title,[/level\s*[:#-]?\s*(\d+)/i,/lvl\s*[:#-]?\s*(\d+)/i]);
  const price=summary.price??summary.price_usd??merged.price??merged.price_usd??merged.cost??"";
  return {
    listingId:id,
    item_id:id,
    canonicalKey:`lzt:${id}`,
    scanRank:rank,
    title,
    price,
    seller:typeof sellerObj==="string"?sellerObj:(sellerObj.username||sellerObj.name||summary.seller_username||merged.username||"Unknown"),
    country:summary.country||merged.country||summary.country_code||merged.country_code||merged.origin||"Unknown",
    skins:known(skins)?skins:"Unknown",
    level:known(level)?level:"Unknown",
    emailChangeable:known(email)?email:"Unknown",
    lastActivity:summary.last_activity||merged.last_activity||summary.last_seen||merged.last_seen||"Unknown",
    uploadedAt:summary.uploaded_at||summary.upload_date||summary.pdate_upload||summary.pdate||merged.uploaded_at||merged.pdate||"Unknown",
    updatedAt:summary.updated_at||merged.updated_at||summary.refreshed_date||merged.refreshed_date||"Unknown",
    vbucks:summary.vbucks??merged.vbucks??titleNum(title,[/(\d+)\s*vb/i,/(\d+)\s*v-?bucks/i]),
    platform:summary.platform||merged.platform||"",
    matches:labels.map(label=>({label})),
    matchLabels:labels,
    matchCount:labels.length,
    image: {
      skinsDirect: imageDirectUrl(id,"skins"),
      pickaxesDirect: imageDirectUrl(id,"pickaxes"),
      skinsProxy: imageProxyUrl(id,"skins"),
      pickaxesProxy: imageProxyUrl(id,"pickaxes")
    },
    raw:{summary,detail}
  };
}
function applyHtml(record,html){
  const f=parseHtmlFields(html);
  if(f.title)record.title=f.title;
  if(f.price)record.price=f.price;
  if(f.seller)record.seller=f.seller;
  if(f.country)record.country=f.country;
  if(f.uploaded_at)record.uploadedAt=f.uploaded_at;
  if(f.updated_at)record.updatedAt=f.updated_at;
  return record;
}

function filterState(){
  return {
    q:String($("q")?.value||"").toLowerCase().trim(),
    priceMin:numInput("priceMin"),priceMax:numInput("priceMax"),
    skinsMin:numInput("skinsMin"),skinsMax:numInput("skinsMax"),
    levelMin:numInput("levelMin"),levelMax:numInput("levelMax"),
    seller:String($("sellerFilter")?.value||"").toLowerCase().trim(),
    country:String($("countryFilter")?.value||"").toLowerCase().trim(),
    email:$("emailFilter")?.value||"",
    sort:$("displaySort")?.value||"market",
    include:String($("includeTerms")?.value||"").split(/[,|]+/).map(s=>s.trim().toLowerCase()).filter(Boolean),
    exclude:String($("excludeTerms")?.value||"").split(/[,|]+/).map(s=>s.trim().toLowerCase()).filter(Boolean),
    onlyMulti:$("onlyMultiMatch")?.checked,
    hasImages:$("hasImages")?.checked,
    hideUnknownPrice:$("hideUnknownPrice")?.checked,
    hideUnknownSeller:$("hideUnknownSeller")?.checked,
    hideUnknownCountry:$("hideUnknownCountry")?.checked
  };
}
function recordText(r){return [r.title,r.seller,r.country,r.skins,r.level,r.emailChangeable,...(r.matchLabels||[])].join(" ").toLowerCase();}
function passes(r,f=filterState()){
  const txt=recordText(r);
  if(f.q&&!txt.includes(f.q))return false;
  if(f.seller&&!String(r.seller).toLowerCase().includes(f.seller))return false;
  if(f.country&&!String(r.country).toLowerCase().includes(f.country))return false;
  const price=nField(r,"price"),skins=nField(r,"skins"),level=nField(r,"level");
  if(f.priceMin!==null&&(price===null||price<f.priceMin))return false;
  if(f.priceMax!==null&&(price===null||price>f.priceMax))return false;
  if(f.skinsMin!==null&&(skins===null||skins<f.skinsMin))return false;
  if(f.skinsMax!==null&&(skins===null||skins>f.skinsMax))return false;
  if(f.levelMin!==null&&(level===null||level<f.levelMin))return false;
  if(f.levelMax!==null&&(level===null||level>f.levelMax))return false;
  const em=boolIcon(r.emailChangeable), et=String(r.emailChangeable).toLowerCase();
  if(f.email==="yes"&&em!=="✅")return false;
  if(f.email==="no"&&em!=="❌")return false;
  if(f.email==="known"&&em!=="✅"&&em!=="❌"&&!et.includes("same"))return false;
  if(f.email==="same"&&!et.includes("same"))return false;
  if(f.include.length&&!f.include.every(t=>txt.includes(t)))return false;
  if(f.exclude.length&&f.exclude.some(t=>txt.includes(t)))return false;
  if(f.onlyMulti&&r.matchCount<2)return false;
  if(f.hasImages&&!r.image)return false;
  if(f.hideUnknownPrice&&price===null)return false;
  if(f.hideUnknownSeller&&String(r.seller).toLowerCase()==="unknown")return false;
  if(f.hideUnknownCountry&&String(r.country).toLowerCase()==="unknown")return false;
  return true;
}
function sortRecords(list){
  const f=filterState();const arr=list.slice();
  const order=$("marketOrder")?.value||"pdate_to_down_upload";
  const uploaded=x=>dateVal(x.uploadedAt)?.getTime()??dateVal(x.updatedAt)?.getTime()??-Infinity;
  if(f.sort==="market"||f.sort==="newest"){
    if(order.includes("up")&&!order.includes("down"))arr.sort((a,b)=>(uploaded(a)===-Infinity?Infinity:uploaded(a))-(uploaded(b)===-Infinity?Infinity:uploaded(b))||(a.scanRank-b.scanRank));
    else if(order==="price_to_up")arr.sort((a,b)=>(nField(a,"price")??Infinity)-(nField(b,"price")??Infinity));
    else if(order==="price_to_down")arr.sort((a,b)=>(nField(b,"price")??-Infinity)-(nField(a,"price")??-Infinity));
    else arr.sort((a,b)=>uploaded(b)-uploaded(a)||(a.scanRank-b.scanRank));
  }
  if(f.sort==="price_asc")arr.sort((a,b)=>(nField(a,"price")??Infinity)-(nField(b,"price")??Infinity));
  if(f.sort==="price_desc")arr.sort((a,b)=>(nField(b,"price")??-Infinity)-(nField(a,"price")??-Infinity));
  if(f.sort==="skins_desc")arr.sort((a,b)=>(nField(b,"skins")??-Infinity)-(nField(a,"skins")??-Infinity));
  if(f.sort==="level_desc")arr.sort((a,b)=>(nField(b,"level")??-Infinity)-(nField(a,"level")??-Infinity));
  if(f.sort==="matches_desc")arr.sort((a,b)=>(b.matchCount??0)-(a.matchCount??0));
  return arr;
}
function visible(){return sortRecords(results.filter(r=>passes(r)));}

function alertText(r){
  return `New Fortnite listing on LZT Market

Skin Count: ${r.skins||"Unknown"}
Exclusives: ${(r.matchLabels||[]).join(", ")||"Selected cosmetic filter"}
Email Changeable: ${boolIcon(r.emailChangeable)}

🏷️ Title: ${r.title||"Untitled listing"}
👤 Seller: ${r.seller||"Unknown"}
💵 Price: ${priceText(r.price)}
🔢 Season Level: ${r.level||"Unknown"}
🌍 Country: ${r.country||"Unknown"}
⏱️ Last Activity: ${niceDate(r.lastActivity)}
🆕 Uploaded: ${niceDate(r.uploadedAt!=="Unknown"?r.uploadedAt:r.updatedAt)}
🔗 Link: https://lzt.market/${r.listingId}/`;
}
function imagePanel(r,type,label){
  const direct=imageDirectUrl(r.listingId,type);
  const proxy=imageProxyUrl(r.listingId,type);
  const src=preferredImageUrl(r.listingId,type);
  const id=`img-${type}-${r.listingId}`;
  return `<article class="locker-card">
    <div class="locker-head"><strong>${label}</strong><div><a href="${esc(direct)}" target="_blank" rel="noopener">Direct</a><a href="${esc(proxy)}" target="_blank" rel="noopener">Proxy</a><button class="ghost small" data-retry-img="${esc(id)}" data-direct="${esc(direct)}" data-proxy="${esc(proxy)}">Retry</button></div></div>
    <a class="locker-image" href="${esc(direct)}" target="_blank" rel="noopener">
      <img id="${esc(id)}" src="${esc(src)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="${esc(label)} for ${esc(r.listingId)}" data-direct="${esc(direct)}" data-proxy="${esc(proxy)}" onerror="window.__wrotaImageError && window.__wrotaImageError(this)">
      <span class="image-failed">Image blocked here. Use Direct/Proxy link or Retry.</span>
    </a>
  </article>`;
}
function card(r){
  const msg=alertText(r);
  return `<article class="card" data-id="${esc(r.listingId)}">
    <div class="card-top">
      <div><span class="eyebrow">${esc(r.matchCount>1?`${r.matchCount} matches`:"Match")}</span><h3>${esc(r.title)}</h3><div class="badges">${(r.matchLabels||[]).map(x=>`<span>${esc(x)}</span>`).join("")}</div></div>
      <div class="price">${esc(priceText(r.price))}</div>
    </div>
    <div class="info">
      <div><span>Skins</span><strong>${esc(r.skins)}</strong></div>
      <div><span>Email</span><strong>${esc(boolIcon(r.emailChangeable))}</strong></div>
      <div><span>Level</span><strong>${esc(r.level)}</strong></div>
      <div><span>Country</span><strong>${esc(r.country)}</strong></div>
      <div><span>Uploaded</span><strong>${esc(niceDate(r.uploadedAt!=="Unknown"?r.uploadedAt:r.updatedAt))}</strong></div>
      <div><span>Badges</span><strong>${esc(r.matchCount)}</strong></div>
    </div>
    <pre class="message">${esc(msg)}</pre>
    <details class="locker" open><summary>Locker images</summary><div class="locker-grid">${imagePanel(r,"skins","Skins locker")}${imagePanel(r,"pickaxes","Pickaxes locker")}</div><div class="image-actions"><button class="ghost small" data-copy-text="${esc([imageDirectUrl(r.listingId,"skins"),imageDirectUrl(r.listingId,"pickaxes"),imageProxyUrl(r.listingId,"skins"),imageProxyUrl(r.listingId,"pickaxes")].join("\n"))}">Copy image links</button><span>Direct first, proxy fallback</span></div></details>
    <div class="card-actions"><a class="ghost small" href="https://lzt.market/${esc(r.listingId)}/" target="_blank" rel="noopener">Open listing</a><button class="ghost small" data-copy-text="${esc(msg)}">Copy message</button><button class="ghost small" data-save="${esc(r.listingId)}">Save</button></div>
    <details class="raw"><summary>Raw case data</summary><pre>${esc(JSON.stringify(r,null,2))}</pre></details>
  </article>`;
}
window.__wrotaImageError=function(img){
  const box=img.closest(".locker-image");
  if(!img.dataset.triedProxy&&$("useImageProxy")?.checked===false){
    img.dataset.triedProxy="1";
    img.src=img.dataset.proxy;
    return;
  }
  imageFailures++;
  box?.classList.add("failed");
  renderStats();
};

function renderStats(){
  const shown=visible().length;
  $("statShown").textContent=shown;
  $("statUnique").textContent=results.length;
  $("statHits").textContent=String(results.reduce((a,r)=>a+(r.matchCount||0),0));
  $("statImageFail").textContent=imageFailures;
  $("statSaved").textContent=saved.length;
  $("filterSummary").textContent=summary();
}
function renderFeed(){
  const list=visible();renderStats();
  const box=$("feedBox");
  if(!list.length){
    box.className="empty";
    box.innerHTML=results.length?`<div class="empty-icon">⌕</div><h3>No visible matches</h3><p>Relax filters in Filter Lab.</p>`:`<div class="empty-icon">⌕</div><h3>No accounts yet</h3><p>Start a scan when your targets are ready.</p>`;
    return;
  }
  box.className=compact?"cards compact":"cards";
  box.innerHTML=list.map(card).join("");
  wireDynamic(box);
}
function renderSaved(){
  const box=$("savedBox");$("statSaved").textContent=saved.length;
  if(!saved.length){box.className="empty small-empty";box.innerHTML=`<div class="empty-icon">□</div><h3>No saved cases</h3>`;return;}
  box.className="cards compact";box.innerHTML=saved.map(card).join("");wireDynamic(box);
}
function wireDynamic(root=document){
  root.querySelectorAll("[data-copy-text]").forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copyText||"");toast("Copied");}catch{toast("Copy failed");}});
  root.querySelectorAll("[data-save]").forEach(b=>b.onclick=()=>{const r=results.find(x=>x.listingId===b.dataset.save);if(!r)return;if(!saved.some(x=>x.listingId===r.listingId))saved.unshift(r);saved=saved.slice(0,200);localSet("wrota.ultimate.saved",saved);renderSaved();renderStats();toast("Saved");});
  root.querySelectorAll("[data-retry-img]").forEach(b=>b.onclick=()=>{const img=$(b.dataset.retryImg);if(!img)return;img.closest(".locker-image")?.classList.remove("failed");const useProxy=img.src.includes("/image/")?false:true;const next=useProxy?b.dataset.proxy:b.dataset.direct;const sep=next.includes("?")?"&":"?";img.src=`${next}${sep}_reload=${Date.now()}`;});
}
function summary(){
  const f=filterState();const parts=[];
  if(f.q)parts.push(`search: ${f.q}`);
  if(f.priceMin!==null||f.priceMax!==null)parts.push(`price ${f.priceMin??0}–${f.priceMax??"∞"}`);
  if(f.seller)parts.push(`seller: ${f.seller}`);
  if(f.country)parts.push(`country: ${f.country}`);
  if(f.email)parts.push(`email: ${f.email}`);
  if(f.onlyMulti)parts.push("multi-match only");
  if(f.hasImages)parts.push("has images");
  return parts.length?parts.join(" · "):"No extra filters active";
}
function progress(done,total,label){
  $("progressWrap").classList.remove("hidden");
  const pct=total?Math.round(done/total*100):0;
  $("progressLabel").textContent=label;
  $("progressText").textContent=`${pct}%`;
  $("progressBar").style.width=`${pct}%`;
}
async function pool(tasks,limit,onDone){
  const out=[];let i=0,done=0;
  async function worker(){
    while(i<tasks.length){
      const idx=i++;
      try{out[idx]=await tasks[idx]();}
      catch(e){out[idx]={error:e};}
      done++;onDone?.(done,tasks.length,idx,out[idx]);
    }
  }
  await Promise.all(Array.from({length:Math.max(1,Math.min(limit,tasks.length))},worker));
  return out;
}
function paramsFor(target,page){
  const params={page,order_by:$("marketOrder").value,currency:"usd"};
  params[target.param]=target.id;
  const f=filterState();
  if(f.q)params.title=f.q;
  if(f.priceMin!==null)params.pmin=f.priceMin;
  if(f.priceMax!==null)params.pmax=f.priceMax;
  return params;
}
async function enrich(record,signal){
  if(!$("enrichPages").checked)return record;
  try{
    const res=await api(`/listing/${encodeURIComponent(record.listingId)}`,{}, {signal});
    if(res?.html)applyHtml(record,res.html);
    if(res?.data)record.raw.detail=res.data;
  }catch(e){record.enrichError=e.message;log("enrich failed",{id:record.listingId,error:e.message});}
  return record;
}
async function scan(){
  if(!targets.length){toast("Add at least one target");return;}
  currentController?.abort();
  currentController=new AbortController();
  imageFailures=0;results=[];renderFeed();setStatus("Scanning","run");$("scanBtn").disabled=true;
  const pages=clamp($("pagesPerTarget").value,1,50,5);
  const parallel=clamp($("parallel").value,1,12,4);
  const delay=clamp($("delay").value,0,30000,300);
  const tasks=[];
  for(let page=1;page<=pages;page++){
    for(const target of targets){
      tasks.push(async()=>{
        if(delay)await sleep(delay);
        const data=await api("/search",paramsFor(target,page),{signal:currentController.signal});
        return {target,page,items:extractItems(data)};
      });
    }
  }

  const found=new Map();
  const upsertPack=(item,target)=>{
    const id=idOf(item);if(!id)return;
    const p=found.get(id)||{summary:{},labels:[],rank:found.size};
    p.summary={...p.summary,...item};
    p.labels=[...new Set([...p.labels,target.label])];
    found.set(id,p);
  };
  try{
    $("feedSubtitle").textContent="Scanning interleaved targets into one mixed global feed.";
    await pool(tasks,parallel,(done,total,idx,res)=>{
      if(res?.error){log("page error",{error:res.error.message});return;}
      res.items.forEach(item=>upsertPack(item,res.target));
      results=[...found.values()].map(p=>normalize(p.summary,{},p.labels,p.rank));
      renderFeed();
      progress(done,total,`Search pages ${done}/${total}`);
    });

    if(results.length&&$("enrichPages").checked){
      $("feedSubtitle").textContent="Enriching visible listings from detail pages.";
      const enrichTasks=results.map(r=>async()=>await enrich(r,currentController.signal));
      await pool(enrichTasks,Math.min(parallel,5),(done,total,idx,res)=>{
        if(res&&!res.error){const pos=results.findIndex(x=>x.listingId===res.listingId);if(pos>=0)results[pos]=res;}
        renderFeed();progress(done,total,`Enrichment ${done}/${total}`);
      });
    }

    results=sortRecords(results);
    $("feedSubtitle").textContent=results.length?`Complete: ${results.length} unique listings, ${results.reduce((a,r)=>a+r.matchCount,0)} target hits.`:"No numeric listings found.";
    setStatus("Complete","done");
    log("scan complete",{unique:results.length,hits:results.reduce((a,r)=>a+r.matchCount,0)});
  }catch(e){
    if(e.name==="AbortError"){toast("Scan cancelled");log("scan cancelled");}
    else{toast(e.rateLimited?"Rate limited":"Scan failed");$("feedSubtitle").textContent=e.message;setStatus("Issue","bad");log("scan failed",{error:e.message});}
  }finally{
    $("scanBtn").disabled=false;$("progressWrap").classList.add("hidden");renderFeed();
  }
}
async function testConnection(){
  try{setStatus("Testing","run");await api("/health");await api("/search",{page:1,order_by:"pdate_to_down_upload",currency:"usd"});setStatus("Connected","done");toast("Connection works");}
  catch(e){setStatus("Issue","bad");toast(e.message);log("connection failed",{error:e.message});}
}
function exportJson(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
async function copyFiltered(){const txt=visible().map(alertText).join("\n\n---\n\n");try{await navigator.clipboard.writeText(txt);toast("Filtered messages copied");}catch{toast("Copy failed");}}
function resetFilters(){["q","priceMin","priceMax","skinsMin","skinsMax","levelMin","levelMax","sellerFilter","countryFilter","includeTerms","excludeTerms"].forEach(id=>$(id).value="");$("emailFilter").value="";$("displaySort").value="market";["onlyMultiMatch","hasImages","hideUnknownPrice","hideUnknownSeller","hideUnknownCountry"].forEach(id=>$(id).checked=false);renderFeed();}
function bind(){
  $("workerUrl").value=localGet("wrota.ultimate.worker",DEFAULT_WORKER);
  $("apiKey").value=localGet("wrota.ultimate.key","");
  $("lztCookie").value=localGet("wrota.ultimate.cookie","");
  saved=localGet("wrota.ultimate.saved",[]);
  $("toggleSecretsBtn").onclick=()=>{const show=$("apiKey").type==="password";["apiKey","lztCookie"].forEach(id=>$(id).type=show?"text":"password");$("toggleSecretsBtn").textContent=show?"Hide":"Show";};
  $("saveConfigBtn").onclick=()=>{localSet("wrota.ultimate.worker",$("workerUrl").value);localSet("wrota.ultimate.key",$("apiKey").value);localSet("wrota.ultimate.cookie",$("lztCookie").value);toast("Saved locally");};
  $("clearConfigBtn").onclick=()=>{["workerUrl","apiKey","lztCookie"].forEach(id=>$(id).value=id==="workerUrl"?DEFAULT_WORKER:"");toast("Cleared");};
  $("testBtn").onclick=testConnection;$("scanBtn").onclick=scan;
  $("loadOgBtn").onclick=()=>{targets=[...OG_TARGETS];renderTargets();toast("OG set loaded");};
  $("clearTargetsBtn").onclick=()=>{targets=[];renderTargets();};
  $("addTargetBtn").onclick=()=>{parseTargets($("targetInput").value).forEach(t=>addTarget(targets,t.param,t.id));$("targetInput").value="";renderTargets();};
  $("parseBulkBtn").onclick=()=>{parseTargets($("bulkTargets").value).forEach(t=>addTarget(targets,t.param,t.id));$("bulkTargets").value="";renderTargets();};
  $("openFiltersBtn").onclick=()=>$("filterDrawer").classList.add("open");$("closeFiltersBtn").onclick=()=>$("filterDrawer").classList.remove("open");$("drawerBackdrop").onclick=()=>$("filterDrawer").classList.remove("open");
  ["q","priceMin","priceMax","skinsMin","skinsMax","levelMin","levelMax","sellerFilter","countryFilter","emailFilter","displaySort","includeTerms","excludeTerms","onlyMultiMatch","hasImages","hideUnknownPrice","hideUnknownSeller","hideUnknownCountry"].forEach(id=>$(id)?.addEventListener("input",renderFeed));
  ["emailFilter","displaySort","onlyMultiMatch","hasImages","hideUnknownPrice","hideUnknownSeller","hideUnknownCountry"].forEach(id=>$(id)?.addEventListener("change",renderFeed));
  $("resetFilters").onclick=resetFilters;
  $("presetFresh").onclick=()=>{$("marketOrder").value="pdate_to_down_upload";$("displaySort").value="market";toast("Fresh preset set. Scan again.");};
  $("presetBudget").onclick=()=>{$("marketOrder").value="price_to_up";$("displaySort").value="price_asc";$("priceMax").value=250;renderFeed();};
  $("presetPremium").onclick=()=>{$("marketOrder").value="price_to_down";$("displaySort").value="price_desc";$("priceMin").value=250;renderFeed();};
  $("compactBtn").onclick=()=>{compact=!compact;$("compactBtn").textContent=compact?"Cards":"Compact";renderFeed();};
  $("copyFilteredBtn").onclick=copyFiltered;$("exportBtn").onclick=()=>exportJson("wrota-results.json",visible());
  $("exportSavedBtn").onclick=()=>exportJson("wrota-saved.json",saved);$("clearSavedBtn").onclick=()=>{saved=[];localSet("wrota.ultimate.saved",saved);renderSaved();renderStats();};
  $("clearLogBtn").onclick=()=>{$("debugLog").textContent="";};
  renderTargets();renderFeed();renderSaved();setStatus("Ready");
}
window.addEventListener("error",e=>{log("script error",{message:e.message});toast("Script issue");});
window.addEventListener("unhandledrejection",e=>{log("request issue",{message:e.reason?.message||String(e.reason)});});
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",bind):bind();
