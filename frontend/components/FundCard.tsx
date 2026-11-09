"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { formatGen, funderRow, fundersOf, parseGen, todayUtc, wei, type Fund } from "@/lib/contracts/types";
import { useFigureCheckWrite } from "@/lib/hooks/useFigureCheck";
import { useWallet } from "@/lib/genlayer/wallet";
import { Button } from "./ui/button";

export function FundCard({ fund: program }: { fund: Fund }) {
  const { address, isConnected } = useWallet();
  const { writeAsync, pending } = useFigureCheckWrite();
  const [fundInput, setFundInput] = useState("1");
  const fundWei = parseGen(fundInput);
  const funded = wei(program.funded_total);
  const paid = wei(program.paid_total);
  const open = program.state === "open";
  const takes = open && todayUtc() <= program.ends;
  const canClose = open && todayUtc() > program.ends;
  const mine = funderRow(program, address);
  const toReturn = fundersOf(program).filter((f) => !f.refunded);
  const rewardsLeft = wei(program.reward) > 0n ? Number(wei(program.pot) / wei(program.reward)) : 0;

  return (
    <div className="lab-card overflow-hidden text-sm">
      <div className="lab-head px-5 py-3">
        <p className="label-tag !text-[#B9C6DA]">
          {program.id} · {open ? "open" : "closed"} · {String(program.n_funders)} funder{Number(program.n_funders) === 1 ? "" : "s"}
        </p>
        <p className="display text-lg font-semibold leading-tight">{program.title}</p>
      </div>
      <div className="p-5 space-y-3">
        <p>
          Pays <span className="tape">{formatGen(program.reward, 4)} GEN</span> per confirmed finding. Filing or contesting stakes{" "}
          {formatGen(program.stake, 4)} GEN; matches stay open to contest for {String(program.contest_minutes)} minutes; up to {String(program.per_reporter)} findings
          per reporter, until {program.ends}.
        </p>
        <div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-[#E7E2D3]">
            <div className="bg-[#C8102E]" style={{ width: `${funded > 0n ? Number((paid * 10000n) / funded) / 100 : 0}%` }} />
            <div className="bg-[#13294B]/40" style={{ width: `${funded > 0n ? Number((wei(program.reserved) * 10000n) / funded) / 100 : 0}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatGen(paid, 4)} GEN paid · {formatGen(program.reserved, 4)} held for open matches · {formatGen(program.pot, 4)} free ({rewardsLeft} rewards) ·{" "}
            {String(program.n_findings)} findings
          </p>
        </div>
        {takes && (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (fundWei && fundWei > 0n) writeAsync({ kind: "fund", fundId: program.id, value: fundWei }).catch(() => {});
            }}
          >
            <div className="space-y-1">
              <label className="label-tag" htmlFor={`fund-${program.id}`}>
                add GEN
              </label>
              <input id={`fund-${program.id}`} className="field h-9" style={{ width: 80 }} inputMode="decimal" value={fundInput} onChange={(e) => setFundInput(e.target.value)} />
            </div>
            <Button type="submit" size="sm" variant="outline" className="h-9" disabled={!isConnected || !fundWei || !!pending}>
              {pending === `fund:${program.id}` && <Loader2 className="h-4 w-4 animate-spin" />}
              Fund
            </Button>
          </form>
        )}
        {canClose && (
          <Button size="sm" variant="outline" disabled={!isConnected || !!pending} onClick={() => writeAsync({ kind: "close", fundId: program.id }).catch(() => {})}>
            Close and return the pot
          </Button>
        )}
        {!open && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Closed: {formatGen(program.returned_total, 4)} of {formatGen(program.returnable, 4)} GEN credited back to {String(program.n_refunded)}/{String(program.n_funders)} funders,
              who take it out with Withdraw.
            </p>
            <div className="flex flex-wrap gap-2">
              {mine && !mine.refunded && (
                <Button size="sm" className="h-8" disabled={!!pending} onClick={() => writeAsync({ kind: "refund", fundId: program.id, funder: mine.address }).catch(() => {})}>
                  Credit my share
                </Button>
              )}
              {toReturn
                .filter((f) => f !== mine)
                .slice(0, 4)
                .map((f) => (
                  <Button key={f.address} size="sm" variant="outline" className="h-8 mono text-xs" disabled={!isConnected || !!pending}
                    onClick={() => writeAsync({ kind: "refund", fundId: program.id, funder: f.address }).catch(() => {})}>
                    Credit {f.address.slice(0, 6)}…{f.address.slice(-4)}
                  </Button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
