import { BUCKET, FIGURE, VERSION } from "@/lib/pmc";

/**
 * A figure from the PubMed Central open-access bucket, served from this origin so the page can read its pixels (the
 * bucket sends no CORS headers) and the production CSP can stay img-src 'self'. Only bucket figures, by exact name.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const v = q.get("v") || "";
  const f = q.get("f") || "";
  if (!VERSION.test(v) || !FIGURE.test(f)) return new Response("bad figure", { status: 400 });
  const res = await fetch(`${BUCKET}/${v}/${f}`, { next: { revalidate: 86400 } });
  if (!res.ok) return new Response("not found", { status: res.status === 403 ? 404 : res.status });
  return new Response(await res.arrayBuffer(), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable" },
  });
}
