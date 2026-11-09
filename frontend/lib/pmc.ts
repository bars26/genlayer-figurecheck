/** Reading the PubMed Central open-access bucket, the same way the contract does (server side: the bucket has no CORS). */

export const BUCKET = "https://pmc-oa-opendata.s3.amazonaws.com";
const UA = { "user-agent": "FigureCheck/1.0 (+https://github.com/bars26/genlayer-figurecheck)" };

export const PMCID = /^PMC\d{4,9}$/;
export const VERSION = /^PMC\d{4,9}\.\d{1,3}$/;
export const FIGURE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.jpe?g$/;

export type Figure = { file: string; label: string; caption: string; md5: string };
export type Paper = {
  pmcid: string;
  version: string;
  title: string;
  citation: string;
  doi: string;
  license: string;
  openAccess: boolean;
  retracted: boolean;
  figures: Figure[];
};

export async function latestVersion(pmcid: string): Promise<string> {
  const res = await fetch(`${BUCKET}/?list-type=2&prefix=${pmcid}.&delimiter=/`, { headers: UA, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`bucket listing: HTTP ${res.status}`);
  const found = [...(await res.text()).matchAll(new RegExp(`<Prefix>(${pmcid}\\.(\\d+))/</Prefix>`, "g"))];
  return found.length ? found.sort((a, b) => Number(b[2]) - Number(a[2]))[0][1] : "";
}

const plain = (s: string) =>
  s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();

export async function readPaper(pmcid: string): Promise<Paper | null> {
  const version = await latestVersion(pmcid);
  if (!version) return null;
  const meta = await (await fetch(`${BUCKET}/${version}/${version}.json`, { headers: UA, next: { revalidate: 3600 } })).json();
  const md5s: Record<string, string> = {};
  for (const u of meta.media_urls ?? []) {
    const m = String(u).match(/^s3:\/\/pmc-oa-opendata\/[^/]+\/([^?]+)\?md5=([0-9a-f]{32})$/);
    if (m && FIGURE.test(m[1])) md5s[m[1]] = m[2];
  }
  const figures: Figure[] = [];
  const xmlRes = await fetch(`${BUCKET}/${version}/${version}.xml`, { headers: UA, next: { revalidate: 3600 } });
  const xml = xmlRes.ok ? await xmlRes.text() : "";
  const seen = new Set<string>();
  // Supplements nest inside their parent <fig>: take the innermost <fig> that holds each graphic, as the contract does.
  for (const m of xml.matchAll(/xlink:href="([^"]+)"/g)) {
    const stem = m[1].replace(/\.(jpe?g|tiff?|gif|png)$/i, "");
    const file = Object.keys(md5s).find((f) => f.replace(/\.jpe?g$/i, "") === stem);
    if (!file || seen.has(file)) continue;
    const at = m.index ?? 0;
    const start = Math.max(xml.lastIndexOf("<fig ", at), xml.lastIndexOf("<fig>", at));
    const ends = [xml.indexOf("</fig>", at), xml.indexOf("<fig ", at + 1)].filter((i) => i >= 0);
    if (start < 0 || !ends.length) continue;
    const fig = xml.slice(start, Math.min(...ends));
    seen.add(file);
    figures.push({
      file,
      label: plain(fig.match(/<label>([\s\S]*?)<\/label>/)?.[1] ?? ""),
      caption: plain(fig.match(/<caption>([\s\S]*?)(<\/caption>|$)/)?.[1] ?? "").slice(0, 600),
      md5: md5s[file],
    });
  }
  for (const [file, md5] of Object.entries(md5s)) if (!seen.has(file)) figures.push({ file, label: file, caption: "", md5 });
  return {
    pmcid,
    version,
    title: String(meta.title ?? ""),
    citation: String(meta.citation ?? ""),
    doi: String(meta.doi ?? ""),
    license: String(meta.license_code ?? ""),
    openAccess: !!meta.is_pmc_openaccess,
    retracted: !!meta.is_retracted,
    figures,
  };
}
