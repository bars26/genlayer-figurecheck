import { PMCID, readPaper } from "@/lib/pmc";

/** An open-access article's figures from PubMed Central (labels, captions, checksums), CDN-cached. */
export async function GET(request: Request) {
  const pmcid = (new URL(request.url).searchParams.get("pmcid") || "").trim().toUpperCase();
  if (!PMCID.test(pmcid)) return Response.json({ error: "Give a PubMed Central id like PMC7665890" }, { status: 400 });
  try {
    const paper = await readPaper(pmcid);
    if (!paper) return Response.json({ error: `${pmcid} is not in the PubMed Central open-access set` }, { status: 404 });
    return Response.json(paper, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
