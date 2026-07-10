const DEFAULT_PROXY_URL="https://shiny-shape-49fd.flruming.workers.dev";
const API_BASE="https://prod-api.lzt.market";
const CASES_KEY="wrota.polished.cases.v1";
const RESULTS_KEY="wrota.polished.results.v1";
let MEMORY_RESULTS=[];

const OG_FILTERS=[
  {label:"OG Renegade Raider",group:"Skin",param:"skin[]",id:"028_athena_commando_f",aliases:["og renegade raider","renegade raider"]},
  {label:"Purple Skull Trooper",group:"OG Style",param:"skin[]",id:"030_athena_commando_m_halloween_og",aliases:["og skull trooper","purple skull"]},
  {label:"Pink Ghoul Trooper",group:"OG Style",param:"skin[]",id:"029_athena_commando_f_halloween_og",aliases:["og ghoul trooper","pink ghoul"]},
  {label:"OG Aerial Assault Trooper",group:"Skin",param:"skin[]",id:"017_athena_commando_m",aliases:["og aerial assault trooper","aerial assault trooper"]},
  {label:"Raider's Revenge",group:"Pickaxe",param:"pickaxe[]",id:"pickaxe_id_027_scavenger",aliases:["og raiders revenge","raider's revenge","raiders revenge"]}
];

const $=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));

function token(){return $("apiToken").value.trim();}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

function setStatus(text,type="idle"){
  $("status").textContent=text;
  $("sessionState").textContent=text;
  const dot=$("statusDot");
  dot.className=`dot ${type}`;
}

function toast(text){
  const el=document.createElement("div");
  el.className="toast";
  el.textContent=text;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),3200);
}

function getJson(key, fallback){
  try{return JSON.parse(localStorage.getItem(key)||"null") ?? fallback;}
  catch{return fallback;}
}
function setJson(key,value){
  if(key===RESULTS_KEY){
    MEMORY_RESULTS = Array.isArray(value) ? value.map(compactCase) : [];
    return;
  }

  const compact = Array.isArray(value) ? value.map(compactCase).slice(0,100) : value;

  try{
    localStorage.setItem(key,JSON.stringify(compact));
  }catch(error){
    try{
      localStorage.removeItem(RESULTS_KEY);
      localStorage.removeItem("wrota.polished.results.v1");
      localStorage.removeItem("wrota.results");
      const smaller = Array.isArray(compact) ? compact.slice(0,50) : compact;
      localStorage.setItem(key,JSON.stringify(smaller));
      toast("Browser storage was full, so older saved cases were trimmed.");
    }catch(secondError){
      try{ localStorage.removeItem(key); }catch{}
      toast("Browser storage is full. Results are shown for this session only.");
    }
  }
}
function cases(){return getJson(CASES_KEY,[]).map(compactCase).slice(0,100);}
function saveCases(list){setJson(CASES_KEY,(Array.isArray(list)?list:[]).map(compactCase).slice(0,100)); updateStats();}
function currentResults(){return MEMORY_RESULTS;}
function saveCurrentResults(list){
  MEMORY_RESULTS = Array.isArray(list) ? list.map(compactCase) : [];
  updateStats();
}

function trimLegacyStorage(){
  try{
    localStorage.removeItem(RESULTS_KEY);
    localStorage.removeItem("wrota.polished.results.v1");
    localStorage.removeItem("wrota.results");
  }catch{}
  try{
    const list=getJson(CASES_KEY,[]);
    if(Array.isArray(list)){
      const compact=list.map(compactCase).slice(0,100);
      localStorage.setItem(CASES_KEY,JSON.stringify(compact));
    }
  }catch{
    try{localStorage.removeItem(CASES_KEY);}catch{}
  }
}

function renderFilters(){
  $("filterCount").textContent=`${OG_FILTERS.length} active`;
  $("filterGrid").innerHTML=OG_FILTERS.map(f=>`
    <article class="filter-card">
      <strong>${esc(f.label)}</strong>
      <span>${esc(f.group)}</span>
    </article>
  `).join("");
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
  try{
    return await fetch(url,{...options,signal:controller.signal});
  }catch(error){
    if(error.name==="AbortError")throw new Error("Request timed out");
    throw error;
  }finally{
    clearTimeout(timer);
  }
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
      headers:{
        "Accept":"application/json",
        "X-LZT-Key":token()
      }
    },45000);
  }catch(error){
    throw new Error("Connection failed");
  }

  if(response.status===401||response.status===403)throw new Error("API key rejected");
  if(response.status===429){
    const err=new Error("Rate limited");
    err.isRateLimit=true;
    throw err;
  }
  if(!response.ok)throw new Error(`${response.status} response`);

  const text=await response.text();
  try{return JSON.parse(text);}
  catch{return {raw:text};}
}

function extractItems(data){
  const seen=new Set();
  const out=[];
  function walk(value){
    if(!value)return;
    if(Array.isArray(value)){value.forEach(walk);return;}
    if(typeof value==="object"){
      const id=itemId(value);
      const hasListingShape=id&&(value.title||value.price||value.item_id||value.itemId||value.account_id||value.url);
      if(hasListingShape&&!seen.has(id)){
        seen.add(id);
        out.push(value);
      }
      for(const [key,next] of Object.entries(value)){
        if(["items","data","results","list","accounts","market_items"].includes(key)||Array.isArray(next))walk(next);
      }
    }
  }
  walk(data);
  return out;
}

function itemId(item){
  return String(item?.item_id ?? item?.itemId ?? item?.id ?? item?.account_id ?? item?.accountId ?? "");
}

function textFrom(value){
  const seen=new WeakSet();
  function walk(v){
    if(v===null||v===undefined)return "";
    if(typeof v==="string"||typeof v==="number")return String(v);
    if(typeof v!=="object")return "";
    if(seen.has(v))return "";
    seen.add(v);
    return Object.values(v).map(walk).join(" ");
  }
  return walk(value).toLowerCase();
}

function fallbackMatches(summary,detail) {
  const t=textFrom({summary,detail});
  const matches=[];
  for(const f of OG_FILTERS){
    if((f.aliases||[]).some(a=>t.includes(a)))matches.push(f.label);
  }
  return matches;
}

function listingUrl(item) {
  const id=itemId(item);
  return item?.url || item?.link || item?.market_url || (id ? `https://lzt.market/${id}/` : "");
}

function fieldSet(summary,detail={}){
  const merged={...summary,...(detail?.item||detail?.data||detail||{})};
  const id=itemId(merged)||itemId(summary)||itemId(detail);
  const price=merged.price ?? merged.price_usd ?? merged.cost ?? merged.amount ?? "";
  const currency=(merged.currency || merged.price_currency || "USD").toString().toUpperCase();
  const seller=merged.seller?.username || merged.seller?.name || merged.user?.username || merged.username || "";
  return {
    item_id:id,
    title:merged.title || merged.name || merged.item_title || `Listing ${id||""}`.trim(),
    price:price,
    currency:currency,
    seller:seller,
    url:listingUrl(merged)||listingUrl(summary),
    created_at:merged.created_at || merged.published_at || merged.uploaded_at || merged.date || "",
  };
}

async function detail(id,fallback){
  if(!$("fetchDetails").checked)return {summary_only:fallback, skipped:true};
  if(!/^\d+$/.test(String(id)))return {summary_only:fallback, skipped:true};
  try{return await lztGet(`/${id}`);}
  catch(error){return {summary_only:fallback,error:error.message};}
}

function paramsForFilter(filter,page){
  const params={page,order_by:"pdate_to_down_upload",currency:"usd"};
  params[filter.param]=filter.id;
  return params;
}

function progress(done,total,label){
  const pct=total?Math.round((done/total)*100):0;
  $("progressWrap").classList.remove("hidden");
  $("progressLabel").textContent=label;
  $("progressNumber").textContent=`${pct}%`;
  $("progressBar").style.width=`${pct}%`;
}

function card(caseItem){
  const tags=(caseItem.matched_filters||caseItem.matched_terms||[]).map(t=>`<span class="match">${esc(t)}</span>`).join("");
  const price=caseItem.price!==""&&caseItem.price!==undefined?`${esc(caseItem.price)} ${esc(caseItem.currency||"")}`:"Price unavailable";
  const source=caseItem.url?`<a class="ghost small" target="_blank" rel="noopener" href="${esc(caseItem.url)}">Open source</a>`:"";
  return `
    <article class="case-card">
      <div class="card-top">
        <div>
          <h4 class="card-title">${esc(caseItem.title)}</h4>
          <div class="card-meta">
            <span class="meta-pill">ID ${esc(caseItem.item_id||"—")}</span>
            <span class="meta-pill">${price}</span>
            ${caseItem.seller?`<span class="meta-pill">Seller ${esc(caseItem.seller)}</span>`:""}
          </div>
        </div>
      </div>
      <div class="match-list">${tags||'<span class="meta-pill">Filter match</span>'}</div>
      <div class="card-actions">
        ${source}
        <button class="ghost small" type="button" data-copy="${esc(caseItem.item_id)}">Copy ID</button>
      </div>
      <details class="raw">
        <summary>Evidence data</summary>
        <pre>${esc(JSON.stringify(caseItem,null,2))}</pre>
      </details>
    </article>
  `;
}

function renderResults(items=currentResults()){
  if(!items.length){
    $("resultsBox").className="empty-state";
    $("resultsBox").innerHTML=`<div class="empty-icon">⌕</div><h4>No results yet</h4><p>Start a scan to populate this workspace.</p>`;
    return;
  }
  $("resultsBox").className="cards";
  $("resultsBox").innerHTML=items.map(card).join("");
  wireCopyButtons();
}

function renderCases(){
  const list=cases();
  if(!list.length){
    $("casesBox").className="empty-state small-empty";
    $("casesBox").innerHTML=`<div class="empty-icon">□</div><h4>No saved cases</h4><p>Matched listings will appear here after scanning.</p>`;
    return;
  }
  $("casesBox").className="cards";
  $("casesBox").innerHTML=list.map(card).join("");
  wireCopyButtons();
}

function wireCopyButtons(){
  document.querySelectorAll("[data-copy]").forEach(btn=>{
    btn.onclick=async()=>{
      await navigator.clipboard.writeText(btn.dataset.copy||"");
      toast("Copied");
    };
  });
}

function updateStats(){
  $("statMatches").textContent=String(currentResults().length);
  $("statCases").textContent=String(cases().length);
  $("statLastScan").textContent=localStorage.getItem("wrota.lastScan")||"—";
}

async function testKey(){
  setStatus("Testing","warn");
  $("testBtn").disabled=true;
  try{
    await lztGet("/fortnite",{page:1,order_by:"pdate_to_down_upload",currency:"usd"});
    setStatus("Connected","ok");
    toast("Key accepted");
  }catch(error){
    setStatus(error.message==="Rate limited"?"Rate limited":"Check failed","bad");
    toast(error.message==="Rate limited"?"Rate limited. Try again later.":`Key test failed: ${error.message}`);
  }finally{
    $("testBtn").disabled=false;
  }
}

async function scan(){
  const pages=Math.max(1,Math.min(25,Number($("pagesPerFilter").value||2)));
  const delay=Math.max(500,Math.min(15000,Number($("requestDelay").value||2500)));
  const stopOn429=$("stopOn429").checked;

  const total=OG_FILTERS.length*pages;
  let done=0;
  const found=new Map();
  const errors=[];

  saveCurrentResults([]);
  renderResults([]);
  setStatus("Scanning","warn");
  $("scanBtn").disabled=true;
  $("resultsSubtitle").textContent="Scanning filtered OG cosmetics.";

  try{
    for(const filter of OG_FILTERS){
      for(let page=1;page<=pages;page++){
        try{
          const data=await lztGet("/fortnite",paramsForFilter(filter,page));
          const items=extractItems(data);

          for(const item of items){
            const id=itemId(item);
            if(!id)continue;
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

    const summaries=[...found.entries()].map(([id,item])=>{
      const f=fieldSet(item);
      return {
        createdAt:new Date().toISOString(),
        ...f,
        matched_filters:item._matchedFilters||fallbackMatches(item,{}),
        raw:{summary:item}
      };
    });

    saveCurrentResults(summaries.slice(0,300));
    renderResults(summaries);

    const detailed=[];
    let n=0;
    for(const [id,item] of found.entries()){
      n++;
      progress(n,found.size||1,`Preparing results ${n}/${found.size}`);
      const d=await detail(id,item);
      const f=fieldSet(item,d);
      detailed.push({
        createdAt:new Date().toISOString(),
        ...f,
        matched_filters:item._matchedFilters||fallbackMatches(item,d),
        raw:{summary:item,detail:d}
      });
      saveCurrentResults(detailed.concat(summaries.slice(detailed.length)).slice(0,300));
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

    const stamp=new Date().toLocaleString([],{hour:"2-digit",minute:"2-digit"});
    localStorage.setItem("wrota.lastScan",stamp);
    $("statLastScan").textContent=stamp;
    $("resultsSubtitle").textContent=errors.length?`Completed with ${errors.length} issue(s).`:"Scan complete.";
    setStatus(`Done · ${finalResults.length} found`,"ok");
  }catch(error){
    if(error.isRateLimit){
      setStatus("Rate limited","bad");
      $("resultsSubtitle").textContent="Rate limit reached. Lower depth or raise delay before scanning again.";
      toast("Rate limited. Stop scanning for a while.");
    }else{
      setStatus("Scan failed","bad");
      $("resultsSubtitle").textContent=error.message;
      toast(`Scan failed: ${error.message}`);
    }
  }finally{
    $("scanBtn").disabled=false;
    $("progressWrap").classList.add("hidden");
    updateStats();
  }
}

function downloadJson(filename,data){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=filename;
  a.click();
  URL.revokeObjectURL(url);
}

function bind(){
  $("accessForm").addEventListener("submit", event=>{
    event.preventDefault();
    testKey();
  });
  $("toggleKey").onclick=()=>{
    const input=$("apiToken");
    const showing=input.type==="text";
    input.type=showing?"password":"text";
    $("toggleKey").textContent=showing?"Show":"Hide";
  };
  $("clearKeyBtn").onclick=()=>{$("apiToken").value="";setStatus("Not connected","idle");toast("Cleared for this page");};
  $("testBtn").onclick=testKey;
  $("scanBtn").onclick=scan;
  $("exportResultsBtn").onclick=()=>downloadJson("wrota-results.json",currentResults());
  $("exportCasesBtn").onclick=()=>downloadJson("wrota-cases.json",cases());
  $("clearCasesBtn").onclick=()=>{saveCases([]);renderCases();toast("Cases cleared");};
}

window.addEventListener("error",event=>{
  setStatus("Script error","bad");
  $("resultsSubtitle").textContent=event.message;
});

window.addEventListener("unhandledrejection",event=>{
  setStatus("Request error","bad");
  $("resultsSubtitle").textContent=event?.reason?.message||String(event.reason||"Unknown error");
});

trimLegacyStorage();
renderFilters();
renderResults();
renderCases();
updateStats();
bind();
