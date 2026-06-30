// @ts-nocheck
export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured on this deployment" }),
      { status: 503, headers: { "content-type": "application/json" } }
    );
  }

  const url = new URL(req.url);
  const upstreamPath = url.pathname.replace(/^\/api\/anthropic/, "");

  const upstream = await fetch(`https://api.anthropic.com${upstreamPath}${url.search}`, {
    method: req.method,
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
