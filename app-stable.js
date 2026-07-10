const DEFAULT_PROXY_URL="https://shiny-shape-49fd.flruming.workers.dev";
const API_BASE="https://prod-api.lzt.market";

const OG_FILTERS=[
  {label:"OG Renegade Raider",group:"Skin",param:"skin[]",id:"028_athena_commando_f",aliases:["og renegade raider","renegade raider"]},
  {label:"Purple Skull Trooper",group:"OG Style",param:"skin[]",id:"030_athena_commando_m_halloween_og",aliases:["og skull trooper","purple skull"]},
  {label:"Pink Ghoul Trooper",group:"OG Style",param:"skin[]",id:"029_athena_commando_f_halloween_og",aliases:["og ghoul trooper","pink ghoul"]},
  {label:"OG Aerial Assault Trooper",group:"Skin",param:"skin[]",id:"017_athena_commando_m",aliases:["og aerial assault trooper","aerial assault trooper"]},
  {label:"Raider’s Revenge OG Style",group:"OG Style",param:"pickaxe[]",id:"pickaxe_id_027_scavenger",aliases:["raider’s revenge og","raider's revenge og","raiders revenge og","black and gold raider's revenge","black & gold raider's revenge"]}
];

let memoryResults=[];
let memoryCases=[];

const $=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function safeLocalGet(key,fallback){
  try{
    const raw=localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch{return fallback;}
}
function safeLocalSet(key,value){
  try{localStorage.setItem(key,JSON.stringify(value));return true;}
  catch{return false;}
}
function safeLocalRemove(key){try{localStorage.removeItem(key);}catch{}}


function firstValue(obj, keys, fallback="Unknown"){
  for(const key of keys){
    const value = obj?.[key];
    if(value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function nestedValue(value, keys, fallback="Unknown"){
  if(value === null || value === undefined) return fallback;
  if(typeof value !== "object") return fallback;

  if(Array.isArray(value)){
    for(const item of value){
      const found = nestedValue(item, keys, null);
      if(found !== null && found !== undefined && found !== "") return found;
    }
    return fallback;
  }

  for(const key of keys){
    if(value[key] !== undefined && value[key] !== null && value[key] !== "") return value[key];
  }

  for(const next of Object.values(value)){
    const found = nestedValue(next, keys, null);
    if(found !== null && found !== undefined && found !== "") return found;
  }

  return fallback;
}

function iconBool(value){
  if(typeof value === "boolean") return value ? "✅" : "❌";
  const text = String(value ?? "").trim().toLowerCase();
  if(["1","true","yes","y","changeable","available"].includes(text)) return "✅";
  if(["0","false","no","n","not","none"].includes(text)) return "❌";
  return "❔";
}

function cleanDate(value){
  if(value === undefined || value === null || value === "") return "Unknown";
  if(typeof value === "number"){
    try{return new Date(value * 1000).toISOString().slice(0,10);}
    catch{return String(value);}
  }
  const text = String(value);
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : text;
}

function priceText(value, currency="USD"){
  if(value === undefined || value === null || value === "") return "Unknown";
  const number = Number(value);
  if(!Number.isNaN(number)) return `$${number.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const text = String(value);
  return text.startsWith("$") ? text : `$${text}`;
}

function compactCase(item){
  if(!item || typeof item!=="object") return item;

  const id = listingId(item) || String(item.item_id ?? item.itemId ?? item.account_id ?? "");
  const filters = item.matched_filters || item.matched_terms || item._matchedFilters || [];
  const url = item.url || item.link || item.market_url || (id && /^\d+$/.test(String(id)) ? `https://lzt.market/${id}/` : "");

  return {
    createdAt:item.createdAt || item.created_at || new Date().toISOString(),
    item_id:id,
    title:item.title || item.item_title || item.name || (id?`Listing ${id}`:"Listing"),
    skin_count:firstValue(item,["skin_count","skins_count","skins","outfits_count","outfit_count"],"Unknown"),
    exclusives:Array.isArray(filters) && filters.length ? filters.join(", ") : firstValue(item,["exclusives"],"Unknown"),
    email_changeable:firstValue(item,["email_changeable","change_email","changeable_email","can_change_email"],"Unknown"),
    price:item.price ?? item.price_usd ?? item.cost ?? item.amount ?? "",
    currency:item.currency || item.price_currency || "USD",
    seller:typeof item.seller==="string" ? item.seller : (item.seller?.username || item.seller?.name || item.user?.username || item.username || item.seller_username || ""),
    season_level:firstValue(item,["season_level","level","account_level"],"Unknown"),
    country:firstValue(item,["country","country_code","origin"],"Unknown"),
    last_activity:firstValue(item,["last_activity","last_activity_at","last_seen","last_login"],"Unknown"),
    url:url,
    matched_filters:Array.isArray(filters)?filters:[String(filters)],
    note:item.note || "Matched by LZT listing filter"
  };
}


function loadCases(){
  const legacy=safeLocalGet("wrota.polished.cases.v1",[]);
  memoryCases=Array.isArray(legacy)?legacy.map(compactCase).filter(x=>/^\d+$/.test(String(x.item_id))).slice(0,100):[];
  safeLocalRemove("wrota.polished.results.v1");
  safeLocalRemove("wrota.results");
  safeLocalSet("wrota.polished.cases.v1",memoryCases);
}

function cases(){return memoryCases;}
function saveCases(list){
  memoryCases=(Array.isArray(list)?list:[]).map(compactCase).slice(0,100);
  safeLocalSet("wrota.polished.cases.v1",memoryCases);
  updateStats();
}
function currentResults(){return memoryResults;}
function saveCurrentResults(list){
  memoryResults=(Array.isArray(list)?list:[]).map(compactCase).filter(x=>/^\d+$/.test(String(x.item_id))).slice(0,300);
  updateStats();
}

function setStatus(text,type="idle"){
  if($("status"))$("status").textContent=text;
  if($("sessionState"))$("sessionState").textContent=text;
  const dot=$("statusDot");
  if(dot)dot.className=`dot ${type}`;
}
function setSubtitle(text){if($("resultsSubtitle"))$("resultsSubtitle").textContent=text;}
function toast(text){
  const el=document.createElement("div");
  el.className="toast";
  el.textContent=text;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),3000);
}
function token(){return ($("apiToken")?.value || "").trim();}

function renderFilters(){
  const count=$("filterCount");
  if(count)count.textContent=`${OG_FILTERS.length} active`;
  const grid=$("filterGrid");
  if(!grid)return;
  grid.innerHTML=OG_FILTERS.map(f=>`
    <article class="filter-card">
      <strong>${esc(f.label)}</strong>
      <span>${esc(f.group)}</span>
    </article>
  `).join("");
}

function listingId(item){
  const raw = item?.item_id ?? item?.itemId ?? item?.id ?? item?.account_id ?? item?.accountId ?? "";
  const text = String(raw);
  return /^\d+$/.test(text) ? text : "";
}

function itemId(item){
  return listingId(item);
}

function isRealListing(item){
  if(!item || typeof item !== "object") return false;

  const id = listingId(item);
  if(!id) return false;

  // Reject Fortnite cosmetic catalogue IDs and cosmetic objects.
  const textId = String(item.id || item.item_id || "");
  if(textId.startsWith("cid_") || textId.startsWith("CID_") || textId.includes("athena_commando")) return false;

  // Require listing/account-like evidence, not just a cosmetic object with a numeric internal id.
  const hasTitle = Boolean(item.title || item.item_title || item.name);
  const hasPrice = item.price !== undefined || item.price_usd !== undefined || item.cost !== undefined || item.amount !== undefined;
  const hasSeller = Boolean(item.seller || item.seller_username || item.user || item.username);
  const hasMarketUrl = Boolean(item.url || item.link || item.market_url);

  return hasTitle && (hasPrice || hasSeller || hasMarketUrl || item.item_id !== undefined || item.account_id !== undefined);
}

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
  try{
    response=await fetchWithTimeout(url,{
      method:"GET",
      headers:{"Accept":"application/json","X-LZT-Key":token()}
    },45000);
  }catch{throw new Error("Connection failed");}
  if(response.status===401||response.status===403)throw new Error("API key rejected");
  if(response.status===429){const err=new Error("Rate limited");err.isRateLimit=true;throw err;}
  if(!response.ok)throw new Error(`${response.status} response`);
  const text=await response.text();
  try{return JSON.parse(text);}catch{return {raw:text};}
}
function extractItems(data){
  const seen = new Set();
  const out = [];

  function add(value){
    if(!isRealListing(value)) return;
    const id = listingId(value);
    if(!id || seen.has(id)) return;
    seen.add(id);
    out.push(value);
  }

  function walk(value, keyHint=""){
    if(!value) return;

    if(Array.isArray(value)){
      value.forEach(x => walk(x, keyHint));
      return;
    }

    if(typeof value !== "object") return;

    add(value);

    // Only recurse through likely API result containers.
    // This avoids picking cosmetic catalogue entries like cid_... / Xander.
    const allowedKeys = new Set([
      "items",
      "data",
      "results",
      "list",
      "accounts",
      "market_items",
      "fortnite",
      "response"
    ]);

    for(const [key,next] of Object.entries(value)){
      if(allowedKeys.has(key) || Array.isArray(next)){
        walk(next, key);
      }
    }
  }

  walk(data);
  return out;
}

function paramsForFilter(filter,page){
  const params={page,order_by:"pdate_to_down_upload",currency:"usd"};
  params[filter.param]=filter.id;
  return params;
}
async function detail(id,fallback){
  if(!$("fetchDetails")?.checked)return {summary_only:fallback,skipped:true};
  if(!/^\d+$/.test(String(id)))return {summary_only:fallback,skipped:true};
  try{return await lztGet(`/${id}`);}
  catch(error){return {summary_only:fallback,error:error.message};}
}
function fieldSet(summary,detailData={}){
  const detailRoot = detailData?.item || detailData?.data || detailData || {};
  const merged = {...summary, ...detailRoot};
  const id = listingId(merged) || listingId(summary) || listingId(detailRoot);

  // Do NOT use a deep search for title/name, because that can pick cosmetic names like "Xander".
  const title = merged.title || merged.item_title || summary?.title || summary?.item_title || (id ? `Listing ${id}` : "Listing");

  const sellerObj = merged.seller || summary?.seller || merged.user || summary?.user || {};
  const seller = typeof sellerObj === "string"
    ? sellerObj
    : (sellerObj.username || sellerObj.name || merged.seller_username || summary?.seller_username || merged.username || summary?.username || "");

  return compactCase({
    createdAt:new Date().toISOString(),
    item_id:id,
    title:title,
    skin_count:merged.skin_count ?? merged.skins_count ?? merged.skins ?? merged.outfits_count ?? merged.outfit_count ?? summary?.skin_count ?? summary?.skins_count ?? "Unknown",
    email_changeable:merged.email_changeable ?? merged.change_email ?? merged.changeable_email ?? merged.can_change_email ?? summary?.email_changeable ?? "Unknown",
    price:merged.price ?? merged.price_usd ?? merged.cost ?? merged.amount ?? summary?.price ?? summary?.price_usd ?? "",
    currency:String(merged.currency || merged.price_currency || summary?.currency || "USD").toUpperCase(),
    seller:seller,
    season_level:merged.season_level ?? merged.level ?? merged.account_level ?? summary?.season_level ?? summary?.level ?? "Unknown",
    country:merged.country || merged.country_code || merged.origin || summary?.country || summary?.country_code || "Unknown",
    last_activity:merged.last_activity || merged.last_activity_at || merged.last_seen || merged.last_login || summary?.last_activity || "Unknown",
    url:merged.url || merged.link || merged.market_url || summary?.url || summary?.link || (id ? `https://lzt.market/${id}/` : "")
  });
}


function progress(done,total,label){
  const pct=total?Math.round((done/total)*100):0;
  $("progressWrap")?.classList.remove("hidden");
  if($("progressLabel"))$("progressLabel").textContent=label;
  if($("progressNumber"))$("progressNumber").textContent=`${pct}%`;
  if($("progressBar"))$("progressBar").style.width=`${pct}%`;
}
function card(caseItem){
  const id = String(caseItem.item_id || "");
  const link = /^\d+$/.test(id) ? (caseItem.url || `https://lzt.market/${id}/`) : "";
  const output =
`New Fortnite listing on LZT Market

Skin Count: ${caseItem.skin_count || "Unknown"}
Exclusives: ${caseItem.exclusives || (caseItem.matched_filters||[]).join(", ") || "Unknown"}
Email Changeable: ${iconBool(caseItem.email_changeable)}

🏷️ Title: ${caseItem.title || "Untitled listing"}
👤 Seller: ${caseItem.seller || "Unknown"}
💵 Price: ${priceText(caseItem.price,caseItem.currency)}
🔢 Season Level: ${caseItem.season_level || "Unknown"}
🌍 Country: ${caseItem.country || "Unknown"}
⏱️ Last Activity: ${cleanDate(caseItem.last_activity)}
🔗 Link: ${link || "Unavailable"}`;

  return `<article class="listing-alert-card">
    <pre class="listing-output">${esc(output)}</pre>
    <div class="card-actions">
      ${link?`<a class="ghost small" target="_blank" rel="noopener" href="${esc(link)}">Open source</a>`:""}
      <button class="ghost small" type="button" data-copy-text="${esc(output)}">Copy message</button>
      ${id?`<button class="ghost small" type="button" data-copy="${esc(id)}">Copy ID</button>`:""}
    </div>
    <details class="raw"><summary>Case data</summary><pre>${esc(JSON.stringify(caseItem,null,2))}</pre></details>
  </article>`;
}

function wireCopyButtons(){
  document.querySelectorAll("[data-copy], [data-copy-text]").forEach(btn=>{
    btn.onclick=async()=>{
      try{
        await navigator.clipboard.writeText(btn.dataset.copyText || btn.dataset.copy || "");
        toast("Copied");
      }catch{
        toast("Copy failed");
      }
    };
  });
}
function renderResults(items=currentResults()){
  const box=$("resultsBox");
  if(!box)return;
  if(!items.length){
    box.className="empty-state";
    box.innerHTML=`<div class="empty-icon">⌕</div><h4>No results yet</h4><p>Start a scan to populate this workspace.</p>`;
    return;
  }
  box.className="cards";
  box.innerHTML=items.map(card).join("");
  wireCopyButtons();
}
function renderCases(){
  const box=$("casesBox");
  if(!box)return;
  const list=cases();
  if(!list.length){
    box.className="empty-state small-empty";
    box.innerHTML=`<div class="empty-icon">□</div><h4>No saved cases</h4><p>Matched listings will appear here after scanning.</p>`;
    return;
  }
  box.className="cards";
  box.innerHTML=list.map(card).join("");
  wireCopyButtons();
}
function updateStats(){
  if($("statMatches"))$("statMatches").textContent=String(currentResults().length);
  if($("statCases"))$("statCases").textContent=String(cases().length);
  if($("statLastScan"))$("statLastScan").textContent=safeLocalGet("wrota.lastScan","—");
}
async function testKey(){
  setStatus("Testing","warn");
  if($("testBtn"))$("testBtn").disabled=true;
  try{
    await lztGet("/fortnite",{page:1,order_by:"pdate_to_down_upload",currency:"usd"});
    setStatus("Connected","ok");
    toast("Key accepted");
  }catch(error){
    setStatus(error.message==="Rate limited"?"Rate limited":"Check failed","bad");
    toast(error.message==="Rate limited"?"Rate limited. Try again later.":`Key test failed: ${error.message}`);
  }finally{
    if($("testBtn"))$("testBtn").disabled=false;
  }
}
async function scan(){
  const pages=Math.max(1,Math.min(25,Number($("pagesPerFilter")?.value||2)));
  const delay=Math.max(500,Math.min(15000,Number($("requestDelay")?.value||2500)));
  const stopOn429=Boolean($("stopOn429")?.checked);
  const total=OG_FILTERS.length*pages;
  let done=0;
  const found=new Map();
  const errors=[];

  saveCurrentResults([]);
  renderResults([]);
  setStatus("Scanning","warn");
  if($("scanBtn"))$("scanBtn").disabled=true;
  setSubtitle("Scanning filtered OG cosmetics.");

  try{
    for(const filter of OG_FILTERS){
      for(let page=1;page<=pages;page++){
        try{
          const data=await lztGet("/fortnite",paramsForFilter(filter,page));
          const items=extractItems(data);
          for(const item of items){
            if(!isRealListing(item)) continue;
            const id=listingId(item);
            if(!id) continue;
            const existing=found.get(id)||item;
            existing._matchedFilters=[...new Set([...(existing._matchedFilters||[]),filter.label])];
            found.set(id,existing);
          }
          done++;
          progress(done,total,`${filter.label} · page ${page}`);
          if(!items.length)break;
          await sleep(delay);
        }catch(error){
          errors.push({filter:filter.label,page,error:error.message});
          done++;
          progress(done,total,`${filter.label} · error`);
          if(error.isRateLimit && stopOn429)throw error;
          await sleep(delay);
        }
      }
    }

    const summaries=[...found.values()].map(item=>{
      const base=fieldSet(item);
      base.matched_filters=item._matchedFilters||[];
      return compactCase(base);
    });
    saveCurrentResults(summaries);
    renderResults(currentResults());

    const detailed=[];
    let n=0;
    for(const [id,item] of found.entries()){
      n++;
      progress(n,found.size||1,`Preparing results ${n}/${found.size}`);
      const d=await detail(id,item);
      const base=fieldSet(item,d);
      base.matched_filters=item._matchedFilters||[];
      detailed.push(compactCase(base));
      saveCurrentResults(detailed.concat(summaries.slice(detailed.length)));
      renderResults(currentResults());
      await sleep(Math.min(delay,1500));
    }

    const finalResults=currentResults();
    const old=cases();
    const seen=new Set(old.map(c=>String(c.item_id)));
    for(const result of finalResults){
      if(result.item_id&&!seen.has(String(result.item_id))){
        old.unshift(result);
        seen.add(String(result.item_id));
      }
    }
    saveCases(old);

    const stamp=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    safeLocalSet("wrota.lastScan",stamp);
    updateStats();
    setSubtitle(finalResults.length ? (errors.length?`Completed with ${errors.length} issue(s).`:"Scan complete.") : "No real numeric LZT listings found for those OG filters.");
    setStatus(`Done · ${finalResults.length} found`,"ok");
  }catch(error){
    if(error.isRateLimit){
      setStatus("Rate limited","bad");
      setSubtitle("Rate limit reached. Lower depth or raise delay before scanning again.");
      toast("Rate limited. Stop scanning for a while.");
    }else{
      setStatus("Scan failed","bad");
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
  a.href=url;
  a.download=filename;
  a.click();
  URL.revokeObjectURL(url);
}
function bind(){
  $("accessForm")?.addEventListener("submit",event=>{event.preventDefault();testKey();});
  if($("toggleKey"))$("toggleKey").onclick=()=>{
    const input=$("apiToken");
    if(!input)return;
    const showing=input.type==="text";
    input.type=showing?"password":"text";
    $("toggleKey").textContent=showing?"Show":"Hide";
  };
  if($("clearKeyBtn"))$("clearKeyBtn").onclick=()=>{if($("apiToken"))$("apiToken").value="";setStatus("Not connected","idle");toast("Cleared for this page");};
  if($("testBtn"))$("testBtn").onclick=testKey;
  if($("scanBtn"))$("scanBtn").onclick=scan;
  if($("exportResultsBtn"))$("exportResultsBtn").onclick=()=>downloadJson("wrota-results.json",currentResults());
  if($("exportCasesBtn"))$("exportCasesBtn").onclick=()=>downloadJson("wrota-cases.json",cases());
  if($("clearCasesBtn"))$("clearCasesBtn").onclick=()=>{saveCases([]);renderCases();toast("Cases cleared");};
}
function init(){
  try{
    loadCases();
    renderFilters();
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

window.addEventListener("error",event=>{
  console.error(event.error||event.message);
  setStatus("Load issue","bad");
  setSubtitle(event.message||"Script issue");
});
window.addEventListener("unhandledrejection",event=>{
  console.error(event.reason);
  setStatus("Request issue","bad");
  setSubtitle(event?.reason?.message||String(event.reason||"Request issue"));
});

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
else init();
