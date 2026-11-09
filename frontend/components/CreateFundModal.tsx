"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { MIN_FUND_WEI, MIN_STAKE_WEI, addDays, formatGen, parseGen, todayUtc } from "@/lib/contracts/types";
import { useFigureCheckWrite } from "@/lib/hooks/useFigureCheck";
import { useWallet } from "@/lib/genlayer/wallet";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const realDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;

/** Fund image-integrity bounties: confirmed findings are paid from the pot. */
export function CreateFundModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { isConnected } = useWallet();
  const { writeAsync, pending } = useFigureCheckWrite();
  const [f, setF] = useState({ title: "Image integrity in open-access papers", ends: addDays(todayUtc(), 60), reward: "0.5", stake: "0.1", minutes: "1440", perReporter: "10", fund: "3" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const reward = parseGen(f.reward);
  const stake = parseGen(f.stake);
  const fund = parseGen(f.fund);
  const problems = [
    !(f.title.trim().length >= 3 && f.title.trim().length <= 80) && "The title must be 3 to 80 characters.",
    !(realDay(f.ends) && f.ends >= todayUtc()) && "The last day must be a real date, today or later.",
    !(reward && reward >= MIN_STAKE_WEI) && "The reward must be at least 0.01 GEN.",
    !(stake && stake >= MIN_STAKE_WEI) && "The stake must be at least 0.01 GEN.",
    !(/^\d{1,5}$/.test(f.minutes) && Number(f.minutes) >= 10 && Number(f.minutes) <= 43200) && "The contest window must be 10 to 43200 minutes.",
    !(/^\d{1,3}$/.test(f.perReporter) && Number(f.perReporter) >= 1 && Number(f.perReporter) <= 100) && "Findings per reporter must be 1 to 100.",
    !(fund && reward && fund >= reward && fund >= MIN_FUND_WEI) && "Fund at least one reward and at least 0.1 GEN.",
  ].filter(Boolean) as string[];
  const rewards = reward && fund && reward > 0n ? Number(fund / reward) : 0;

  const submit = async () => {
    if (!reward || !fund || !stake) return;
    try {
      await writeAsync({ kind: "create", input: { title: f.title.trim(), ends: f.ends, reward, stake, contestMinutes: Number(f.minutes), perReporter: Number(f.perReporter) }, fund });
      onOpenChange(false);
    } catch {
      // shown in the toast and the transactions panel
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="display text-2xl">Fund image-integrity bounties</DialogTitle>
          <DialogDescription>
            Anyone may report two panels of an open-access figure as the same image, with a stake. Your pot pays each confirmed finding; findings that are not
            the same image forfeit their stake to the pot. What is left after the last day comes back to the funders.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={f.title} onChange={set("title")} maxLength={80} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Reward per confirmed finding (GEN)</Label>
              <Input value={f.reward} onChange={set("reward")} inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label>Stake to file or contest (GEN)</Label>
              <Input value={f.stake} onChange={set("stake")} inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label>Contest window (minutes)</Label>
              <Input value={f.minutes} onChange={set("minutes")} inputMode="numeric" />
            </div>
            <div className="space-y-1">
              <Label>Findings per reporter</Label>
              <Input value={f.perReporter} onChange={set("perReporter")} inputMode="numeric" />
            </div>
            <div className="space-y-1">
              <Label>Last day</Label>
              <Input type="date" value={f.ends} onChange={set("ends")} />
            </div>
            <div className="space-y-1">
              <Label>Fund now (GEN)</Label>
              <Input value={f.fund} onChange={set("fund")} inputMode="decimal" />
            </div>
          </div>
          <p className="text-sm rounded-lg bg-[#F4F1E8] p-3">
            Pays up to <strong>{rewards}</strong> confirmed findings. A reward is held from the pot while a match is open to contest.
          </p>
          {problems.length > 0 && (
            <ul className="text-sm text-destructive list-disc pl-5">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <Button className="w-full" onClick={submit} disabled={!isConnected || problems.length > 0 || pending === "create"}>
            {pending === "create" && <Loader2 className="h-4 w-4 animate-spin" />}
            {isConnected ? `Fund ${fund ? formatGen(fund, 4) : "?"} GEN and open the fund` : "Connect a wallet to open a fund"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
