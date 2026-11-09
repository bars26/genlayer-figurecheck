"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import FigureCheck, { type CreateFundInput, type FileFindingInput, type TxProgress, type TxResult } from "../contracts/FigureCheck";
import { STATE_STYLE, formatGen, sameAddress, todayUtc, type Finding, type Fund } from "../contracts/types";
import { isOnGenLayerNetwork, switchToGenLayerNetwork } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { currentNetwork } from "../network";
import { TxError, classifyError } from "../utils/errors";
import { error, success } from "../utils/toast";
import { startTx, updateTx, type TxKind } from "./useTxLog";

export function useFigureCheckContract(): FigureCheck | null {
  const { address } = useWallet();
  const network = currentNetwork();
  return useMemo(() => (/^0x[0-9a-fA-F]{40}$/.test(network.contract) ? new FigureCheck(network, address) : null), [network, address]);
}

type Registry = { funds: Fund[]; findings: Finding[]; fetchedAt?: string };
const registryKey = () => ["registry", currentNetwork().id];

async function fetchJson(url: string, timeoutMs = 60_000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const res = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return body;
}

/** Every fund and finding, from the CDN-cached server snapshot (app/api/registry); falls back to two direct reads. */
export function useRegistry() {
  const contract = useFigureCheckContract();
  const query = useQuery<Registry, Error>({
    queryKey: registryKey(),
    queryFn: async () => {
      try {
        const body = await fetchJson(`/api/registry?network=${currentNetwork().id}`);
        if (!Array.isArray(body.funds) || !Array.isArray(body.findings)) throw new Error("Malformed snapshot");
        return body as Registry;
      } catch (snapshotErr) {
        if (!contract) throw classifyError(snapshotErr, "read");
        const [funds, findings] = await Promise.all([contract.getFunds(), contract.getFindings()]);
        return { funds, findings, fetchedAt: new Date().toISOString() };
      }
    },
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
  return {
    funds: query.data?.funds ?? [],
    findings: query.data?.findings ?? [],
    fetchedAt: query.data?.fetchedAt,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Re-read what a write touched and merge it into the cached registry. */
async function mergeFresh(qc: ReturnType<typeof useQueryClient>, contract: FigureCheck, fundId?: string, findingId?: string) {
  try {
    const [fund, finding] = await Promise.all([
      fundId ? contract.getFundWithFunders(fundId) : Promise.resolve(null),
      findingId ? contract.getFinding(findingId) : Promise.resolve(null),
    ]);
    qc.setQueryData<Registry>(registryKey(), (prev) => {
      let funds = prev?.funds ?? [];
      let findings = prev?.findings ?? [];
      if (fund) funds = funds.some((f) => f.id === fund.id) ? funds.map((f) => (f.id === fund.id ? fund : f)) : [...funds, fund];
      if (finding) findings = findings.some((d) => d.id === finding.id) ? findings.map((d) => (d.id === finding.id ? finding : d)) : [...findings, finding];
      return { funds, findings, fetchedAt: prev?.fetchedAt };
    });
  } catch {
    // Already confirmed on chain; the next snapshot refresh picks it up.
  }
}

export type WriteVars =
  | { kind: "create"; input: CreateFundInput; fund: bigint }
  | { kind: "fund"; fundId: string; value: bigint }
  | { kind: "file"; input: FileFindingInput; stake: bigint }
  | { kind: "settle"; findingId: string }
  | { kind: "contest"; findingId: string; explanation: string; stake: bigint }
  | { kind: "notice"; findingId: string }
  | { kind: "close"; fundId: string }
  | { kind: "refund"; fundId: string; funder: string }
  | { kind: "withdraw" };

export const WRITE_LABEL: Record<TxKind, string> = {
  create: "Open a fund",
  fund: "Add to the fund",
  file: "File a finding",
  settle: "Settle a finding",
  contest: "Contest a finding",
  notice: "Look for a correction notice",
  close: "Close the fund",
  refund: "Credit a funder's share",
  withdraw: "Withdraw your GEN",
};

const pendingKey = (v: WriteVars) =>
  v.kind === "withdraw" || v.kind === "create"
    ? v.kind
    : v.kind === "file"
      ? `file:${v.input.figure}`
      : v.kind === "refund"
        ? `refund:${v.fundId}:${v.funder.toLowerCase()}`
        : `${v.kind}:${"findingId" in v ? v.findingId : v.fundId}`;

/** One mutation for every FigureCheck write, with a transaction log entry and typed errors. */
export function useFigureCheckWrite() {
  const contract = useFigureCheckContract();
  const { address } = useWallet();
  const qc = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (vars: WriteVars) => {
      const target =
        vars.kind === "withdraw" ? "your credited GEN" : vars.kind === "create" ? vars.input.title : vars.kind === "file" ? `${vars.input.pmcid} · ${vars.input.figure}` : "findingId" in vars ? vars.findingId : vars.fundId;
      const logId = startTx(vars.kind, target);
      setPending(pendingKey(vars));
      const onProgress = (p: TxProgress) =>
        updateTx(logId, { state: p.step === "awaiting_wallet" ? "awaiting_wallet" : p.step === "accepted" ? "accepted" : "confirming", txHash: p.txHash, progress: p.message });
      const refuse = (message: string): never => {
        throw new TxError({ kind: "contract_revert", phase: "estimate", message, hint: "The data was refreshed; nothing was sent." });
      };
      try {
        if (!contract) throw new TxError({ kind: "unknown", phase: "send", message: "The contract address is not configured." });
        if (!address) throw new TxError({ kind: "wallet_missing", phase: "send", message: "No wallet is connected." });
        // A wallet that was already connected keeps whatever chain it was on: ask MetaMask to switch first.
        if (!(await isOnGenLayerNetwork())) {
          try {
            await switchToGenLayerNetwork();
          } catch (err) {
            throw classifyError(err, "send");
          }
        }
        let result: TxResult;
        let fundId = "fundId" in vars ? vars.fundId : vars.kind === "file" ? vars.input.fundId : undefined;
        let findingId = "findingId" in vars ? vars.findingId : undefined;
        let note = "Done.";
        const bradbury = contract.network.id === "bradbury";
        const owedBefore = ["create", "fund", "file", "contest", "withdraw"].includes(vars.kind) ? await contract.owedTo(address) : 0n;
        // A refused payable call (or a reverted one on Bradbury, which reports no return value) shows up as GEN credited back.
        const refusedPayment = async (sent: bigint, txHash: string) => {
          if ((await contract.owedTo(address)) >= owedBefore + sent && sent > 0n) {
            throw new TxError({
              kind: "contract_revert",
              phase: "verify",
              txHash,
              message: "The contract refused this call and credited your GEN back.",
              hint: "Withdraw it from “Your GEN in FigureCheck”. The usual reasons are checked before sending.",
            });
          }
        };
        switch (vars.kind) {
          case "create":
            result = await contract.createFund(vars.input, vars.fund, onProgress);
            if (bradbury) {
              await refusedPayment(vars.fund, result.txHash);
              result.returned = (await contract.getFunds()).filter((f) => sameAddress(f.sponsor, address) && f.title === vars.input.title.trim()).at(-1)?.id;
            }
            fundId = typeof result.returned === "string" ? result.returned : undefined;
            note = fundId ? `${fundId} pays ${formatGen(vars.input.reward, 4)} GEN per confirmed finding until ${vars.input.ends}.` : "Fund opened.";
            break;
          case "fund": {
            const f = await contract.getFund(vars.fundId);
            if (f.state !== "open" || todayUtc() > f.ends) refuse("This fund no longer takes GEN.");
            result = await contract.fund(vars.fundId, vars.value, onProgress);
            if (bradbury) await refusedPayment(vars.value, result.txHash);
            note = "Added to the fund. What is left when it closes returns to funders in proportion.";
            break;
          }
          case "file": {
            const f = await contract.getFund(vars.input.fundId);
            if (f.state !== "open" || todayUtc() > f.ends) refuse("This fund no longer takes findings.");
            result = await contract.fileFinding(vars.input, vars.stake, onProgress);
            if (bradbury) {
              await refusedPayment(vars.stake, result.txHash);
              const mine = (await contract.getFindings()).filter((d) => sameAddress(d.reporter, address) && d.figure === vars.input.figure);
              result.returned = mine.at(-1)?.id;
            }
            findingId = typeof result.returned === "string" ? result.returned : undefined;
            if (findingId) {
              const d = await contract.getFinding(findingId);
              note = `${findingId}: ${STATE_STYLE[d.state]?.label ?? d.state}. ${d.why}`;
            }
            break;
          }
          case "settle":
            result = await contract.settle(vars.findingId, onProgress);
            note = "Confirmed: the reporter's stake and reward are credited.";
            break;
          case "contest": {
            result = await contract.contest(vars.findingId, vars.explanation, vars.stake, onProgress);
            if (bradbury) await refusedPayment(vars.stake, result.txHash);
            const d = await contract.getFinding(vars.findingId);
            note = `Second look: ${STATE_STYLE[d.state]?.label ?? d.state}. ${d.why}`;
            break;
          }
          case "notice": {
            result = await contract.confirmByNotice(vars.findingId, onProgress);
            const d = await contract.getFinding(vars.findingId);
            note = `${STATE_STYLE[d.state]?.label ?? d.state}: ${d.why}`;
            break;
          }
          case "close": {
            const f = await contract.getFund(vars.fundId);
            if (f.state !== "open") refuse("This fund is already closed.");
            if (todayUtc() <= f.ends) refuse(`Findings are taken until ${f.ends}.`);
            result = await contract.close(vars.fundId, onProgress);
            note = "Closed. Each funder's share can now be credited, one funder per transaction, by anyone.";
            break;
          }
          case "refund":
            result = await contract.refund(vars.fundId, vars.funder, onProgress);
            note = `${vars.funder.slice(0, 6)}…${vars.funder.slice(-4)}'s share is credited; they take it out with Withdraw.`;
            break;
          case "withdraw":
            if (owedBefore === 0n) refuse("Nothing is credited to this wallet.");
            result = await contract.withdraw(onProgress);
            note = `${formatGen(owedBefore, 4)} GEN sent to your wallet${bradbury ? " (it arrives about a minute after the transaction finalizes)" : ""}.`;
            break;
        }
        updateTx(logId, { state: "accepted", txHash: result.txHash, status: result.status, executionResult: result.executionResult, progress: note });
        return { fundId, findingId, txHash: result.txHash, kind: vars.kind, note };
      } catch (err) {
        const e = classifyError(err, "send");
        if (contract) mergeFresh(qc, contract, "fundId" in vars ? vars.fundId : undefined, "findingId" in vars ? vars.findingId : undefined);
        updateTx(logId, { state: "failed", txHash: e.txHash, error: { kind: e.kind, message: e.message, hint: e.hint, detail: e.detail, phase: e.phase } });
        error(`${WRITE_LABEL[vars.kind]} failed`, { description: [e.message, e.hint].filter(Boolean).join(" "), duration: 12000 });
        throw err;
      } finally {
        setPending(null);
      }
    },
    onSuccess: ({ fundId, findingId, txHash, kind, note }) => {
      if (contract) mergeFresh(qc, contract, fundId, findingId);
      qc.invalidateQueries({ queryKey: ["genBalance"] });
      qc.invalidateQueries({ queryKey: ["owed"] });
      success(`${WRITE_LABEL[kind]} confirmed`, { description: `${note} Tx ${txHash.slice(0, 10)}…`, duration: 12000 });
    },
  });

  return { write: mutation.mutate, writeAsync: mutation.mutateAsync, pending, isPending: mutation.isPending };
}
