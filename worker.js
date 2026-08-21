export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");
    if (!target || !/^https:\/\//i.test(target)) {
      return new Response("Missing or invalid ?url=", { status: 400 });
    }
    try {
      const upstream = await fetch(target, {
        redirect: "follow",
        headers: {
          "Referer": "https://clickpix.org/",
          "User-Agent": "Mozilla/5.0 (compatible; XenBBCollabImageProxy/1.0)"
        }
      });
      const headers = new Headers(upstream.headers);
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Cache-Control", "public, max-age=86400");
      return new Response(upstream.body, { status: upstream.status, headers });
    } catch (err) {
      return new Response("Proxy error: " + err.message, { status: 502 });
    }
  }
}
