// Live run of FigureCheck on GenLayer Studio with real open-access figures from PubMed Central.
//
//   node scripts/demo.mjs <contract-address>          # writes docs/studio/demo-run.json
//
// The fund and the wallets are test wallets. The papers, figures, captions and correction notices are real; every
// finding is judged by the validators reading PubMed Central themselves. Results are recorded as they come, including
// any that differ from what the authors' own corrections say.

import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { writeFileSync } from "fs";

const [CONTRACT] = process.argv.slice(2);
if (!CONTRACT) {
  console.error("usage: node scripts/demo.mjs <contract-address>");
  process.exit(1);
}
const RPC = "https://studio.genlayer.com/api";
const GEN = 10n ** 18n;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TRANSIENT = /rate limit|Unexpected token '<'|not valid JSON|fetch failed|ECONNRESET|socket hang up|50[234]/i;

async function rpc(method, params) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
      const body = await res.json();
      if (body.error) throw new Error(`${method}: ${body.error.message}`);
      return body.result;
    } catch (err) {
      if (attempt >= 5 || /^\w+: /.test(String(err?.message))) throw err;
      await sleep(10000 * attempt);
    }
  }
}

const log = [];
async function write(c, who, functionName, args, value = 0n, { expectError = false, allowError = false } = {}) {
  for (let attempt = 1; ; attempt++) {
    let hash;
    try {
      hash = await c.writeContract({ address: CONTRACT, functionName, args, value });
      let receipt;
      for (let wait = 1; ; wait++) {
        try {
          receipt = await c.waitForTransactionReceipt({ hash, status: "ACCEPTED", retries: 120, interval: 5000 });
          break;
        } catch (err) {
          if (!TRANSIENT.test(String(err?.message || err)) || wait >= 6) throw Object.assign(err, { sent: true });
          await sleep(10000 * wait);
        }
      }
      const lr = receipt?.consensus_data?.leader_receipt;
      const first = Array.isArray(lr) ? lr[0] : lr;
      // A round the validators could not decide leaves the leader's result in the receipt but changes nothing.
      const rounds = receipt?.consensus_history?.consensus_results ?? [];
      const decided = rounds.length === 0 || rounds.at(-1)?.consensus_round !== "Undetermined";
      const exec = decided ? first?.execution_result ?? "?" : "UNDETERMINED";
      let returned = decided ? first?.result?.payload?.readable : undefined;
      try { returned = JSON.parse(returned); } catch {}
      const row = { who, call: `${functionName}(${args.map((a) => (typeof a === "bigint" ? `${Number(a) / 1e18} GEN` : JSON.stringify(a)).slice(0, 48)).join(", ")})`,
        value: (Number(value) / 1e18).toString(), hash, status: receipt.statusName ?? "ACCEPTED", exec, returned: typeof returned === "string" ? returned : undefined };
      if (exec !== "SUCCESS") row.refused = typeof first?.result?.payload === "string" ? first.result.payload : "";
      log.push(row);
      console.log(`${who.padEnd(10)} ${row.call.slice(0, 64).padEnd(64)} ${row.exec.padEnd(7)} ${hash.slice(0, 12)}${row.returned ? "  -> " + row.returned.slice(0, 150) : ""}${row.refused ? "  !! " + row.refused.slice(0, 120) : ""}`);
      if (expectError && exec === "SUCCESS") throw new Error(`${functionName} was expected to be refused`);
      if (!expectError && !allowError && exec !== "SUCCESS") throw new Error(`${functionName} executed with ${exec}: ${row.refused}`);
      return row;
    } catch (err) {
      if (TRANSIENT.test(String(err?.message || err)) && attempt < 4 && !err?.sent && !hash) {
        await sleep(15000 * attempt);
        continue;
      }
      throw err;
    }
  }
}

// Studio sometimes answers a read right after an accepted write from state that does not have it yet: retry those too.
const LAGGING = /execution failed|No (finding|fund) with id/i;
const read = async (c, functionName, args = []) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await c.readContract({ address: CONTRACT, functionName, args });
    } catch (err) {
      const msg = String(err?.message) + JSON.stringify(err?.cause ?? "");
      if ((TRANSIENT.test(msg) || LAGGING.test(msg)) && attempt < 8) { await sleep(5000 * attempt); continue; }
      throw err;
    }
  }
};
const plain = (o) => JSON.parse(JSON.stringify(o instanceof Map ? Object.fromEntries(o) : o, (k, v) => (typeof v === "bigint" ? v.toString() : v instanceof Map ? Object.fromEntries(v) : v)));
const balance = async (addr) => BigInt(await rpc("eth_getBalance", [addr, "latest"]));
const fmt = (wei) => (Number(wei) / 1e18).toFixed(2);

const keys = { sponsor: generatePrivateKey(), reporter: generatePrivateKey(), contester: generatePrivateKey(), bystander: generatePrivateKey() };
const acct = Object.fromEntries(Object.entries(keys).map(([k, v]) => [k, createAccount(v)]));
const C = Object.fromEntries(Object.entries(acct).map(([k, a]) => [k, createClient({ chain: studionet, endpoint: RPC, account: a })]));
if (process.env.DEMO_KEYS) writeFileSync(process.env.DEMO_KEYS, JSON.stringify(keys));
console.log("contract  ", CONTRACT);
for (const [k, a] of Object.entries(acct)) console.log(k.padEnd(10), a.address);
for (const [k, g] of [["sponsor", 20n], ["reporter", 5n], ["contester", 5n], ["bystander", 3n]]) await rpc("sim_fundAccount", [acct[k].address, Number(g * GEN)]);
await sleep(3000);

const quiet = async () => {
  let last = -1;
  for (let i = 0; i < 60; i++) {
    const txs = await rpc("sim_getTransactionsForAddress", [CONTRACT]);
    const busy = txs.filter((t) => !["FINALIZED", "CANCELED", "UNDETERMINED"].includes(t.status)).length;
    if (busy === 0 && txs.length === last) return;
    last = busy === 0 ? txs.length : -1;
    await sleep(10000);
  }
  throw new Error("transactions did not finalize");
};
const reconciliations = [];
const reconcile = async (label) => {
  await quiet();
  const t = JSON.parse(await read(C.sponsor, "totals"));
  const onChain = await balance(CONTRACT);
  const ok = BigInt(t.expected_balance) === onChain;
  reconciliations.push({ label, expected: t.expected_balance, owed: t.owed, balance: onChain.toString(), ok });
  console.log(`  reconcile (${label}): expected ${fmt(t.expected_balance)} GEN (credited ${fmt(t.owed)}); balance ${fmt(onChain)} GEN ${ok ? "OK" : "MISMATCH"}`);
  if (!ok) throw new Error("balance mismatch");
};

const ENDS = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
const REWARD = GEN / 2n, STAKE = GEN / 10n, MINUTES = 10;
const firstFund = (await read(C.sponsor, "get_funds", [0, 200])).length;
const fid = `fund_${firstFund}`;

await write(C.sponsor, "sponsor", "create_fund", ["Image integrity in open-access papers", "2026-02-31", REWARD, STAKE, MINUTES, 6], 2n * GEN); // no such date
await reconcile("after a refused fund: its GEN is credited back");
await write(C.sponsor, "sponsor", "withdraw", []);
await write(C.sponsor, "sponsor", "create_fund", ["Image integrity in open-access papers", ENDS, REWARD, STAKE, MINUTES, 6], 3n * GEN);
await write(C.bystander, "bystander", "fund", [fid], GEN);

// Six real cases. eLife 2020 (PMC7665890), PLOS ONE 2013 (PMC3572008) and PNAS 2019 (PMC6731642) were later corrected by
// their authors for exactly these duplications; Frontiers 2024 (PMC11514072) discloses in its caption that panels B and E
// share a loading control; the last pair is two different wells.
const CASES = [
  { key: "elife_blot", pmcid: "PMC7665890", figure: "elife-60151-fig7-figsupp1.jpg", a: "195,112,348,178", b: "372,112,525,178", la: "GCN2 (T899), RKO", lb: "GCN2 (T899), HT29" },
  { key: "plos_akt", pmcid: "PMC3572008", figure: "pone.0056134.g001.jpg", a: "268,353,377,369", b: "517,353,626,369", la: "Fig 1B Akt, K028", lb: "Fig 1B Akt, M23" },
  { key: "pnas_tubulin", pmcid: "PMC6731642", figure: "pnas.1901323116fig02.jpg", a: "270,74,316,90", b: "325,74,371,90", la: "Fig. 2B A375 Parental, Tubulin", lb: "Fig. 2B A375 AR, Tubulin" },
  { key: "frontiers_actin", pmcid: "PMC11514072", figure: "fphar-15-1443422-g003.jpg", a: "418,119,474,131", b: "611,363,667,375", la: "Panel B (T47D), Actin", lb: "Panel E (T47D), Actin" },
  { key: "elife_wells", pmcid: "PMC7665890", figure: "elife-60151-fig5.jpg", a: "176,67,212,103", b: "66,123,102,159", la: "Fig. 5A WT, GLU +", lb: "Fig. 5A KI, GLN +" },
  { key: "elife_wells_different", pmcid: "PMC7665890", figure: "elife-60151-fig5.jpg", a: "66,67,102,103", b: "66,123,102,159", la: "Fig. 5A WT, GLN +", lb: "Fig. 5A KI, GLN +" },
];
// Stakes come out of GEN credited with deposit(): a reading that fails consensus never strands a stake.
await write(C.reporter, "reporter", "deposit", [], 8n * STAKE);
await write(C.contester, "contester", "deposit", [], 2n * STAKE);
await write(C.bystander, "bystander", "deposit", [], STAKE / 2n);
const ids = {};
for (const c of CASES) {
  const r = await write(C.reporter, "reporter", "file_finding", [fid, c.pmcid, c.figure, c.a, c.b, c.la, c.lb], 0n, { allowError: true });
  if (!String(r.returned).startsWith("finding_")) continue; // refused or undecided: the deposit stays credited
  ids[c.key] = r.returned;
  const d = plain(await read(C.sponsor, "get_finding", [ids[c.key]]));
  console.log(`  -> ${ids[c.key]} ${c.key}: ${d.state} (shape ${d.shape}, model ${d.answer}) ${d.why}`);
}
// Refused (the call reverts; the deposit stays credited).
await write(C.reporter, "reporter", "file_finding", [fid, "PMC8139131", "fig1.jpg", "10,10,60,60", "100,10,150,60", "A", "B"], 0n, { expectError: true }); // retracted
if (ids.elife_blot) await write(C.reporter, "reporter", "file_finding", [fid, CASES[0].pmcid, CASES[0].figure, CASES[0].b, CASES[0].a, "x", "y"], 0n, { expectError: true }); // same panels
await write(C.bystander, "bystander", "file_finding", [fid, CASES[0].pmcid, CASES[0].figure, "195,198,348,288", "372,198,525,288", "eIF2a (S51), RKO", "eIF2a (S51), HT29"], 0n, { expectError: true }); // 0.05 GEN credited, 0.1 needed
await write(C.reporter, "reporter", "file_finding", [fid, CASES[0].pmcid, CASES[0].figure, "400,600,450,619", "530,600,580,619", "Actin, RKO", "Actin, HT29"], 0n, { expectError: true }); // B outside the figure
await reconcile("after filing");

const state = async (id) => plain(await read(C.sponsor, "get_finding", [id])).state;
// A co-author contests the PLOS ONE Akt finding; the second look reads the figure's caption, which does not disclose it.
if (ids.plos_akt && (await state(ids.plos_akt)) === "match") {
  await write(C.contester, "contester", "contest", [ids.plos_akt, "K028 and M23 were run on separate gels; similar Akt bands are expected for these cell lines."], 0n, { allowError: true });
}
// The Frontiers caption itself says panels B and E share the loading control.
if (ids.frontiers_actin && (await state(ids.frontiers_actin)) === "match") {
  await write(C.contester, "contester", "contest", [ids.frontiers_actin, "The caption says: Image (B) and Image (E) are from the same cells in a same experiment, with the same loading control."], 0n, { allowError: true });
}
if (ids.elife_blot) await write(C.reporter, "reporter", "contest", [ids.elife_blot, "My own finding, contested to test the rule."], 0n, { expectError: true }); // reporters cannot contest themselves
// The authors corrected Figure 5A in 2025: a notice published before the finding was filed.
for (const key of ["elife_wells", "pnas_tubulin"]) {
  const st = ids[key] && (await state(ids[key]));
  if (st === "match" || st === "unclear") await write(C.bystander, "bystander", "confirm_by_notice", [ids[key]], 0n, { allowError: true });
}
if (ids.elife_blot) await write(C.bystander, "bystander", "settle", [ids.elife_blot], 0n, { expectError: true });
await reconcile("after contests and the notice");

// Wait for the contest window, then settle every open match.
const open = [];
for (const id of Object.values(ids)) if ((await state(id)) === "match") open.push(id);
if (open.length) {
  const deadline = Math.max(...(await Promise.all(open.map(async (id) => Date.parse(plain(await read(C.sponsor, "get_finding", [id])).deadline + "Z")))));
  const waitMs = deadline - Date.now() + 20000;
  console.log(`  waiting ${Math.round(waitMs / 1000)} s for the contest window to end`);
  if (waitMs > 0) await sleep(waitMs);
  for (const id of open) await write(C.bystander, "bystander", "settle", [id]);
}
await write(C.sponsor, "sponsor", "close", [fid], 0n, { expectError: true }); // findings are taken until the fund's last day
await reconcile("after settling");

const credited = {};
for (const who of ["reporter", "contester", "bystander"]) {
  const owed = BigInt(await read(C.sponsor, "owed_to", [acct[who].address]));
  credited[who] = owed.toString();
  if (owed > 0n) await write(C[who], who, "withdraw", []);
}
await reconcile("end of run, after withdrawals");

const out = { contract: CONTRACT, accounts: Object.fromEntries(Object.entries(acct).map(([k, a]) => [k, a.address])), fund: plain(await read(C.sponsor, "get_fund", [fid])),
  cases: CASES, findings: {}, credited, reconciliations, log };
for (const [k, id] of Object.entries(ids)) out.findings[id] = { case: k, ...plain(await read(C.sponsor, "get_finding", [id])) };
writeFileSync(new URL("../docs/studio/demo-run.json", import.meta.url), JSON.stringify(out, null, 2));
console.log("\nwrote docs/studio/demo-run.json");
for (const [id, d] of Object.entries(out.findings)) console.log(`  ${id} ${d.case}: ${d.state} — ${d.why}`);
