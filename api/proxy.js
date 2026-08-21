const BROWSER_HEADERS = {
  "Referer": "https://clickpix.org/",
  "Origin": "https://clickpix.org",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache"
};

export default async function handler(req, res) {
  const url = req.query.url;
  if (!url || !/^https:\/\//i.test(url)) {
    return res.status(400).send("Missing or invalid ?url=");
  }
  let lastType = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    let target = url;
    if (attempt > 0) {
      target += (url.indexOf("?") === -1 ? "?" : "&") + "_retry=" + Date.now() + attempt;
    }
    try {
      const upstream = await fetch(target, {
        redirect: "follow",
        headers: BROWSER_HEADERS
      });
      lastType = upstream.headers.get("content-type") || "";
      const buf = Buffer.from(await upstream.arrayBuffer());
      const isHtml = lastType.indexOf("text/html") === 0;
      if (isHtml && attempt < 2 && buf.length < 20000) {
        const text = buf.toString("utf8").slice(0, 500);
        if (/just a moment|challenge|captcha/i.test(text)) continue;
      }
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Content-Type", lastType || "application/octet-stream");
      return res.status(upstream.status).send(buf);
    } catch (err) {
      return res.status(502).send("Proxy error: " + err.message);
    }
  }
  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.status(403).send("Cloudflare challenge - try opening the image directly in your browser.");
}