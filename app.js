const DEFAULT_PROXY_URL="https://shiny-shape-49fd.flruming.workers.dev";
const DEFAULT_TERMS=[
"og renegade raider",
"og skull trooper",
"purple skull",
"og ghoul trooper",
"pink ghoul",
"og aerial assault trooper",
"og aerial assault",
"og raiders revenge",
"raider's revenge"
];

const DEFAULT_COSMETIC_FILTERS = [
  {
    label: "OG Renegade Raider",
    type: "skin",
    param: "skin[]",
    id: "028_athena_commando_f",
    aliases: ["og renegade raider"]
  },
  {
    label: "OG Skull Trooper Style / Purple Skull",
    type: "skin",
    param: "skin[]",
    id: "030_athena_commando_m_halloween_og",
    aliases: ["og skull trooper", "purple skull"]
  },
  {
    label: "OG Ghoul Trooper Style / Pink Ghoul",
    type: "skin",
    param: "skin[]",
    id: "029_athena_commando_f_halloween_og",
    aliases: ["og ghoul trooper", "pink ghoul"]
  },
  {
    label: "OG Aerial Assault Trooper",
    type: "skin",
    param: "skin[]",
    id: "017_athena_commando_m",
    aliases: ["og aerial assault trooper", "og aerial assault"]
  },
  {
    label: "OG Raider's Revenge",
    type: "pickaxe",
    param: "pickaxe[]",
    id: "pickaxe_id_027_scavenger",
    aliases: ["og raiders revenge", "raider's revenge"]
  }
];

const K={terms:"wrota_lzt_terms_v1",cases:"wrota_lzt_cases_v1"};
const $=id=>document.getElementById(id);
let sessionKey="";

function esc(s){return String(s??"").replace(/[&<>'"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[m]));}
function terms(){try{return JSON.parse(localStorage.getItem(K.terms))||DEFAULT_TERMS}catch{return DEFAULT_TERMS}}
function saveTerms(t){localStorage.setItem(K.terms,JSON.stringify([...new Set(t.map(x=>x.trim().toLowerCase()).filter(Boolean))]));}
function cases(){try{return JSON.parse(localStorage.getItem(K.cases))||[]}catch{return[]}}
function saveCases(c){localStorage.setItem(K.cases,JSON.stringify(c.slice(0,500)));}
function key(){const t=$("apiToken").value.trim(); if(t) sessionKey=t; return sessionKey;}
function badge(t,cls=""){$("badge").textContent=t;$("badge").className="badge "+cls;}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

function renderTerms(){
  $("watchlistBox").innerHTML="";

  for(const filter of defaultCosmeticFilters()){
    const chip=document.createElement("span");
    chip.className="term";
    chip.innerHTML=`${esc(filter.label)} <small>${esc(filter.param)}=${esc(filter.id)}</small>`;
    $("watchlistBox").appendChild(chip);
  }

  const customTerms = terms().filter(t => !DEFAULT_TERMS.includes(t));
  for(const term of customTerms){
    const chip=document.createElement("span");
    chip.className="term";
    chip.innerHTML=`${esc(term)} <button title="Remove">×</button>`;
    chip.querySelector("button").onclick=()=>{saveTerms(terms().filter(t=>t!==term));renderTerms();};
    $("watchlistBox").appendChild(chip);
  }
}

function flatten(obj){
  const out=[];
  function walk(v){
    if(Array.isArray(v)) v.forEach(walk);
    else if(v&&typeof v==="object") Object.entries(v).forEach(([k,val])=>{out.push(k);walk(val);});
    else if(v!==undefined&&v!==null) out.push(String(v));
  }
  walk(obj); return out.join(" ").toLowerCase();
}
function matched(obj){const text=typeof obj==="string"?obj.toLowerCase():flatten(obj);return terms().filter(t=>text.includes(t));}
function extractItems(data){
  if(Array.isArray(data?.items))return data.items;
  if(Array.isArray(data?.data))return data.data;
  if(Array.isArray(data?.results))return data.results;
  const found=[];
  function walk(v){
    if(Array.isArray(v)){
      const ds=v.filter(x=>x&&typeof x==="object"&&!Array.isArray(x));
      if(ds.length&&ds.some(x=>"item_id"in x||"title"in x||"price"in x)) found.push(...ds);
      v.forEach(walk);
    } else if(v&&typeof v==="object") Object.values(v).forEach(walk);
  }
  walk(data); return found;
}
function path(obj,p){return p.split(".").reduce((a,k)=>(a&&typeof a==="object")?a[k]:undefined,obj);}
function pick(obj,paths,def="Unknown"){for(const p of paths){const v=path(obj,p);if(v!==undefined&&v!==null&&v!==""&&!(Array.isArray(v)&&!v.length))return v;}return def;}
function itemId(item){return String(pick(item,["item_id","item.item_id","id"],"")||"");}
function merge(a,b){const c={}; if(a&&typeof a==="object")Object.assign(c,a); if(b&&typeof b==="object"){if(b.item&&typeof b.item==="object")Object.assign(c,b.item); if(b.data&&typeof b.data==="object"&&!Array.isArray(b.data))Object.assign(c,b.data); Object.assign(c,b);} return c;}
function fmtTime(v){const n=Number(v); if(Number.isFinite(n)&&n>1000000000)return new Date(n*1000).toISOString().replace("T"," ").replace(".000Z"," UTC"); return String(v??"Unknown");}
function short(v){let s=typeof v==="object"?JSON.stringify(v):String(v??"Unknown");s=s.replace(/\s+/g," ").trim();return s.length>450?s.slice(0,447)+"...":s;}

function fields(summary,detail){
  const c=merge(summary,detail), id=itemId(summary)||itemId(c)||"Unknown";
  const price=pick(c,["price","item.price","price_with_fee","cost","amount"]);
  const cur=pick(c,["currency","item.currency"],"");
  return {
    item_id:short(id), listing_url:/^\d+$/.test(id)?`https://lzt.market/${id}/`:"Unknown",
    title:short(pick(c,["title","item.title","item_title","name"])),
    seller:short(pick(c,["seller.username","seller.name","seller_user.username","seller_username","username","user.username","user"])),
    price:short(`${price} ${cur}`.trim()),
    skin_count:short(pick(c,["skin_count","skins_count","fortnite_skin_count","fortnite_skins_count","skins.total","item.skin_count"])),
    email_changeable:short(pick(c,["change_email","can_change_email","email_changeable","item.change_email","fortnite_change_email"])),
    level:short(pick(c,["level","fortnite_level","season_level","account_level","item.level"])),
    country:short(pick(c,["country","item.country","origin_country","account_country"])),
    last_activity:fmtTime(pick(c,["last_activity","fortnite_last_activity","account_last_activity","item.last_activity"])),
    published:fmtTime(pick(c,["published_date","created_at","upload_date","item.published_date"])),
    vbucks:short(pick(c,["vbuck","vbucks","fortnite_vbucks","item.vbucks"]))
  };
}


async function fetchWithTimeout(url, options={}, timeoutMs=45000){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try{
    return await fetch(url, {...options, signal: controller.signal});
  }catch(e){
    if(e.name === "AbortError") throw new Error("Request timed out after 45s");
    throw e;
  }finally{
    clearTimeout(timer);
  }
}

async function lztGet(p,params={}){
  const k=key(); if(!k)throw new Error("Paste your LZT API key first.");
  const base=$("apiBase").value.trim().replace(/\/+$/,"");
  const proxy=DEFAULT_PROXY_URL.replace(/\/+$/,"");
  const direct=new URL(base+p);
  Object.entries(params).forEach(([x,v])=>{
    if(v===undefined||v===null||v==="") return;
    if(Array.isArray(v)) v.forEach(one => direct.searchParams.append(x, one));
    else direct.searchParams.append(x, v);
  });
  let url=direct.toString(), opts={method:"GET",headers:{Authorization:`Bearer ${k}`,Accept:"application/json"}};
  if(proxy){
    const u=new URL(proxy+"/proxy"); u.searchParams.set("url",direct.toString());
    url=u.toString(); opts={method:"GET",headers:{"X-LZT-Key":k,"X-LZT-Token":k,Accept:"application/json"}};
  }
  let res;
  try{res=await fetchWithTimeout(url,opts,45000);}catch(e){throw new Error("Load failed. This is usually CORS. Add your Cloudflare Worker proxy URL, then try again.");}
  if(res.status===401)throw new Error("401 from LZT. API key invalid/expired.");
  if(res.status===429){const retry=res.headers.get("Retry-After")||res.headers.get("X-RateLimit-Reset")||""; const msg=retry?`429 from LZT. Rate limited. Retry/reset: ${retry}`:"429 from LZT. Rate limited."; const err=new Error(msg); err.isRateLimit=true; throw err;}
  if(!res.ok)throw new Error(`Request failed: HTTP ${res.status}`);
  return await res.json();
}

async function testKey(){
  $("status").textContent="Testing key...";
  try{
    const data=await lztGet($("categoryPath").value.trim(),{page:1,order_by:$("orderBy").value.trim(),currency:$("currency").value.trim()});
    $("status").textContent=`Key works. First page returned ${extractItems(data).length} item(s).`;
  }catch(e){$("status").textContent = String(e.message).includes("429")
      ? "Key test hit LZT rate limit. The key may still be valid. Stop scanning for a while, then test again with lower pages/delay."
      : "Key test failed: " + e.message;}
}

async function detail(id,fallback){
  if(!/^\d+$/.test(String(id))) return {error:"No numeric item id",summary_only:fallback};
  try{
    return await lztGet(`/${id}`);
  }catch(e){
    return {error:"Detail fetch failed or timed out",exception:e.message,summary_only:fallback};
  }
}

async function scan(){
  const pagesPerFilter=Math.max(1,Math.min(25,Number($("pagesPerTerm")?.value||2)));
  const newestPages=Math.max(0,Math.min(25,Number($("newestPages")?.value||1)));
  const requestDelay=Math.max(500,Math.min(15000,Number($("requestDelay")?.value||2500)));
  const stopOn429=Boolean($("stopOn429")?.checked);

  const filters=defaultCosmeticFilters();
  const found=new Map(), errors=[];
  const totalSearches=(filters.length*pagesPerFilter)+newestPages;
  let completed=0;

  function progress(label){
    completed++;
    badge(`Scanning ${completed}/${totalSearches}`,"warn");
    $("results").innerHTML=`<p class='empty'>${esc(label)}<br>Using LZT cosmetic filters like <code>skin[]=...</code>, not title search.</p>`;
  }

  badge("Scanning...","warn");
  $("results").innerHTML="<p class='empty'>Starting cosmetic-filter scan. Keep this tab open.</p>";

  // Search using LZT cosmetic filters: skin[]=ID / pickaxe[]=ID.
  // This avoids title-only hits and targets accounts that actually match the selected cosmetic filter.
  for(const filter of filters){
    for(let page=1; page<=pagesPerFilter; page++){
      try{
        const data=await lztGet($("categoryPath").value.trim(), searchParamsForCosmeticFilter(filter, page));
        const items=extractItems(data);

        for(const item of items){
          const id=itemId(item);
          if(!id) continue;

          // Because this came from a skin[]/pickaxe[] filter, keep it even if the title doesn't mention the skin.
          const existing=found.get(id) || item;
          existing._wrotaMatchedFilters = [...new Set([...(existing._wrotaMatchedFilters || []), filter.label])];
          existing._wrotaExpectedAliases = [...new Set([...(existing._wrotaExpectedAliases || []), ...expectedAliasesForFilter(filter)])];
          found.set(id, existing);
        }

        progress(`${filter.label} · ${filter.param}=${filter.id} · page ${page}/${pagesPerFilter} · found ${found.size} unique match(es)`);

        if(!items.length) break;
        await sleep(requestDelay);
      }catch(e){
        errors.push({filter:filter.label,param:filter.param,id:filter.id,page,error:e.message});
        progress(`Error on ${filter.label} · page ${page}`);

        if((e.isRateLimit || String(e.message).includes("429")) && stopOn429){
          renderResults([], errors);
          badge("Rate limited", "warn");
          $("results").innerHTML += "<p class='empty'>LZT rate-limited this key/IP. Lower pages, raise Delay ms, then try again later.</p>";
          return;
        }

        await sleep(requestDelay);
      }
    }
  }

  // Optional newest page check remains only as a safety net, using existing text watchlist.
  // Set Newest pages to 0 if you want cosmetic-filter-only scans.
  for(let page=1; page<=newestPages; page++){
    try{
      const data=await lztGet($("categoryPath").value.trim(),{
        page,
        order_by:$("orderBy").value.trim(),
        currency:$("currency").value.trim()
      });

      const items=extractItems(data);
      for(const item of items){
        const id=itemId(item);
        if(id&&matched(item).length){
          item._wrotaMatchedFilters = [...new Set([...(item._wrotaMatchedFilters || []), ...matched(item)])];
          found.set(id,item);
        }
      }

      progress(`Newest safety check · page ${page}/${newestPages} · found ${found.size} unique match(es)`);

      if(!items.length) break;
      await sleep(requestDelay);
    }catch(e){
      errors.push({filter:"newest safety check",page,error:e.message});
      progress(`Error on newest safety check · page ${page}`);

      if((e.isRateLimit || String(e.message).includes("429")) && stopOn429){
        renderResults([], errors);
        badge("Rate limited", "warn");
        $("results").innerHTML += "<p class='empty'>LZT rate-limited this key/IP. Lower pages, raise Delay ms, then try again later.</p>";
        return;
      }

      await sleep(requestDelay);
    }
  }

  const results=[];
  let detailed=0;

  for(const [id,item] of found.entries()){
    detailed++;
    badge(`Loading details ${detailed}/${found.size}`,"warn");
    $("results").innerHTML=`<p class='empty'>Fetching full details for ${detailed}/${found.size} matched listing(s). Already loaded ${results.length}.</p>` + (results.length ? results.map(c=>card(c,"result")).join("") : "");

    let d;
    try{
      d=await detail(id,item);
    }catch(e){
      d={error:"Detail fetch failed or timed out",exception:e.message,summary_only:item};
    }

    const textMatches=[...matched(item), ...matched(d)];
    const filterMatches=[...(item._wrotaMatchedFilters || [])];
    const m=[...new Set([...filterMatches, ...textMatches])].sort();

    results.push({createdAt:new Date().toISOString(),...fields(item,d),matched_terms:m,raw:{summary:item,detail:d,matched_filters:filterMatches}});

    // Render after every item so it never appears stuck on the last detail.
    $("results").innerHTML=results.map(c=>card(c,"result")).join("");

    await sleep(Math.min(requestDelay, 1500));
  }

  const old=cases(), seen=new Set(old.map(c=>c.item_id));
  for(const r of results)if(!seen.has(r.item_id))old.unshift(r);
  saveCases(old);

  renderResults(results,errors);
  renderCases();
}

function report(c){
  const m=(c.matched_terms||[]).map(x=>"• "+x).join("\\n")||"• None";
  return `🚩 Suspected Fortnite Account-Sale Violation

🏷️ Title: ${c.title}
👤 Seller: ${c.seller}
💵 Listed Price: ${c.price}
🎮 Skin Count: ${c.skin_count}
💰 V-Bucks: ${c.vbucks}

⭐ Matched Rare / OG Terms:
${m}

📧 Email Changeable: ${c.email_changeable}
🔢 Level / Season Level: ${c.level}
🌍 Country: ${c.country}
⏱️ Last Activity: ${c.last_activity}
🕒 Published / Uploaded: ${c.published}

🆔 LZT Item ID: ${c.item_id}
🔗 Listing URL: ${c.listing_url}`;
}

function card(c,type="result"){
  return `<article class="${type}"><h3>${esc(c.title)}</h3><div class="meta">
  <div><strong>Seller:</strong> ${esc(c.seller)}</div><div><strong>Price:</strong> ${esc(c.price)}</div>
  <div><strong>Skin Count:</strong> ${esc(c.skin_count)}</div><div><strong>Email:</strong> ${esc(c.email_changeable)}</div>
  <div><strong>Country:</strong> ${esc(c.country)}</div><div><strong>Level:</strong> ${esc(c.level)}</div>
  </div><p><strong>Matched:</strong> ${esc((c.matched_terms||[]).join(", "))}</p>
  <p><a href="${esc(c.listing_url)}" target="_blank" rel="noreferrer">Open listing</a></p>
  <details><summary>Evidence report</summary><pre>${esc(report(c))}</pre></details></article>`;
}

function renderResults(results,errors=[]){
  let html=errors.length?`<pre>Errors:\\n${esc(JSON.stringify(errors,null,2))}</pre>`:"";
  if(!results.length){badge("0 results","warn");html+="<p class='empty'>No matches found.</p>";}
  else{badge(`Done · ${results.length} result(s)`,"ok");html+=results.map(c=>card(c,"result")).join("");}
  $("results").innerHTML=html;
}

function renderCases(){
  const cs=cases();
  $("casesBox").innerHTML=cs.length?cs.slice(0,100).map(c=>card(c,"case")).join(""):"<p class='empty'>No saved cases yet.</p>";
}

function download(name,text,type){const b=new Blob([text],{type});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=name;a.click();URL.revokeObjectURL(u);}

$("testBtn").onclick=testKey;
$("scanBtn").onclick=scan;
$("clearTokenBtn").onclick=()=>{$("apiToken").value="";sessionKey="";$("status").textContent="API key cleared from this tab.";};
$("addTermBtn").onclick=()=>{const t=$("newTerm").value.trim().toLowerCase();if(t){saveTerms([...terms(),t]);$("newTerm").value="";renderTerms();}};
$("newTerm").onkeydown=e=>{if(e.key==="Enter")$("addTermBtn").click();};
$("resetTermsBtn").onclick=()=>{saveTerms(DEFAULT_TERMS);renderTerms();};
$("exportJsonBtn").onclick=()=>download("wrota-lzt-cases.json",JSON.stringify(cases(),null,2),"application/json");
$("clearCasesBtn").onclick=()=>{if(confirm("Clear saved cases?")){saveCases([]);renderCases();}};
renderTerms(); renderCases();
