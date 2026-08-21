const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response("", { status: 204, headers: CORS });
    }

    const path = url.pathname.replace(/\/+$/, "");

    if (path === "/draft") {
      return handleDraft(request, url, env);
    }

    if (path === "" || path === "/") {
      const target = url.searchParams.get("url");
      if (!target || !/^https:\/\//i.test(target)) {
        return new Response("Missing or invalid ?url=", { status: 400, headers: CORS });
      }
      try {
        const upstream = await fetch(target, {
          redirect: "follow",
          headers: {
            "Referer": "https://clickpix.org/",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
          }
        });
        const headers = new Headers(upstream.headers);
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Cache-Control", "public, max-age=86400");
        return new Response(upstream.body, { status: upstream.status, headers });
      } catch (err) {
        return new Response("Proxy error: " + err.message, { status: 502, headers: CORS });
      }
    }

    return new Response("Not found", { status: 404, headers: CORS });
  }
};

async function handleDraft(request, url, env) {
  const room = String(url.searchParams.get("room") || "").trim().toLowerCase().slice(0, 48);
  if (!room) return new Response("Missing ?room=", { status: 400, headers: CORS });
  const key = "draft:" + room;

  if (request.method === "GET") {
    const raw = await env.XBB_DRAFTS.get(key);
    const data = raw ? JSON.parse(raw) : { text: "", ts: 0 };
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  }

  if (request.method === "POST") {
    let body;
    try { body = await request.json(); }
    catch (e) { body = {}; }
    const text = String(body.text != null ? body.text : "").slice(0, 500000);
    const ts = Number(body.ts) || Date.now();
    await env.XBB_DRAFTS.put(key, JSON.stringify({ text: text, ts: ts }));
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  }

  return new Response("Method not allowed", { status: 405, headers: CORS });
}