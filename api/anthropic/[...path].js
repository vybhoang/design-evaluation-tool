async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured on this deployment" });
    return;
  }

  const upstreamPath = req.url.replace(/^\/api\/anthropic/, "");

  const upstream = await fetch(`https://api.anthropic.com${upstreamPath}`, {
    method: req.method,
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req),
  });

  const responseText = await upstream.text();
  res
    .status(upstream.status)
    .setHeader("content-type", upstream.headers.get("content-type") ?? "application/json")
    .end(responseText);
}
