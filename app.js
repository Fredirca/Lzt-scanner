const DEFAULT_PROXY="https://shiny-shape-49fd.flruming.workers.dev";
const API_BASE="https://prod-api.lzt.market";
const MIN_GAP=225;
const MAX_RETRIES=3;

const DEFAULT_TARGETS=[
  {param:"pickaxe[]",id:"pickaxe_lockjaw_og",label:"Raider’s Revenge OG Style"},
  {param:"skin[]",id:"030_athena_commando_m_halloween_og",label:"OG Skull Trooper / Purple Skull"},
  {param:"skin[]",id:"029_athena_commando_f_halloween_og",label:"OG Ghoul Trooper / Pink Ghoul"},
  {param:"skin[]",id:"028_athena_commando_f_og",label:"Renegade Raider OG Style"},
  {param:"skin[]",id:"017_athena_commando_m_og",label:"Aerial Assault Trooper OG Style"}
];


const EXCLUSIVE_SKIN_PRESETS={
  og:[
    {param:"skin[]",id:"030_athena_commando_m_halloween_og",label:"OG Skull Trooper / Purple Skull"},
    {param:"skin[]",id:"029_athena_commando_f_halloween_og",label:"OG Ghoul Trooper / Pink Ghoul"},
    {param:"skin[]",id:"028_athena_commando_f_og",label:"Renegade Raider OG Style"},
    {param:"skin[]",id:"017_athena_commando_m_og",label:"Aerial Assault Trooper OG Style"}
  ],
  promo:[
    {param:"skin[]",id:"175_athena_commando_m_celestial",label:"Galaxy"},
    {param:"skin[]",id:"313_athena_commando_m_kpopfashion",label:"iKONIK"},
    {param:"skin[]",id:"479_athena_commando_f_davinci",label:"GLOW"},
    {param:"skin[]",id:"434_athena_commando_f_stealthhonor",label:"Wonder"},
    {param:"skin[]",id:"342_athena_commando_m_streetracermetallic",label:"Honor Guard"},
    {param:"skin[]",id:"183_athena_commando_m_modernmilitaryred",label:"Double Helix"},
    {param:"skin[]",id:"113_athena_commando_m_blueace",label:"Royale Bomber"},
    {param:"skin[]",id:"174_athena_commando_f_carbidewhite",label:"Eon"},
    {param:"skin[]",id:"371_athena_commando_m_speedymidnight",label:"Dark Vertex"},
    {param:"skin[]",id:"441_athena_commando_f_cyberfu",label:"Neo Versa"},
    {param:"skin[]",id:"386_athena_commando_m_streetopsstealth",label:"Stealth Reflex"},
    {param:"skin[]",id:"757_athena_commando_f_wildcat",label:"Wildcat"}
  ]
};

function exclusiveTargets(){
  const mode=$("exclusiveMode")?.value||"off";
  if(mode==="og")return EXCLUSIVE_SKIN_PRESETS.og.slice();
  if(mode==="promo")return EXCLUSIVE_SKIN_PRESETS.promo.slice();
  if(mode==="all")return [...EXCLUSIVE_SKIN_PRESETS.og,...EXCLUSIVE_SKIN_PRESETS.promo];
  return [];
}
function mergedScanTargets(){
  const merged=[];
  const push=t=>{
    if(!t||!t.param||!t.id)return;
    if(merged.some(x=>x.param===t.param&&x.id===t.id))return;
    merged.push({...t});
  };
  targets.forEach(push);
  exclusiveTargets().forEach(push);
  return merged;
}


let targets=[...DEFAULT_TARGETS];
let results=[];
let saved=[];
let compact=false;
let reqCount=0;
let lastReq=0;

const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function log(line,obj){
  const msg=`[${new Date().toLocaleTimeString()}] ${line}${obj?" "+JSON.stringify(obj):""}`;
  $("debugLog").textContent=msg+"\n"+$("debugLog").textContent.slice(0,12000);
  console.log(line,obj||"");
}
function status(s){$("status").textContent=s}
function cfg(){return {proxy:($("proxyUrl").value||DEFAULT_PROXY).replace(/\/+$/,""),key:$("apiKey").value.trim()}}
function proxyUrl(target){return `${cfg().proxy}/proxy?url=${encodeURIComponent(target)}`}
function headers(){const h={"Accept":"application/json"};if(cfg().key)h["X-LZT-Key"]=cfg().key;return h}
function saveCfg(){localStorage.setItem("wrota.api.cfg",JSON.stringify(cfg()))}
function loadCfg(){try{const c=JSON.parse(localStorage.getItem("wrota.api.cfg")||"{}");$("proxyUrl").value=c.proxy||DEFAULT_PROXY;$("apiKey").value=c.key||""}catch{$("proxyUrl").value=DEFAULT_PROXY}}
async function fetchTimeout(url,opts={},ms=45000){
  const ac=new AbortController();const t=setTimeout(()=>ac.abort(),ms);
  try{return await fetch(url,{...opts,signal:ac.signal})}finally{clearTimeout(t)}
}
async function gate(){const wait=Math.max(0,MIN_GAP-(Date.now()-lastReq));if(wait)await sleep(wait);lastReq=Date.now()}
async function api(path,params={}){
  const u=new URL(API_BASE+path);
  Object.entries(params).forEach(([k,v])=>{
    if(v===undefined||v===null||v==="")return;
    if(Array.isArray(v))v.forEach(x=>u.searchParams.append(k,x));
    else u.searchParams.append(k,v);
  });
  let last;
  for(let attempt=0;attempt<=MAX_RETRIES;attempt++){
    await gate();reqCount++;renderStats();
    const res=await fetchTimeout(proxyUrl(u.toString()),{headers:headers()});
    if(res.status===429){const wait=Number(res.headers.get("Retry-After")||0)*1000 || 700*(attempt+1);log("429 retry",{wait});await sleep(wait);continue}
    const text=await res.text();
    if(!res.ok){last=new Error(`HTTP ${res.status}: ${text.slice(0,140)}`);if(res.status>=500){await sleep(600*(attempt+1));continue}throw last}
    try{return JSON.parse(text)}catch{return {raw:text}}
  }
  throw last||new Error("API failed");
}

function canonicalParam(k){const s=decodeURIComponent(String(k||"")).toLowerCase();if(s.startsWith("skin"))return"skin[]";if(s.startsWith("pickaxe"))return"pickaxe[]";if(s.startsWith("dance")||s.startsWith("emote"))return"dance[]";if(s.startsWith("glider"))return"glider[]";return""}
function inferParam(id){const s=String(id).toLowerCase();if(s.startsWith("pickaxe"))return"pickaxe[]";if(s.includes("athena_commando")||s.includes("commando"))return"skin[]";return"skin[]"}
function labelFor(param,id){const s=String(id).toLowerCase();if(param==="pickaxe[]"&&s.includes("lockjaw_og"))return"Raider’s Revenge OG Style";if(s.includes("030_athena_commando_m_halloween_og"))return"OG Skull Trooper / Purple Skull";if(s.includes("029_athena_commando_f_halloween_og"))return"OG Ghoul Trooper / Pink Ghoul";if(s.includes("028_athena_commando_f_og"))return"Renegade Raider OG Style";if(s.includes("017_athena_commando_m_og"))return"Aerial Assault Trooper OG Style";
  if(s.includes("175_athena_commando_m_celestial"))return"Galaxy";
  if(s.includes("313_athena_commando_m_kpopfashion"))return"iKONIK";
  if(s.includes("479_athena_commando_f_davinci"))return"GLOW";
  if(s.includes("434_athena_commando_f_stealthhonor"))return"Wonder";
  if(s.includes("342_athena_commando_m_streetracermetallic"))return"Honor Guard";
  if(s.includes("183_athena_commando_m_modernmilitaryred"))return"Double Helix";
  if(s.includes("113_athena_commando_m_blueace"))return"Royale Bomber";
  if(s.includes("174_athena_commando_f_carbidewhite"))return"Eon";
  if(s.includes("371_athena_commando_m_speedymidnight"))return"Dark Vertex";
  if(s.includes("441_athena_commando_f_cyberfu"))return"Neo Versa";
  if(s.includes("386_athena_commando_m_streetopsstealth"))return"Stealth Reflex";
  if(s.includes("757_athena_commando_f_wildcat"))return"Wildcat";return`${param} ${id}`}
function addTarget(list,param,id){const clean=decodeURIComponent(String(id||"")).trim().replace(/^cid_/i,"").split(/[&#]/)[0];if(!param||!clean)return;if(list.some(t=>t.param===param&&t.id===clean))return;list.push({param,id:clean,label:labelFor(param,clean)})}
function parseTargets(text){
  const out=[];const raw=String(text||"");
  try{if(raw.includes("http")){const u=new URL(raw);for(const[k,v]of u.searchParams.entries()){const p=canonicalParam(k);if(p)addTarget(out,p,v)}}}catch{}
  const dec=decodeURIComponent(raw);let m;const re=/(skin|pickaxe|dance|emote|glider)(?:\[\]|%5B%5D)?\s*=\s*([a-zA-Z0-9_'’-]+)/gi;
  while((m=re.exec(dec)))addTarget(out,canonicalParam(m[1]),m[2]);
  dec.split(/[\s,;|]+/).forEach(tok=>{const t=tok.trim();if(!t||t.includes("=")||t.includes("http"))return;if(/^[a-zA-Z0-9_'’-]+$/.test(t)&&(t.includes("athena")||t.includes("pickaxe")||t.includes("commando")))addTarget(out,inferParam(t),t)});
  return out;
}
function renderTargets(){
  $("targetCount").textContent=targets.length;
  $("targetList").innerHTML=targets.map((t,i)=>`<span class="chip"><code>${esc(t.param)}</code>${esc(t.label)}<button data-rm="${i}">x</button></span>`).join("");
  document.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{targets.splice(Number(b.dataset.rm),1);renderTargets()});
}

function known(v){return v!==undefined&&v!==null&&v!==""&&String(v).toLowerCase()!=="unknown"}
function idOf(item){const raw=item?.item_id??item?.itemId??item?.account_id??item?.accountId??item?.id??"";return /^\d+$/.test(String(raw))?String(raw):""}
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
    if(!v)return;if(Array.isArray(v)){v.forEach(walk);return}if(typeof v!=="object")return;
    if(isListing(v)){const id=idOf(v);if(!seen.has(id)){seen.add(id);out.push(v)}}
    for(const[k,n]of Object.entries(v)){if(/^\d+$/.test(k)&&n&&typeof n==="object"&&!Array.isArray(n)&&!idOf(n))n.item_id=k;if(["items","data","results","list","accounts","market_items","response","values"].includes(k)||Array.isArray(n)||/^\d+$/.test(k))walk(n)}
  }
  walk(data);return out;
}
function firstDeep(v,keys){
  let found="";const seen=new WeakSet();
  function walk(x){if(found||!x||typeof x!=="object"||seen.has(x))return;seen.add(x);if(Array.isArray(x)){x.forEach(walk);return}for(const k of keys){if(x[k]!==undefined&&x[k]!==null&&x[k]!==""){found=x[k];return}}Object.values(x).forEach(walk)}
  walk(v);return found;
}
function textDeep(v,seen=new WeakSet()){if(v==null)return"";if(["string","number","boolean"].includes(typeof v))return String(v);if(typeof v!=="object"||seen.has(v))return"";seen.add(v);return Object.values(v).map(x=>textDeep(x,seen)).join(" ")}
function titleNum(t,patterns){for(const p of patterns){const m=String(t||"").match(p);if(m)return m[1]}return""}
function num(v){const m=String(v??"").match(/-?\d+(\.\d+)?/);return m?Number(m[0]):null}
function price(v){const n=num(v);return n===null?"Unknown":`$${n.toFixed(2)}`}
function bool(v){const s=String(v??"").toLowerCase();if(typeof v==="boolean")return v?"YES":"NO";if(s.includes("same"))return"SAME";if(s.includes("changeable")||["1","yes","true"].includes(s))return"YES";if(s.includes("no email")||s.includes("without email")||["0","no","false"].includes(s))return"NO";return"UNK"}
function dateVal(v){if(!known(v))return null;const raw=String(v).trim();if(typeof v==="number"||/^\d{10,13}$/.test(raw)){const n=Number(raw);const d=new Date(n>1e11?n:n*1000);return isNaN(d)?null:d}const d=new Date(raw.replace(/\bat\b/i,"").replace(/\s+/g," ").trim());return isNaN(d)?null:d}
function dateText(v){const d=dateVal(v);return d?d.toISOString().slice(0,16).replace("T"," "):"Unknown"}
function uploadOf(r){return r.uploaded!=="Unknown"?r.uploaded:(r.updated!=="Unknown"?r.updated:"Unknown")}
function uploadMs(r){const d=dateVal(uploadOf(r));return d?d.getTime():-Infinity}
function age(r){const ms=uploadMs(r);if(ms===-Infinity)return"Unknown";const diff=Date.now()-ms;const m=Math.floor(Math.abs(diff)/60000),h=Math.floor(m/60),d=Math.floor(h/24);let t=m<1?"now":m<60?`${m}m`:h<48?`${h}h`:`${d}d`;return diff<0?`in ${t}`:`${t} ago`}

function norm(summary,detail={},labels=[],rank=0){
  const root=detail?.item||detail?.data||detail?.account||detail?.response||detail||{};
  const m={...summary,...root};
  const id=idOf(summary)||idOf(m);
  const title=summary.title||summary.item_title||m.title||m.item_title||m.name||`Listing ${id}`;
  const sellerObj=summary.seller||m.seller||summary.user||m.user||{};
  let skins=summary.skin_count??summary.skins_count??m.skin_count??m.skins_count??m.skins??firstDeep({summary,detail},["skin_count","skins_count","outfits_count","fortnite_skins_count"]);
  if(!known(skins))skins=titleNum(title,[/(\d+)\s*skins?/i,/(\d+)\s*outfits?/i]);
  let level=summary.season_level??summary.level??m.season_level??m.level??firstDeep({summary,detail},["season_level","account_level","fortnite_level","level"]);
  if(!known(level))level=titleNum(title,[/level\s*[:#-]?\s*(\d+)/i,/lvl\s*[:#-]?\s*(\d+)/i]);
  let email=summary.email_changeable??m.email_changeable??m.change_email??firstDeep({summary,detail},["email_changeable","change_email","changeable_email","can_change_email"]);
  if(!known(email)){const s=title.toLowerCase();email=s.includes("same email")?"same":s.includes("changeable email")?"yes":s.includes("no email")?"no":"Unknown"}
  return {
    id,rank,title,
    price:summary.price??summary.price_usd??m.price??m.price_usd??m.cost??m.amount??"",
    seller:typeof sellerObj==="string"?sellerObj:(sellerObj.username||sellerObj.name||summary.seller_username||m.username||"Unknown"),
    country:summary.country||m.country||summary.country_code||m.country_code||m.origin||"Unknown",
    skins:known(skins)?skins:"Unknown",
    level:known(level)?level:"Unknown",
    email,
    uploaded:summary.uploaded_at||summary.upload_date||summary.uploaded||summary.created_at||summary.created_date||summary.published_at||summary.published_date||summary.pdate_upload||summary.pdate||m.uploaded_at||m.upload_date||m.uploaded||m.created_at||m.created_date||m.published_at||m.published_date||m.pdate||"Unknown",
    updated:summary.updated_at||summary.refreshed_at||summary.refreshed_date||summary.last_update||m.updated_at||m.refreshed_at||m.refreshed_date||m.last_update||"Unknown",
    lastActivity:summary.last_activity||summary.last_seen||m.last_activity||m.last_seen||"Unknown",
    views:summary.views||summary.view_count||m.views||m.view_count||"",
    itemOrigin:summary.item_origin||m.item_origin||summary.origin||m.origin||"",
    guarantee:summary.guarantee||m.guarantee||summary.warranty||m.warranty||"",
    labels:[...new Set(labels)],
    apiText:textDeep({summary,detail}),
    raw:{summary,detail}
  };
}
async function apiDetail(r){
  const paths=[`/fortnite/${r.id}`,`/item/${r.id}`,`/items/${r.id}`,`/${r.id}`];
  for(const path of paths){
    try{
      const data=await api(path,{locale:"en",currency:"usd",fields_include:"*"});
      if(data&&typeof data==="object"&&!data.raw){
        const nr=norm({item_id:r.id},data,r.labels,r.rank);
        Object.assign(r,nr,{raw:{summary:r.raw.summary,detail:data}});
        log("detail ok",{id:r.id,path});
        return r;
      }
    }catch(e){log("detail miss",{id:r.id,path,error:e.message})}
  }
  return r;
}

function params(t,page){
  const ord=$("order").value;
  const p={page,order:ord,order_by:ord,currency:"usd",locale:"en",fields_include:"*"};
  const q=$("q").value.trim();const min=num($("minPrice").value);const max=num($("maxPrice").value);
  if(q)p.title=q;if(min!==null)p.pmin=min;if(max!==null)p.pmax=max;
  p[t.param]=t.id;
  return p;
}
async function pool(tasks,limit,onDone){
  let i=0,done=0;
  async function worker(){while(i<tasks.length){const idx=i++;let r;try{r=await tasks[idx]()}catch(e){r={error:e}}done++;onDone(done,tasks.length,idx,r)}}
  await Promise.all(Array.from({length:Math.max(1,Math.min(limit,tasks.length))},worker));
}
function filter(){
  const q=$("q").value.toLowerCase().trim(), min=num($("minPrice").value), max=num($("maxPrice").value), multi=$("multiOnly").checked;
  return results.filter(r=>{const txt=[r.title,r.seller,r.country,r.apiText,...r.labels].join(" ").toLowerCase();const p=num(r.price);if(q&&!txt.includes(q))return false;if(min!==null&&(p===null||p<min))return false;if(max!==null&&(p===null||p>max))return false;if(multi&&r.labels.length<2)return false;return true});
}
function sortList(list){
  const s=$("sort").value, ord=$("order").value, arr=list.slice();
  const has=x=>uploadMs(x)!==-Infinity;
  const newest=(a,b)=>has(a)!==has(b)?(has(a)?-1:1):Math.abs(Date.now()-uploadMs(a))-Math.abs(Date.now()-uploadMs(b))||uploadMs(b)-uploadMs(a)||a.rank-b.rank;
  if(s==="price_asc")arr.sort((a,b)=>(num(a.price)??Infinity)-(num(b.price)??Infinity));
  else if(s==="price_desc")arr.sort((a,b)=>(num(b.price)??-Infinity)-(num(a.price)??-Infinity));
  else if(s==="matches_desc")arr.sort((a,b)=>b.labels.length-a.labels.length);
  else if(s==="skins_desc")arr.sort((a,b)=>(num(b.skins)??-Infinity)-(num(a.skins)??-Infinity));
  else if(ord==="pdate_to_up_upload"||ord==="pdate_to_up")arr.sort((a,b)=>uploadMs(a)-uploadMs(b)||a.rank-b.rank);
  else arr.sort(newest);
  return arr;
}
function visible(){return sortList(filter())}
function message(r){return`New Fortnite listing on LZT Market

Skin Count: ${r.skins}
Matches: ${r.labels.join(", ")}
Email Changeable: ${bool(r.email)}

Title: ${r.title}
Seller: ${r.seller}
Price: ${price(r.price)}
Level: ${r.level}
Country: ${r.country}
Upload Date: ${dateText(uploadOf(r))}
Age: ${age(r)}
Link: https://lzt.market/${r.id}/`}
function card(r){
  const msg=message(r);
  return `<article class="card">
    <div class="cardhead">
      <div><div class="cmd">Listing #${esc(r.id)}</div><h3>${esc(r.title)}</h3><div class="badges">${r.labels.map(x=>`<span>${esc(x)}</span>`).join("")}</div></div>
      <div class="price">${esc(price(r.price))}</div>
    </div>
    <div class="info">
      <div><span>SKINS</span><b>${esc(r.skins)}</b></div>
      <div><span>EMAIL</span><b>${esc(bool(r.email))}</b></div>
      <div><span>LEVEL</span><b>${esc(r.level)}</b></div>
      <div><span>COUNTRY</span><b>${esc(r.country)}</b></div>
      <div><span>UPLOAD</span><b>${esc(dateText(uploadOf(r)))}</b></div>
      <div><span>AGE</span><b>${esc(age(r))}</b></div>
      <div><span>MATCHES</span><b>${r.labels.length}</b></div>
      <div><span>VIEWS</span><b>${esc(r.views||"")}</b></div>
    </div>
    <div class="api-grid">
      <div><span>SELLER</span><b>${esc(r.seller)}</b></div>
      <div><span>ORIGIN</span><b>${esc(r.itemOrigin||"")}</b></div>
      <div><span>GUARANTEE</span><b>${esc(r.guarantee||"")}</b></div>
      <div><span>LAST ACTIVITY</span><b>${esc(dateText(r.lastActivity))}</b></div>
    </div>
    <pre class="message">${esc(msg)}</pre>
    <div class="actions"><a class="button" href="https://lzt.market/${esc(r.id)}/" target="_blank">OPEN</a><button data-copy="${esc(msg)}">COPY</button><button data-save="${esc(r.id)}">SAVE</button></div>
    ${$("includeRaw")?.checked?`<details class="raw"><summary>FULL API JSON</summary><pre>${esc(JSON.stringify(r.raw,null,2))}</pre></details>`:""}
  </article>`;
}
function renderStats(){const v=visible();$("statShown").textContent=v.length;$("statUnique").textContent=results.length;$("statHits").textContent=results.reduce((a,r)=>a+r.labels.length,0);$("statReq").textContent=reqCount;$("statSaved").textContent=saved.length}
function renderFeed(){renderStats();const v=visible();const box=$("feed");if(!v.length){box.className="empty";box.innerHTML="<h3>No results</h3><p>Try relaxing filters or run another scan.</p>";return}box.className=compact?"cards compact":"cards";box.innerHTML=v.map(card).join("");wire(box)}
function renderSaved(){const box=$("saved");$("statSaved").textContent=saved.length;if(!saved.length){box.className="empty small-empty";box.innerHTML="<h3>No saved listings</h3>";return}box.className="cards compact";box.innerHTML=saved.map(card).join("");wire(box)}
function wire(root=document){
  root.querySelectorAll("[data-copy]").forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);log("copied")}catch{log("copy failed")}});
  root.querySelectorAll("[data-save]").forEach(b=>b.onclick=()=>{const r=results.find(x=>x.id===b.dataset.save);if(!r)return;if(!saved.some(x=>x.id===r.id))saved.unshift(r);saved=saved.slice(0,100);localStorage.setItem("wrota.api.saved",JSON.stringify(saved));renderSaved();renderStats()});
}
function prog(done,total){$("progress").classList.remove("hidden");const p=total?Math.round(done/total*100):0;$("progressText").textContent=p+"%";$("progressBar").style.width=p+"%"}
async function scan(){
  const scanTargets=mergedScanTargets();
  if(!scanTargets.length){log("no targets or exclusive presets selected");return}
  results=[];reqCount=0;renderFeed();status("SCANNING");$("scanBtn").disabled=true;
  const pages=Math.max(1,Math.min(50,Number($("pages").value)||5));
  const threads=Math.max(1,Math.min(8,Number($("threads").value)||3));
  const delay=Math.max(0,Math.min(15000,Number($("delay").value)||0));
  const tasks=[];
  for(let page=1;page<=pages;page++){
    for(const target of scanTargets){
      tasks.push(async()=>{if(delay)await sleep(delay);const data=await api("/fortnite",params(target,page));return{target,page,items:extractItems(data)}})
    }
  }
  const found=new Map();
  try{
    log("scan start",{manual_targets:targets.length,exclusive_mode:$("exclusiveMode")?.value||"off",scan_targets:scanTargets.length,pages,order:$("order").value,api_only:true});
    await pool(tasks,threads,(done,total,idx,res)=>{
      if(res.error){log("page error",{error:res.error.message});prog(done,total);return}
      for(const item of res.items){const id=idOf(item);if(!id)continue;const pack=found.get(id)||{summary:{},labels:[],rank:found.size};pack.summary={...pack.summary,...item};pack.labels=[...new Set([...pack.labels,res.target.label])];found.set(id,pack)}
      results=[...found.values()].map(p=>norm(p.summary,{},p.labels,p.rank));renderFeed();prog(done,total)
    });
    if($("apiDetails").checked&&results.length){
      const detailTasks=results.map(r=>async()=>await apiDetail(r));
      await pool(detailTasks,Math.min(threads,3),(done,total,idx,res)=>{if(res&&!res.error){const pos=results.findIndex(x=>x.id===res.id);if(pos>=0)results[pos]=res}renderFeed();prog(done,total)})
    }
    renderFeed();status("DONE");log("scan complete",{unique:results.length,hits:results.reduce((a,r)=>a+r.labels.length,0),requests:reqCount});
  }catch(e){status("ERROR");log("scan failed",{error:e.message})}
  finally{$("scanBtn").disabled=false;$("progress").classList.add("hidden")}
}
async function test(){try{status("TESTING");await api("/",{locale:"en"});await api("/fortnite",{page:1,order:"pdate_to_down_upload",order_by:"pdate_to_down_upload",currency:"usd",locale:"en",fields_include:"*"});status("READY");log("api connection ok")}catch(e){status("ERROR");log("api test failed",{error:e.message})}}
function exportJson(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}
function bind(){
  loadCfg();try{saved=JSON.parse(localStorage.getItem("wrota.api.saved")||"[]")}catch{}
  renderTargets();renderFeed();renderSaved();
  $("showBtn").onclick=()=>{const show=$("apiKey").type==="password";$("apiKey").type=show?"text":"password";$("showBtn").textContent=show?"HIDE":"SHOW"};
  $("testBtn").onclick=test;$("saveBtn").onclick=()=>{saveCfg();log("settings saved")};$("clearBtn").onclick=()=>{$("apiKey").value="";saveCfg()};
  $("scanBtn").onclick=scan;
  if($("exclusiveMode")){
    $("exclusiveMode").value=localStorage.getItem("wrota.exclusive.mode")||"off";
    $("exclusiveMode").addEventListener("change",()=>{localStorage.setItem("wrota.exclusive.mode",$("exclusiveMode").value);log("exclusive mode",{mode:$("exclusiveMode").value,count:exclusiveTargets().length});});
  }
  $("addTargetBtn").onclick=()=>{parseTargets($("targetInput").value).forEach(t=>addTarget(targets,t.param,t.id));$("targetInput").value="";renderTargets()};
  $("parseBulkBtn").onclick=()=>{parseTargets($("bulkTargets").value).forEach(t=>addTarget(targets,t.param,t.id));$("bulkTargets").value="";renderTargets()};
  $("ogBtn").onclick=()=>{targets=[...DEFAULT_TARGETS];renderTargets()};$("clearTargetsBtn").onclick=()=>{targets=[];renderTargets()};
  ["q","minPrice","maxPrice","sort","multiOnly","includeRaw"].forEach(id=>$(id).addEventListener("input",renderFeed));
  ["sort","multiOnly","includeRaw"].forEach(id=>$(id).addEventListener("change",renderFeed));
  $("resetFiltersBtn").onclick=()=>{$("q").value="";$("minPrice").value="";$("maxPrice").value="";$("sort").value="api";$("multiOnly").checked=false;renderFeed()};
  $("compactBtn").onclick=()=>{compact=!compact;$("compactBtn").textContent=compact?"CARDS":"COMPACT";renderFeed()};
  $("copyBtn").onclick=async()=>{try{await navigator.clipboard.writeText(visible().map(message).join("\n\n---\n\n"));log("copied visible")}catch{log("copy failed")}};
  $("exportBtn").onclick=()=>exportJson("wrota-api-listings.json",visible());
  $("exportSavedBtn").onclick=()=>exportJson("wrota-api-saved.json",saved);
  $("clearSavedBtn").onclick=()=>{saved=[];localStorage.setItem("wrota.api.saved","[]");renderSaved();renderStats()};
  $("clearLogBtn").onclick=()=>{$("debugLog").textContent=""};
}
window.addEventListener("error",e=>log("script error",{message:e.message}));
window.addEventListener("unhandledrejection",e=>log("request error",{message:e.reason?.message||String(e.reason)}));
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",bind):bind();
