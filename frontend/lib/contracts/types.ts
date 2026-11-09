/** Types and display helpers for the FigureCheck contract. */

type Num = string | number | bigint;

export type State = "no_match" | "unclear" | "match" | "confirmed" | "upheld" | "disclosed" | "overturned" | "unresolved" | "known";

export interface Fund {
  id: string;
  sponsor: string;
  title: string;
  ends: string;
  reward: Num;
  stake: Num;
  contest_minutes: Num;
  per_reporter: Num;
  state: "open" | "closed";
  pot: Num;
  reserved: Num;
  funded_total: Num;
  paid_total: Num;
  returnable: Num;
  returned_total: Num;
  n_funders: Num;
  n_refunded: Num;
  n_findings: Num;
  created_at: string;
  history_json: string;
  /** Not stored on the fund: attached by the registry snapshot from get_funders. */
  funders?: FunderRow[];
}

export interface FunderRow {
  address: string;
  amount: string;
  refunded: boolean;
}

export interface Finding {
  id: string;
  fund_id: string;
  reporter: string;
  pmcid: string;
  version: string;
  figure: string;
  box_a: string;
  box_b: string;
  label_a: string;
  label_b: string;
  stake: Num;
  reward: Num;
  state: State;
  filed_at: string;
  deadline: string;
  md5: string;
  license: string;
  shape: string;
  offset: string;
  transform: string;
  answer: string;
  why: string;
  packet: string;
  contester: string;
  contest_text: string;
  contest_answer: string;
  notice: string;
  settled_at: string;
}

export const MIN_FUND_WEI = 10n ** 17n;
export const MIN_STAKE_WEI = 10n ** 16n;
export const ZERO = "0x0000000000000000000000000000000000000000";

/** How each state reads, and the stamp it gets. */
export const STATE_STYLE: Record<State, { label: string; stamp: string; help: string }> = {
  match: { label: "Match · open to contest", stamp: "stamp-red", help: "The validators see the same image (and the pixel shape score agrees). Anyone may contest until the deadline." },
  confirmed: { label: "Confirmed", stamp: "stamp-red", help: "Uncontested after the window, or a notice published after filing acknowledged it. The reporter was paid." },
  upheld: { label: "Upheld", stamp: "stamp-red", help: "Contested, and the second look kept it: the same image, not disclosed in the caption. The reporter took the contester's stake." },
  disclosed: { label: "Disclosed reuse", stamp: "stamp-ink", help: "The same image, but the figure's own caption says these panels share it. Stakes back, no reward." },
  overturned: { label: "Overturned", stamp: "stamp-grey", help: "Contested, and the second look found different images. The contester took the reporter's stake." },
  unresolved: { label: "Unresolved", stamp: "stamp-grey", help: "Contested, and the second look could not tell. Stakes back, no reward." },
  known: { label: "Already corrected", stamp: "stamp-ink", help: "The authors had acknowledged it in a notice published before the finding was filed. Stake back, no reward." },
  unclear: { label: "Unclear", stamp: "stamp-grey", help: "The validators could not tell at this resolution. Stake back; a later correction notice can still confirm it." },
  no_match: { label: "No match", stamp: "stamp-grey", help: "Not the same image (pixel shape score below 0.5, or the validators saw different details). The stake went to the fund." },
};

export function wei(v: Num | undefined): bigint {
  try {
    return BigInt(String(v ?? "0").split(".")[0]);
  } catch {
    return 0n;
  }
}

export function formatGen(v: Num | undefined, digits = 2): string {
  const n = Number(wei(v)) / 1e18;
  return n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function parseGen(input: string): bigint | null {
  const t = input.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(t)) return null;
  const [whole, frac = ""] = t.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt((frac + "0".repeat(18)).slice(0, 18));
}

export function parseJson<T>(json: string | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export type Box = [number, number, number, number];
export function parseBox(s: string): Box | null {
  const m = String(s || "").match(/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*$/);
  if (!m) return null;
  const b = m.slice(1).map(Number) as Box;
  return b[2] > b[0] && b[3] > b[1] ? b : null;
}
export const boxText = (b: Box) => b.join(",");

export const sameAddress = (a?: string | null, b?: string | null) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
export const short = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
export const todayUtc = () => new Date().toISOString().slice(0, 10);
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export const fundersOf = (f: Fund): FunderRow[] => f.funders ?? [];
export const funderRow = (f: Fund, a?: string | null) => (a ? fundersOf(f).find((r) => sameAddress(r.address, a)) : undefined);
export const figureUrl = (version: string, file: string) => `/api/figure?v=${encodeURIComponent(version)}&f=${encodeURIComponent(file)}`;
export const articleUrl = (pmcid: string) => `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/`;
export const deadlineMs = (d: Finding) => (d.deadline ? Date.parse(`${d.deadline}Z`) : 0);
export const isOpenMatch = (d: Finding, now = Date.now()) => d.state === "match" && now <= deadlineMs(d);
