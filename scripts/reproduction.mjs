// Builds docs/REPRODUCTION.md from the live run (docs/studio/demo-run.json, written by scripts/demo.mjs) and, when
// present, the MetaMask run from the live app (docs/studio/ui-test.json).
//
//   node scripts/reproduction.mjs

import { existsSync, readFileSync, writeFileSync } from "fs";

const EXPLORER = "https://explorer-studio.genlayer.com";
const load = (p) => (existsSync(new URL(p, import.meta.url)) ? JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8")) : null);
const first = load("../docs/studio/demo-run-fund0.json");
const run = load("../docs/studio/demo-run.json");
const runs = first ? [first, run] : [run];
const ui = load("../docs/studio/ui-test.json");
const tx = (h) => (h ? `[\`${h.slice(0, 10)}…\`](${EXPLORER}/tx/${h})` : "");
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const gen = (wei) => `${(Number(BigInt(wei || 0)) / 1e18).toLocaleString("en-US", { maximumFractionDigits: 4 })} GEN`;
const article = (pmcid) => `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/`;
const figure = (d) => `https://pmc-oa-opendata.s3.amazonaws.com/${d.version}/${d.figure}`;

const findingRows = (run) => Object.entries(run.findings).map(([id, d]) =>
  `| ${id} | [${d.pmcid}](${article(d.pmcid)}) [${esc(d.figure)}](${figure(d)}) | ${esc(d.label_a)} / ${esc(d.label_b)} | \`${d.box_a}\` / \`${d.box_b}\` | ${d.shape} | ${d.answer} | **${d.state}** | ${esc(d.why)} |`
);
const evidenceRows = (run) => Object.entries(run.findings).map(([id, d]) =>
  `| ${id} | \`${d.md5}\` | ${d.license} | ${d.offset} ${d.transform || "as is"} | \`${d.packet}\` | ${d.contest_answer || ""} | ${esc(d.notice)} |`
);
const uiTest = ui
  ? `## Wallet test from the live app

${ui.note} Wallet \`${ui.wallet}\`.

| Step | GEN sent | Result | Tx |
|---|---|---|---|
${ui.steps.map(([step, value, result, hash]) => `| ${esc(step)} | ${value} | ${esc(result)} | ${tx(hash)} |`).join("\n")}
`
  : "";

const section = (run, n) => `## Run ${n}: fund \`${run.fund.id}\`

Accounts: ${Object.entries(run.accounts).map(([k, a]) => `${k} \`${a}\``).join(", ")}.

Fund \`${run.fund.id}\`: reward ${gen(run.fund.reward)} per confirmed finding, stake ${gen(run.fund.stake)}, contest window
${run.fund.contest_minutes} minutes, ${run.fund.per_reporter} findings per reporter. Funded ${gen(run.fund.funded_total)}, paid ${gen(run.fund.paid_total)}.

### Findings

| Finding | Article and figure | Panels (as the paper labels them) | Boxes A / B | Shape | Validators saw | State | Why |
|---|---|---|---|---|---|---|---|
${findingRows(run).join("\n")}

### Evidence per finding

| Finding | Figure md5 (as published by PubMed Central) | License | B aligned | Packet sha256 | Second look | Notice |
|---|---|---|---|---|---|---|
${evidenceRows(run).join("\n")}

### Balance reconciliation

\`totals()\` (pots, rewards held for open matches, stakes of open matches, and credited GEN not yet withdrawn) against the
contract's on-chain balance, after every transfer had finalized:

| Point | Expected | Contract balance | Match |
|---|---|---|---|
${run.reconciliations.map((r) => `| ${r.label} | ${gen(r.expected)} | ${gen(r.balance)} | ${r.ok ? "yes" : "**no**"} |`).join("\n")}

Credited before withdrawing: ${Object.entries(run.credited).map(([k, v]) => `${k} ${gen(v)}`).join(", ")}.

### Every transaction

| Who | Call | GEN | Result | Returned / refused | Tx |
|---|---|---|---|---|---|
${run.log.map((r) => `| ${r.who} | \`${esc(r.call)}\` | ${r.value} | ${r.exec} | ${esc((r.returned || r.refused || "").slice(0, 160))} | ${tx(r.hash)} |`).join("\n")}
`;

const md = `# FigureCheck: reproduction of the live runs

Contract on GenLayer Studio: [\`${run.contract}\`](${EXPLORER}/address/${run.contract}) (source \`contracts/figure_check.py\`, checked
byte-identical with \`node scripts/verify-code.mjs ${run.contract}\`).

\`scripts/demo.mjs\` opened a **demo fund** from fresh test wallets and filed findings on **real open-access figures** from the
PubMed Central bucket; it ran ${runs.length === 1 ? "once" : `${runs.length} times on this contract, each time with its own fund and wallets`}. Every finding is
validator consensus: each validator listed the article's versions, read its metadata, downloaded the figure, checked it against
the md5 PubMed Central publishes, decoded the two panels with the contract's own JPEG decoder, scored their shapes and, unless the
score was below 0.5, looked at the two panels side by side.

${uiTest}
${runs.map((r, i) => section(r, i + 1)).join("\n")}`;

writeFileSync(new URL("../docs/REPRODUCTION.md", import.meta.url), md);
console.log(`wrote docs/REPRODUCTION.md (${runs.reduce((n, r) => n + r.log.length, 0)} transactions)`);
