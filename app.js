const DEFAULT_TERMS = [
  "og renegade raider",
  "renegade raider",
  "og skull trooper",
  "skull trooper",
  "purple skull",
  "og ghoul trooper",
  "ghoul trooper",
  "pink ghoul",
  "og aerial assault",
  "aerial assault trooper",
  "aerial assault",
  "og raiders revenge",
  "raider's revenge",
  "raiders revenge",
  "raider revenge"
];

const STORAGE_KEYS = {
  terms: "lzt_static_terms_v2",
  cases: "lzt_static_cases_v2",
  theme: "lzt_static_theme_v2"
};

const el = (id) => document.getElementById(id);
let sessionToken = "";

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function loadTerms() {
  const raw = localStorage.getItem(STORAGE_KEYS.terms);
  if (!raw) return [...DEFAULT_TERMS];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_TERMS];
  } catch {
    return [...DEFAULT_TERMS];
  }
}

function saveTerms(terms) {
  localStorage.setItem(
    STORAGE_KEYS.terms,
    JSON.stringify([...new Set(terms.map(t => t.trim().toLowerCase()).filter(Boolean))])
  );
}

function loadCases() {
  const raw = localStorage.getItem(STORAGE_KEYS.cases);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCases(cases) {
  localStorage.setItem(STORAGE_KEYS.cases, JSON.stringify(cases.slice(0, 500)));
}

function getToken() {
  const typed = el("apiToken").value.trim();
  if (typed) sessionToken = typed;
  return sessionToken;
}

function apiBase() {
  return el("apiBase").value.trim().replace(/\/+$/, "");
}

function categoryPath() {
  const path = el("categoryPath").value.trim() || "/fortnite";
  return path.startsWith("/") ? path : `/${path}`;
}

async function lztGet(path, params = {}) {
  const token = getToken();
  if (!token) throw new Error("Paste your LZT API token first.");

  const url = new URL(apiBase() + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    }
  });

  if (res.status === 401) throw new Error("401 from LZT. Token is invalid/expired or needs rotating.");
  if (res.status === 429) throw new Error("429 from LZT. Rate limited. Wait and try again.");
  if (!res.ok) throw new Error(`LZT request failed: HTTP ${res.status}`);

  return await res.json();
}

function renderWatchlist() {
  const terms = loadTerms();
  const box = el("watchlist");
  box.innerHTML = "";

  for (const term of terms) {
    const chip = document.createElement("span");
    chip.className = "term";
    chip.innerHTML = `${escapeHtml(term)} <button title="Remove">×</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      saveTerms(loadTerms().filter(t => t !== term));
      renderWatchlist();
    });
    box.appendChild(chip);
  }
}

function flattenText(obj) {
  const parts = [];
  function walk(value) {
    if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (value && typeof value === "object") {
      Object.entries(value).forEach(([k, v]) => {
        parts.push(k);
        walk(v);
      });
    } else if (value !== null && value !== undefined) {
      parts.push(String(value));
    }
  }
  walk(obj);
  return parts.join(" ").toLowerCase();
}

function matchedTerms(obj) {
  const text = typeof obj === "string" ? obj.toLowerCase() : flattenText(obj);
  return loadTerms().filter(term => text.includes(term.toLowerCase()));
}

function extractItems(apiResponse) {
  if (Array.isArray(apiResponse?.items)) return apiResponse.items;
  if (Array.isArray(apiResponse?.data)) return apiResponse.data;
  if (Array.isArray(apiResponse?.results)) return apiResponse.results;

  const found = [];
  function walk(value) {
    if (Array.isArray(value)) {
      const dicts = value.filter(x => x && typeof x === "object" && !Array.isArray(x));
      if (dicts.length && dicts.some(x => "item_id" in x || "title" in x || "price" in x)) {
        found.push(...dicts);
      }
      value.forEach(walk);
    } else if (value && typeof value === "object") {
      Object.values(value).forEach(walk);
    }
  }
  walk(apiResponse);
  return found;
}

function getPath(obj, path) {
  let cur = obj;
  for (const part of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[part];
  }
  return cur;
}

function pick(obj, paths, fallback = "Unknown") {
  for (const path of paths) {
    const v = getPath(obj, path);
    if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length)) return v;
  }
  return fallback;
}

function itemIdOf(item) {
  return String(pick(item, ["item_id", "item.item_id", "id"], "") || "");
}

function mergeForDisplay(summary, detail) {
  const combined = {};
  if (summary && typeof summary === "object") Object.assign(combined, summary);
  if (detail && typeof detail === "object") {
    if (detail.item && typeof detail.item === "object") Object.assign(combined, detail.item);
    if (detail.data && typeof detail.data === "object" && !Array.isArray(detail.data)) Object.assign(combined, detail.data);
    Object.assign(combined, detail);
  }
  return combined;
}

function short(value, limit = 450) {
  let text = typeof value === "object" ? JSON.stringify(value) : String(value ?? "Unknown");
  text = text.replace(/\s+/g, " ").trim();
  return text.length <= limit ? text : text.slice(0, limit - 3) + "...";
}

function formatTimestamp(value) {
  if (!value || value === "Unknown") return "Unknown";
  const n = Number(value);
  if (Number.isFinite(n) && n > 1000000000) {
    return new Date(n * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC");
  }
  return String(value);
}

function displayFields(summary, detail) {
  const combined = mergeForDisplay(summary, detail);
  const itemId = itemIdOf(summary) || itemIdOf(combined) || "Unknown";
  const price = pick(combined, ["price", "item.price", "price_with_fee", "cost", "amount"]);
  const currency = pick(combined, ["currency", "item.currency"], "");

  return {
    item_id: short(itemId),
    listing_url: /^\d+$/.test(String(itemId)) ? `https://lzt.market/${itemId}/` : "Unknown",
    title: short(pick(combined, ["title", "item.title", "item_title", "name"])),
    seller: short(pick(combined, ["seller.username", "seller.name", "seller_user.username", "seller_username", "username", "user.username", "user"])),
    price: short(`${price} ${currency}`.trim()),
    skin_count: short(pick(combined, ["skin_count", "skins_count", "fortnite_skin_count", "fortnite_skins_count", "skins.total", "item.skin_count"])),
    email_changeable: short(pick(combined, ["change_email", "can_change_email", "email_changeable", "item.change_email", "fortnite_change_email"])),
    level: short(pick(combined, ["level", "fortnite_level", "season_level", "account_level", "item.level"])),
    country: short(pick(combined, ["country", "item.country", "origin_country", "account_country"])),
    last_activity: formatTimestamp(pick(combined, ["last_activity", "fortnite_last_activity", "account_last_activity", "item.last_activity"])),
    published: formatTimestamp(pick(combined, ["published_date", "created_at", "upload_date", "item.published_date"])),
    vbucks: short(pick(combined, ["vbuck", "vbucks", "fortnite_vbucks", "item.vbucks"]))
  };
}

async function fetchDetail(itemId, fallback) {
  if (!/^\d+$/.test(String(itemId))) {
    return { error: "No numeric item_id for detail fetch", summary_only: fallback };
  }
  try {
    return await lztGet(`/${itemId}`);
  } catch (err) {
    return { error: "Could not fetch detail endpoint", exception: err.message, summary_only: fallback };
  }
}

async function testToken() {
  try {
    el("tokenStatus").textContent = "Testing token...";
    const data = await lztGet(categoryPath(), {
      page: 1,
      order_by: el("orderBy").value.trim(),
      currency: el("currency").value.trim()
    });
    const count = extractItems(data).length;
    el("tokenStatus").textContent = `Token works. Fetched ${count} item(s) from first page.`;
  } catch (err) {
    el("tokenStatus").textContent = `Token test failed: ${err.message}`;
  }
}

async function scanLzt() {
  const maxTerms = Math.max(1, Math.min(50, Number(el("maxTerms").value || 25)));
  const terms = loadTerms().slice(0, maxTerms);
  const orderBy = el("orderBy").value.trim();
  const currency = el("currency").value.trim();
  const all = new Map();
  const errors = [];

  setBadge("Scanning...", "warn");
  el("results").innerHTML = `<p>Scanning by ${terms.length} watchlist terms and newest listings. Keep this tab open.</p>`;

  for (const term of terms) {
    try {
      const data = await lztGet(categoryPath(), {
        page: 1,
        order_by: orderBy,
        currency,
        title: term
      });
      const items = extractItems(data);
      for (const item of items) {
        const id = itemIdOf(item);
        if (!id) continue;
        if (matchedTerms(item).length) all.set(id, item);
      }
      await sleep(450);
    } catch (err) {
      errors.push({ term, error: err.message });
    }
  }

  try {
    const newest = await lztGet(categoryPath(), { page: 1, order_by: orderBy, currency });
    for (const item of extractItems(newest)) {
      const id = itemIdOf(item);
      if (!id) continue;
      if (matchedTerms(item).length) all.set(id, item);
    }
  } catch (err) {
    errors.push({ term: "newest listings", error: err.message });
  }

  const results = [];
  for (const [itemId, item] of all.entries()) {
    const detail = await fetchDetail(itemId, item);
    const matched = [...new Set([...matchedTerms(item), ...matchedTerms(detail)])].sort();
    const fields = displayFields(item, detail);
    const caseObj = {
      createdAt: new Date().toISOString(),
      ...fields,
      matched_terms: matched,
      raw: { summary: item, detail }
    };
    results.push(caseObj);
    await sleep(250);
  }

  const cases = loadCases();
  const seen = new Set(cases.map(c => c.item_id));
  for (const r of results) {
    if (!seen.has(r.item_id)) cases.unshift(r);
  }
  saveCases(cases);

  renderResults(results, errors);
  renderCases();
}

function renderResults(results, errors = []) {
  let html = "";

  if (errors.length) {
    html += `<pre>Some scan errors:\n${escapeHtml(JSON.stringify(errors, null, 2))}</pre>`;
  }

  if (!results.length) {
    setBadge("0 results", "warn");
    html += `<p>No matching listings found in this scan.</p>`;
    el("results").innerHTML = html;
    return;
  }

  setBadge(`${results.length} result(s)`, "ok");
  html += results.map(renderCaseCard).join("");
  el("results").innerHTML = html;
}

function renderCaseCard(c) {
  return `
    <article class="result">
      <h3>${escapeHtml(c.title)}</h3>
      <div class="grid">
        <div><strong>Seller:</strong> ${escapeHtml(c.seller)}</div>
        <div><strong>Price:</strong> ${escapeHtml(c.price)}</div>
        <div><strong>Skin Count:</strong> ${escapeHtml(c.skin_count)}</div>
        <div><strong>V-Bucks:</strong> ${escapeHtml(c.vbucks)}</div>
        <div><strong>Email Changeable:</strong> ${escapeHtml(c.email_changeable)}</div>
        <div><strong>Country:</strong> ${escapeHtml(c.country)}</div>
        <div><strong>Level:</strong> ${escapeHtml(c.level)}</div>
        <div><strong>Last Activity:</strong> ${escapeHtml(c.last_activity)}</div>
      </div>
      <p><strong>Matched:</strong> ${escapeHtml((c.matched_terms || []).join(", ") || "none")}</p>
      <p><a href="${escapeHtml(c.listing_url)}" target="_blank" rel="noreferrer">Open listing</a></p>
      <details>
        <summary>Evidence report</summary>
        <pre>${escapeHtml(buildReport(c))}</pre>
      </details>
    </article>
  `;
}

function buildReport(c) {
  const matched = (c.matched_terms || []).map(t => `• ${t}`).join("\n") || "• None";
  return `🚩 Suspected Fortnite Account-Sale Violation

🏷️ Title: ${c.title}
👤 Seller: ${c.seller}
💵 Listed Price: ${c.price}
🎮 Skin Count: ${c.skin_count}
💰 V-Bucks: ${c.vbucks}

⭐ Matched Rare / OG Terms:
${matched}

📧 Email Changeable: ${c.email_changeable}
🔢 Level / Season Level: ${c.level}
🌍 Country: ${c.country}
⏱️ Last Activity: ${c.last_activity}
🕒 Published / Uploaded: ${c.published}

🆔 LZT Item ID: ${c.item_id}
🔗 Listing URL: ${c.listing_url}

Evidence:
Generated from LZT API response in browser. Export JSON to preserve raw returned data.

Recommended action:
Review evidence, preserve screenshots/timestamps if needed, and use the official enforcement/takedown process.`;
}

function fieldFromText(text, labels) {
  const lines = text.split(/\r?\n/);
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp("^\\s*" + escaped + "\\s*:\\s*(.+)$", "i");
    for (const line of lines) {
      const match = line.match(rx);
      if (match) return match[1].trim();
    }
  }
  return "";
}

function manualScan() {
  const text = el("manualInput").value.trim();
  if (!text) return;
  const url = (text.match(/https?:\/\/[^\s)]+/i) || [""])[0];
  const itemMatch = url.match(/lzt\.market\/(\d+)/i);
  const c = {
    createdAt: new Date().toISOString(),
    item_id: itemMatch ? itemMatch[1] : "Unknown",
    listing_url: url || "Unknown",
    title: fieldFromText(text, ["Title", "Listing Title", "Name"]) || "Unknown",
    seller: fieldFromText(text, ["Seller", "Username", "User"]) || "Unknown",
    price: fieldFromText(text, ["Price", "Listed Price", "Cost"]) || "Unknown",
    skin_count: fieldFromText(text, ["Skin Count", "Skins"]) || ((text.match(/\b(\d+)\s*skins?\b/i) || [])[1] ?? "Unknown"),
    email_changeable: fieldFromText(text, ["Email Changeable", "Email", "Change Email"]) || "Unknown",
    level: fieldFromText(text, ["Level", "Season Level", "Account Level"]) || "Unknown",
    country: fieldFromText(text, ["Country", "Region"]) || "Unknown",
    last_activity: fieldFromText(text, ["Last Activity", "Last Login", "Activity"]) || "Unknown",
    published: "Unknown",
    vbucks: fieldFromText(text, ["VB", "V-Bucks", "Vbucks", "VBucks"]) || "Unknown",
    matched_terms: matchedTerms(text),
    raw: { pasted_text: text }
  };
  saveCases([c, ...loadCases()]);
  renderResults([c], []);
  renderCases();
}

function renderCases() {
  const cases = loadCases();
  const box = el("cases");
  if (!cases.length) {
    box.innerHTML = `<p>No saved cases yet.</p>`;
    return;
  }
  box.innerHTML = cases.slice(0, 100).map(c => `
    <article class="case">
      <h3>${escapeHtml(c.title)}</h3>
      <div class="grid">
        <div><strong>Item ID:</strong> ${escapeHtml(c.item_id)}</div>
        <div><strong>Seller:</strong> ${escapeHtml(c.seller)}</div>
        <div><strong>Price:</strong> ${escapeHtml(c.price)}</div>
        <div><strong>Country:</strong> ${escapeHtml(c.country)}</div>
      </div>
      <p><strong>Matched:</strong> ${escapeHtml((c.matched_terms || []).join(", "))}</p>
      <p><a href="${escapeHtml(c.listing_url)}" target="_blank" rel="noreferrer">Open listing</a></p>
      <details>
        <summary>Evidence report</summary>
        <pre>${escapeHtml(buildReport(c))}</pre>
      </details>
    </article>
  `).join("");
}

function download(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJson() {
  download("lzt-fortnite-review-cases.json", JSON.stringify(loadCases(), null, 2), "application/json");
}

function csvCell(value) {
  const s = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function exportCsv() {
  const cases = loadCases();
  const headers = ["createdAt", "item_id", "title", "seller", "price", "skin_count", "email_changeable", "country", "level", "last_activity", "published", "listing_url", "matched_terms"];
  const rows = [
    headers.join(","),
    ...cases.map(c => headers.map(h => csvCell(c[h])).join(","))
  ];
  download("lzt-fortnite-review-cases.csv", rows.join("\n"), "text/csv");
}

function setBadge(text, status) {
  el("resultBadge").textContent = text;
  el("resultBadge").className = `badge ${status || ""}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function applyTheme() {
  const theme = localStorage.getItem(STORAGE_KEYS.theme);
  document.body.classList.toggle("light", theme === "light");
}

function bindEvents() {
  el("themeToggle").addEventListener("click", () => {
    const next = document.body.classList.contains("light") ? "dark" : "light";
    localStorage.setItem(STORAGE_KEYS.theme, next);
    applyTheme();
  });

  el("clearTokenBtn").addEventListener("click", () => {
    sessionToken = "";
    el("apiToken").value = "";
    el("tokenStatus").textContent = "Token cleared from this tab.";
  });

  el("testTokenBtn").addEventListener("click", testToken);
  el("scanBtn").addEventListener("click", scanLzt);
  el("manualScanBtn").addEventListener("click", manualScan);

  el("addTermBtn").addEventListener("click", () => {
    const term = el("newTerm").value.trim().toLowerCase();
    if (!term) return;
    saveTerms([...loadTerms(), term]);
    el("newTerm").value = "";
    renderWatchlist();
  });

  el("newTerm").addEventListener("keydown", (e) => {
    if (e.key === "Enter") el("addTermBtn").click();
  });

  el("resetWatchlist").addEventListener("click", () => {
    saveTerms(DEFAULT_TERMS);
    renderWatchlist();
  });

  el("exportJsonBtn").addEventListener("click", exportJson);
  el("exportCsvBtn").addEventListener("click", exportCsv);
  el("clearCasesBtn").addEventListener("click", () => {
    if (confirm("Clear saved cases from this browser?")) {
      saveCases([]);
      renderCases();
    }
  });
}

applyTheme();
renderWatchlist();
renderCases();
bindEvents();
