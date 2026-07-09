export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname !== "/proxy") {
      return json({
        status: "online",
        app: "Wrota LZT Checker proxy",
        usage: "/proxy?url=https://prod-api.lzt.market/fortnite"
      });
    }

    const target = url.searchParams.get("url");
    const apiKey = request.headers.get("X-LZT-Key") || request.headers.get("X-LZT-Token");

    if (!target) return json({ error: "Missing url parameter" }, 400);
    if (!apiKey) return json({ error: "Missing X-LZT-Key header" }, 400);

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return json({ error: "Invalid target URL" }, 400);
    }

    if (targetUrl.origin !== "https://prod-api.lzt.market") {
      return json({ error: "Only https://prod-api.lzt.market is allowed" }, 403);
    }

    const upstream = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
        "User-Agent": "Wrota-LZT-Checker-Proxy/1.0"
      }
    });

    const body = await upstream.text();

    return new Response(body, {
      status: upstream.status,
      headers: {
        ...corsHeaders(),
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        "Cache-Control": "no-store"
      }
    });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "X-LZT-Key, X-LZT-Token, Accept, Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}
