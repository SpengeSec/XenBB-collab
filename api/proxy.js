export default async function handler(req, res) {
  const url = req.query.url;
  if (!url || !/^https:\/\//i.test(url)) {
    return res.status(400).send("Missing or invalid ?url=");
  }
  try {
    const upstream = await fetch(url, {
      redirect: "follow",
      headers: {
        "Referer": "https://clickpix.org/",
        "User-Agent": "Mozilla/5.0 (compatible; XenBBCollabImageProxy/1.0)"
      }
    });
    const ct = upstream.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Type", ct);
    const buf = Buffer.from(await upstream.arrayBuffer());
    return res.status(upstream.status).send(buf);
  } catch (err) {
    return res.status(502).send("Proxy error: " + err.message);
  }
}
