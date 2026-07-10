const DEFAULT_PROXY="https://shiny-shape-49fd.flruming.workers.dev";

const DEFAULT_TARGETS=[
  {param:"pickaxe[]",id:"pickaxe_lockjaw_og",label:"Raider’s Revenge OG Style"},
  {param:"skin[]",id:"030_athena_commando_m_halloween_og",label:"OG Skull Trooper / Purple Skull"},
  {param:"skin[]",id:"029_athena_commando_f_halloween_og",label:"OG Ghoul Trooper / Pink Ghoul"},
  {param:"skin[]",id:"028_athena_commando_f_og",label:"Renegade Raider OG Style"},
  {param:"skin[]",id:"017_athena_commando_m_og",label:"Aerial Assault Trooper OG Style"}
];

let targets=[...DEFAULT_TARGETS];
let results=[];
let saved=[];
let compact=false;
let imgFails=0;
let blobUrls=new Map();

const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function log(line,obj){
  const msg=`[${new Date().toLocaleTimeString()}] ${line}${obj?" "+JSON.stringify(obj):""}`;
  $("debugLog").textContent=msg+"\n"+$("debugLog").textContent.slice(0,12000);
  $("miniLog").textContent=msg;
  console.log(line,obj||"");
}
function status(t){$("status").textContent=t;}
function toast(t){log(t);}
function getCfg(){return {
  proxy:($("proxyUrl").value||DEFAULT_PROXY).replace(/\/+$/,""),
  key:$("apiKey").value.trim(),
  cookie:$("cookie").value.trim()
};}
function saveCfg(){
  const c=getCfg();
  localStorage.setItem("wrota.cmd.cfg",JSON.stringify(c));
}
function loadCfg(){
  try{
    const c=JSON.parse(localStorage.getItem("wrota.cmd.cfg")||"{}");
    $("proxyUrl").value=c.proxy||DEFAULT_PROXY;
    $("apiKey").value=c.key||"";
    $("cookie").value=c.cookie||"";
  }catch{$("proxyUrl").value=DEFAULT_PROXY;}
}
function proxyUrl(target){
  return `${getCfg().proxy}/proxy?url=${encodeURIComponent(target)}`;
}
function headers(accept="application/json"){
  const c=getCfg();
  const h={"Accept":accept};
  if(c.key)h["X-LZT-Key"]=c.key;
  if(c.cookie)h["X-LZT-Cookie"]=c.cookie;
  return h;
}
async function fetchTimeout(url,opts={},ms=45000){
  const ac=new AbortController();
  const t=setTimeout(()=>ac.abort(),ms);
  try{return await fetch(url,{...opts,signal:ac.signal});}
  finally{clearTimeout(t);}
}
async function lztJson(path,params={}){
  const u=new URL(`https://prod-api.lzt.market${path}`);
  Object.entries(params).forEach(([k,v])=>{
    if(v===undefined||v===null||v==="")return;
    if(Array.isArray(v))v.forEach(x=>u.searchParams.append(k,x));
    else u.searchParams.append(k,v);
  });
  const res=await fetchTimeout(proxyUrl(u.toString()),{headers:headers("application/json")});
  if(res.status===429){const e=new Error("rate limited");e.rate=true;throw e;}
  if(!res.ok)throw new Error(`api ${res.status}`);
  const text=await res.text();
  try{return JSON.parse(text)}catch{return {raw:text}}
}
async function lztText(url){
  const res=await fetchTimeout(proxyUrl(url),{headers:headers("text/html,*/*")});
  if(!res.ok)throw new Error(`html ${res.status}`);
  return await res.text();
}
function imgEndpoint(id,type){return `https://lzt.market/${id}/image?type=${type}`;}
function imgProxyEndpoint(id,type){return proxyUrl(imgEndpoint(id,type));}

async function loadImage(img,id,type){
  if(!$("loadImages").checked)return;

  // Fetch through the hidden proxy transport, then host the bytes inside the page as a blob: URL.
  // The visible <img> src becomes blob:<this-site-origin>/..., not a Cloudflare/LZT URL.
  try{
    img.closest(".imgwrap")?.classList.add("loading");
    const res=await fetchTimeout(imgProxyEndpoint(id,type),{headers:headers("image/avif,image/webp,image/apng,image/*,*/*;q=0.8")},45000);
    if(!res.ok)throw new Error(`img ${res.status}`);
    const blob=await res.blob();
    if(!blob.type.startsWith("image/"))throw new Error(`not image ${blob.type||"unknown"}`);
    const old=blobUrls.get(img.id);
    if(old)URL.revokeObjectURL(old);
    const url=URL.createObjectURL(blob);
    blobUrls.set(img.id,url);
    img.src=url;
    img.dataset.hosted="page-blob";
    img.closest(".imgwrap")?.classList.remove("loading","failed");
    return;
  }catch(e){
    img.closest(".imgwrap")?.classList.remove("loading");
    img.closest(".imgwrap")?.classList.add("failed");
    log("image hosting failed",{id,type,error:e.message});
    imgFails++;
    renderStats();
  }
}
window.__imgFail=function(img){
  const box=img.closest(".imgwrap");
  if(img.dataset.failCounted)return;
  img.dataset.failCounted="1";
  imgFails++;
  box?.classList.add("failed");
  renderStats();
};

function canonicalParam(k){
  const s=decodeURIComponent(String(k||"")).toLowerCase();
  if(s.startsWith("skin"))return"skin[]";
  if(s.startsWith("pickaxe"))return"pickaxe[]";
  if(s.startsWith("dance")||s.startsWith("emote"))return"dance[]";
  if(s.startsWith("glider"))return"glider[]";
  return"";
}
function inferParam(id){
  const s=String(id).toLowerCase();
  if(s.startsWith("pickaxe"))return"pickaxe[]";
  if(s.includes("athena_commando")||s.includes("commando"))return"skin[]";
  return"skin[]";
}
function labelFor(param,id){
  const s=String(id).toLowerCase();
  if(param==="pickaxe[]"&&s.includes("lockjaw_og"))return"Raider’s Revenge OG Style";
  if(s.includes("030_athena_commando_m_halloween_og"))return"OG Skull Trooper / Purple Skull";
  if(s.includes("029_athena_commando_f_halloween_og"))return"OG Ghoul Trooper / Pink Ghoul";
  if(s.includes("028_athena_commando_f_og"))return"Renegade Raider OG Style";
  if(s.includes("017_athena_commando_m_og"))return"Aerial Assault Trooper OG Style";
  return `${param} ${id}`;
}
function addTarget(list,param,id){
  const clean=decodeURIComponent(String(id||"")).trim().replace(/^cid_/i,"").split(/[&#]/)[0];
  if(!param||!clean)return;
  if(list.some(t=>t.param===param&&t.id===clean))return;
  list.push({param,id:clean,label:labelFor(param,clean)});
}
function parseTargets(text){
  const out=[];const raw=String(text||"");
  try{
    if(raw.includes("http")){
      const u=new URL(raw);
      for(const[k,v] of u.searchParams.entries()){
        const p=canonicalParam(k);
        if(p)addTarget(out,p,v);
      }
    }
  }catch{}
  const dec=decodeURIComponent(raw);
  let m;const re=/(skin|pickaxe|dance|emote|glider)(?:\[\]|%5B%5D)?\s*=\s*([a-zA-Z0-9_'’-]+)/gi;
  while((m=re.exec(dec)))addTarget(out,canonicalParam(m[1]),m[2]);
  dec.split(/[\s,;|]+/).forEach(tok=>{
    const t=tok.trim();
    if(!t||t.includes("=")||t.includes("http"))return;
    if(/^[a-zA-Z0-9_'’-]+$/.test(t)&&(t.includes("athena")||t.includes("pickaxe")||t.includes("commando")))addTarget(out,inferParam(t),t);
  });
  return out;
}
function renderTargets(){
  $("targetCount").textContent=targets.length;
  $("targetList").innerHTML=targets.map((t,i)=>`<span class="target-chip"><code>${esc(t.param)}</code>${esc(t.label)}<button data-rm="${i}">x</button></span>`).join("");
  document.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{targets.splice(Number(b.dataset.rm),1);renderTargets();});
}
function idOf(item){
  const raw=item?.item_id??item?.itemId??item?.account_id??item?.accountId??item?.id??"";
  return /^\d+$/.test(String(raw))?String(raw):"";
}
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
function known(v){return v!==undefined&&v!==null&&v!==""&&String(v).toLowerCase()!=="unknown";}
function firstDeep(v,keys){
  let found="";
  const seen=new WeakSet();
  function walk(x){
    if(found||!x||typeof x!=="object"||seen.has(x))return;
    seen.add(x);
    if(Array.isArray(x)){x.forEach(walk);return;}
    for(const k of keys){if(x[k]!==undefined&&x[k]!==null&&x[k]!==""){found=x[k];return;}}
    Object.values(x).forEach(walk);
  }
  walk(v);return found;
}
function titleNum(t,patterns){for(const p of patterns){const m=String(t||"").match(p);if(m)return m[1];}return"";}
function boolIcon(v){
  const s=String(v??"").toLowerCase();
  if(typeof v==="boolean")return v?"YES":"NO";
  if(s.includes("same"))return"SAME";
  if(s.includes("changeable")||["1","yes","true"].includes(s))return"YES";
  if(s.includes("no email")||s.includes("without email")||["0","no","false"].includes(s))return"NO";
  return"UNK";
}
function dateVal(v){
  if(!known(v))return null;
  if(typeof v==="number"){const d=new Date((v>1e11?v:v*1000));return isNaN(d)?null:d;}
  const d=new Date(String(v));return isNaN(d)?null:d;
}
function niceDate(v){const d=dateVal(v);return d?d.toISOString().slice(0,10):"Unknown";}
function niceDateTime(v){
  const d=dateVal(v);
  if(!d)return "Unknown";
  return d.toISOString().slice(0,16).replace("T"," ");
}
function uploadDate(r){
  return r.uploaded!=="Unknown" ? r.uploaded : (r.updated!=="Unknown" ? r.updated : "Unknown");
}
function uploadMs(r){
  const d=dateVal(uploadDate(r));
  return d ? d.getTime() : -Infinity;
}
function newestDistance(r){
  const ms=uploadMs(r);
  return ms===-Infinity ? Infinity : Math.abs(Date.now()-ms);
}
function ageText(r){
  const ms=uploadMs(r);
  if(ms===-Infinity)return "Unknown";
  const diff=Date.now()-ms;
  const abs=Math.abs(diff);
  const future=diff<0;
  const mins=Math.floor(abs/60000);
  const hours=Math.floor(mins/60);
  const days=Math.floor(hours/24);
  let txt;
  if(mins<1)txt="now";
  else if(mins<60)txt=`${mins}m`;
  else if(hours<48)txt=`${hours}h`;
  else txt=`${days}d`;
  return future ? `in ${txt}` : `${txt} ago`;
}
function num(v){const m=String(v??"").match(/-?\d+(\.\d+)?/);return m?Number(m[0]):null;}
function priceText(v){const n=num(v);return n===null?"Unknown":`$${n.toFixed(2)}`;}

function parseHtml(html){
  const f={};
  const price=html.match(/id=["']price["'][^>]*data-value=["']([^"']+)["']/i);if(price)f.price=price[1];
  const title=html.match(/<span[^>]*class=["'][^"']*title-account[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);if(title)f.title=title[1].replace(/<[^>]+>/g,"").trim();
  const pub=html.match(/class=["'][^"']*published_date[^"']*["'][^>]*data-value=["']([^"']+)["']/i)
    || html.match(/published_date[^>]*data-value=["']([^"']+)["']/i)
    || html.match(/data-cachedtitle=["']([^"']*(?:\d{4}|Yesterday|Today)[^"']*)["'][^>]*>[^<]*(?:Yesterday|Today|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
  if(pub){
    const raw=pub[1];
    f.uploaded=/^\d+$/.test(String(raw))?Number(raw):raw;
  }
  const upd=html.match(/class=["'][^"']*refreshed_date[^"']*["'][^>]*data-value=["']([^"']+)["']/i)
    || html.match(/refreshed_date[^>]*data-value=["']([^"']+)["']/i);
  if(upd)f.updated=Number(upd[1]);
  const seller=html.match(/data-user=["'][^,"']+,\s*([^"']+)["']/i);if(seller)f.seller=seller[1].trim();
  return f;
}
function normalize(summary,detail={},labels=[],rank=0){
  const id=idOf(summary)||idOf(detail);
  const merged={...summary,...(detail?.item||detail?.data||detail||{})};
  const title=summary.title||summary.item_title||merged.title||merged.item_title||merged.name||`Listing ${id}`;
  const sellerObj=summary.seller||merged.seller||summary.user||merged.user||{};
  let skins=summary.skin_count??summary.skins_count??merged.skin_count??merged.skins_count??firstDeep({summary,detail},["skin_count","skins_count","outfits_count","fortnite_skins_count"]);
  if(!known(skins))skins=titleNum(title,[/(\d+)\s*skins?/i,/(\d+)\s*outfits?/i]);
  let level=summary.season_level??summary.level??merged.season_level??merged.level??firstDeep({summary,detail},["season_level","account_level","fortnite_level","level"]);
  if(!known(level))level=titleNum(title,[/level\s*[:#-]?\s*(\d+)/i,/lvl\s*[:#-]?\s*(\d+)/i]);
  let email=summary.email_changeable??merged.email_changeable??merged.change_email??firstDeep({summary,detail},["email_changeable","change_email","changeable_email","can_change_email"]);
  if(!known(email)){const s=title.toLowerCase();email=s.includes("same email")?"same":s.includes("changeable email")?"yes":s.includes("no email")?"no":"Unknown";}
  return {
    id,rank,title,
    price:summary.price??summary.price_usd??merged.price??merged.price_usd??merged.cost??"",
    seller:typeof sellerObj==="string"?sellerObj:(sellerObj.username||sellerObj.name||summary.seller_username||merged.username||"Unknown"),
    country:summary.country||merged.country||summary.country_code||merged.country_code||merged.origin||"Unknown",
    skins:known(skins)?skins:"Unknown",
    level:known(level)?level:"Unknown",
    email,
    uploaded:summary.uploaded_at||summary.upload_date||summary.uploaded||summary.created_at||summary.created_date||summary.published_at||summary.published_date||summary.pdate_upload||summary.pdate||merged.uploaded_at||merged.upload_date||merged.uploaded||merged.created_at||merged.created_date||merged.published_at||merged.published_date||merged.pdate||"Unknown",
    updated:summary.updated_at||summary.refreshed_at||summary.refreshed_date||summary.last_update||merged.updated_at||merged.refreshed_at||merged.refreshed_date||merged.last_update||"Unknown",
    labels:[...new Set(labels)],
    raw:{summary,detail}
  };
}
function applyHtml(r,html){
  const f=parseHtml(html);
  if(f.title)r.title=f.title;
  if(f.price)r.price=f.price;
  if(f.seller)r.seller=f.seller;
  if(f.uploaded)r.uploaded=f.uploaded;
  if(f.updated)r.updated=f.updated;
  return r;
}

function filter(){
  const q=$("q").value.toLowerCase().trim();
  const min=num($("minPrice").value),max=num($("maxPrice").value);
  const multi=$("multiOnly").checked;
  return results.filter(r=>{
    const text=[r.title,r.seller,r.country,r.skins,r.level,...r.labels].join(" ").toLowerCase();
    const p=num(r.price);
    if(q&&!text.includes(q))return false;
    if(min!==null&&(p===null||p<min))return false;
    if(max!==null&&(p===null||p>max))return false;
    if(multi&&r.labels.length<2)return false;
    return true;
  });
}
function sortList(list){
  const s=$("sort").value, order=$("order").value;
  const arr=list.slice();

  // "Newest" means closest upload date+time to the user's current system/browser time.
  // This is better than target order and better than page order.
  const newestSort=(a,b)=>newestDistance(a)-newestDistance(b) || (uploadMs(b)-uploadMs(a)) || a.rank-b.rank;
  const oldestSort=(a,b)=>(uploadMs(a)===-Infinity?Infinity:uploadMs(a))-(uploadMs(b)===-Infinity?Infinity:uploadMs(b)) || a.rank-b.rank;

  if(s==="market"||s==="newest"){
    if(order==="price_to_up")arr.sort((a,b)=>(num(a.price)??Infinity)-(num(b.price)??Infinity));
    else if(order==="price_to_down")arr.sort((a,b)=>(num(b.price)??-Infinity)-(num(a.price)??-Infinity));
    else if(order==="pdate_to_up_upload"||order==="pdate_to_up")arr.sort(oldestSort);
    else arr.sort(newestSort);
  }
  if(s==="price_asc")arr.sort((a,b)=>(num(a.price)??Infinity)-(num(b.price)??Infinity));
  if(s==="price_desc")arr.sort((a,b)=>(num(b.price)??-Infinity)-(num(a.price)??-Infinity));
  if(s==="matches_desc")arr.sort((a,b)=>b.labels.length-a.labels.length);
  return arr;
}
function visible(){return sortList(filter());}

function message(r){
  return `New Fortnite listing on LZT Market

Skin Count: ${r.skins}
Exclusives: ${r.labels.join(", ")}
Email Changeable: ${boolIcon(r.email)}

Title: ${r.title}
Seller: ${r.seller}
Price: ${priceText(r.price)}
Season Level: ${r.level}
Country: ${r.country}
Upload Date: ${niceDateTime(uploadDate(r))}
System-Time Distance: ${ageText(r)}
Link: https://lzt.market/${r.id}/`;
}
function imgBox(r,type,label){
  const imgId=`img-${type}-${r.id}`;
  return `<div class="imgbox">
    <div class="imgbox-head">
      <b>${label}</b>
      <span class="hosted-badge">HOSTED_ON_PAGE</span>
    </div>
    <div class="imgwrap">
      <img id="${esc(imgId)}" data-id="${esc(r.id)}" data-type="${esc(type)}" alt="${esc(label)}" onerror="window.__imgFail(this)">
      <span class="imgfail">image could not be hosted in this page</span>
    </div>
  </div>`;
}
function card(r){
  const msg=message(r);
  return `<article class="card">
    <div class="card-head">
      <div>
        <div class="prompt"><span>C:\\WROTA\\LISTING&gt;</span> ${esc(r.id)}</div>
        <div class="upload-stamp">UPLOAD_DATE: ${esc(niceDateTime(uploadDate(r)))} · ${esc(ageText(r))}</div>
        <h3>${esc(r.title)}</h3>
        <div class="badges">${r.labels.map(x=>`<span>${esc(x)}</span>`).join("")}</div>
      </div>
      <div class="price">${esc(priceText(r.price))}</div>
    </div>
    <div class="info">
      <div><span>SKINS</span><b>${esc(r.skins)}</b></div>
      <div><span>EMAIL</span><b>${esc(boolIcon(r.email))}</b></div>
      <div><span>LEVEL</span><b>${esc(r.level)}</b></div>
      <div><span>COUNTRY</span><b>${esc(r.country)}</b></div>
      <div><span>UPLOAD DATE</span><b>${esc(niceDateTime(uploadDate(r)))}</b></div>
      <div><span>AGE</span><b>${esc(ageText(r))}</b></div>
      <div><span>MATCHES</span><b>${r.labels.length}</b></div>
    </div>
    <div class="card-body"><pre class="msg">${esc(msg)}</pre></div>
    <details class="locker" open><summary>SITE_HOSTED_LOCKER_IMAGES</summary><div class="locker-grid">${imgBox(r,"skins","skins")}${imgBox(r,"pickaxes","pickaxes")}</div></details>
    <div class="card-actions">
      <a class="btn" href="https://lzt.market/${esc(r.id)}/" target="_blank">OPEN</a>
      <button class="btn" data-copy="${esc(msg)}">COPY</button>
      <button class="btn" data-save="${esc(r.id)}">SAVE</button>
    </div>
    <details class="raw"><summary>RAW_JSON</summary><pre>${esc(JSON.stringify(r,null,2))}</pre></details>
  </article>`;
}
function renderStats(){
  const vis=visible();
  $("statShown").textContent=vis.length;
  $("statUnique").textContent=results.length;
  $("statHits").textContent=results.reduce((a,r)=>a+r.labels.length,0);
  $("statImgFail").textContent=imgFails;
  $("statSaved").textContent=saved.length;
}
function renderFeed(){
  renderStats();
  const list=visible();
  const box=$("feed");
  if(!list.length){
    box.className="empty";
    box.innerHTML=`<pre>C:\\WROTA&gt; no visible accounts</pre>`;
    return;
  }
  box.className=compact?"cards compact":"cards";
  box.innerHTML=list.map(card).join("");
  wire(box);
  if($("loadImages").checked)hydrateImages(box);
}
function renderSaved(){
  $("statSaved").textContent=saved.length;
  const box=$("saved");
  if(!saved.length){box.className="empty small";box.innerHTML="<pre>no saved cases</pre>";return;}
  box.className="cards compact";
  box.innerHTML=saved.map(card).join("");
  wire(box);
}
function hydrateImages(root=document){
  root.querySelectorAll("img[data-id]").forEach(img=>{
    if(img.dataset.loaded)return;
    img.dataset.loaded="1";
    loadImage(img,img.dataset.id,img.dataset.type);
  });
}
function wire(root=document){
  root.querySelectorAll("[data-copy]").forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);toast("copied")}catch{toast("copy failed")}});
  root.querySelectorAll("[data-save]").forEach(b=>b.onclick=()=>{const r=results.find(x=>x.id===b.dataset.save);if(!r)return;if(!saved.some(x=>x.id===r.id))saved.unshift(r);saved=saved.slice(0,100);localStorage.setItem("wrota.cmd.saved",JSON.stringify(saved));renderSaved();renderStats();});
}
function progress(done,total){
  $("progress").classList.remove("hidden");
  const p=total?Math.round(done/total*100):0;
  $("progressText").textContent=p+"%";
  $("progressBar").style.width=p+"%";
}
async function pool(tasks,limit,onDone){
  let i=0,done=0;
  async function worker(){
    while(i<tasks.length){
      const idx=i++;
      let res;
      try{res=await tasks[idx]();}catch(e){res={error:e};}
      done++;onDone(done,tasks.length,idx,res);
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,tasks.length)},worker));
}
function paramsFor(t,page){
  const p={page,order_by:$("order").value,currency:"usd"};
  p[t.param]=t.id;
  return p;
}
async function scan(){
  if(!targets.length){toast("no targets");return;}
  results=[];imgFails=0;renderFeed();status("SCANNING");$("scanBtn").disabled=true;
  const pages=Math.max(1,Math.min(30,Number($("pages").value)||4));
  const threads=Math.max(1,Math.min(8,Number($("threads").value)||3));
  const delay=Math.max(0,Math.min(15000,Number($("delay").value)||0));
  const tasks=[];
  for(let page=1;page<=pages;page++){
    for(const target of targets){
      tasks.push(async()=>{
        if(delay)await sleep(delay);
        const data=await lztJson("/fortnite",paramsFor(target,page));
        return {target,page,items:extractItems(data)};
      });
    }
  }
  const found=new Map();
  try{
    await pool(tasks,threads,(done,total,idx,res)=>{
      if(res.error){log("page error",{error:res.error.message});progress(done,total);return;}
      for(const item of res.items){
        const id=idOf(item);if(!id)continue;
        const pack=found.get(id)||{summary:{},labels:[],rank:found.size};
        pack.summary={...pack.summary,...item};
        pack.labels=[...new Set([...pack.labels,res.target.label])];
        found.set(id,pack);
      }
      results=[...found.entries()].map(([id,p])=>normalize(p.summary,{},p.labels,p.rank));
      renderFeed();
      progress(done,total);
    });

    if($("enrich").checked){
      const enrichTasks=results.map(r=>async()=>{
        try{
          const html=await lztText(`https://lzt.market/${r.id}/`);
          applyHtml(r,html);
        }catch(e){log("enrich failed",{id:r.id,error:e.message});}
        return r;
      });
      await pool(enrichTasks,Math.min(threads,4),(done,total,idx,res)=>{
        renderFeed();
        progress(done,total);
      });
    }

    renderFeed();
    status("DONE");
    log("scan complete",{unique:results.length,hits:results.reduce((a,r)=>a+r.labels.length,0)});
  }catch(e){
    status("ERROR");
    log("scan failed",{error:e.message});
  }finally{
    $("scanBtn").disabled=false;
    $("progress").classList.add("hidden");
  }
}
async function test(){
  try{status("TESTING");await lztJson("/fortnite",{page:1,order_by:"pdate_to_down_upload",currency:"usd"});status("READY");toast("connection ok");}
  catch(e){status("ERROR");log("test failed",{error:e.message});}
}
function bind(){
  loadCfg();
  try{saved=JSON.parse(localStorage.getItem("wrota.cmd.saved")||"[]")}catch{}
  renderTargets();renderFeed();renderSaved();
  $("showBtn").onclick=()=>{const show=$("apiKey").type==="password";$("apiKey").type=show?"text":"password";$("cookie").type=show?"text":"password";$("showBtn").textContent=show?"HIDE":"SHOW";};
  $("testBtn").onclick=test;
  $("saveBtn").onclick=()=>{saveCfg();toast("saved config")};
  $("clearBtn").onclick=()=>{$("apiKey").value="";$("cookie").value="";$("proxyUrl").value=DEFAULT_PROXY;saveCfg();};
  $("scanBtn").onclick=scan;
  $("addTargetBtn").onclick=()=>{parseTargets($("targetInput").value).forEach(t=>addTarget(targets,t.param,t.id));$("targetInput").value="";renderTargets();};
  $("parseBulkBtn").onclick=()=>{parseTargets($("bulkTargets").value).forEach(t=>addTarget(targets,t.param,t.id));$("bulkTargets").value="";renderTargets();};
  $("ogBtn").onclick=()=>{targets=[...DEFAULT_TARGETS];renderTargets();};
  $("clearTargetsBtn").onclick=()=>{targets=[];renderTargets();};
  ["q","minPrice","maxPrice","sort","multiOnly"].forEach(id=>$(id).addEventListener("input",renderFeed));
  ["sort","multiOnly"].forEach(id=>$(id).addEventListener("change",renderFeed));
  $("resetFiltersBtn").onclick=()=>{$("q").value="";$("minPrice").value="";$("maxPrice").value="";$("sort").value="market";$("multiOnly").checked=false;renderFeed();};
  $("compactBtn").onclick=()=>{compact=!compact;$("compactBtn").textContent=compact?"CARDS":"COMPACT";renderFeed();};
  $("copyBtn").onclick=async()=>{try{await navigator.clipboard.writeText(visible().map(message).join("\n\n---\n\n"));toast("copied filtered")}catch{toast("copy failed")}};
  $("exportBtn").onclick=()=>exportJson("wrota-cmd-results.json",visible());
  $("exportSavedBtn").onclick=()=>exportJson("wrota-cmd-saved.json",saved);
  $("clearSavedBtn").onclick=()=>{saved=[];localStorage.setItem("wrota.cmd.saved","[]");renderSaved();renderStats();};
  $("clearLogBtn").onclick=()=>{$("debugLog").textContent=""};
}
function exportJson(name,data){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=name;a.click();
  URL.revokeObjectURL(url);
}
window.addEventListener("error",e=>log("script error",{message:e.message}));
window.addEventListener("unhandledrejection",e=>log("request error",{message:e.reason?.message||String(e.reason)}));
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",bind):bind();
