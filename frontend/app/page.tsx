"use client";

import { useState } from "react";
import { BookOpenCheck, Crop, Loader2, RefreshCw, Scale, ScanSearch } from "lucide-react";
import { CreateFundModal } from "@/components/CreateFundModal";
import { FigureBench } from "@/components/FigureBench";
import { FindingCard } from "@/components/FindingCard";
import { FundCard } from "@/components/FundCard";
import { Navbar } from "@/components/Navbar";
import { OwedCard } from "@/components/OwedCard";
import { TransactionPanel } from "@/components/TransactionPanel";
import { Button } from "@/components/ui/button";
import { useRegistry } from "@/lib/hooks/useFigureCheck";
import { addressUrl } from "@/lib/network";
import { useNetwork } from "@/lib/useNetwork";

const STEPS = [
  { icon: ScanSearch, title: "Open a figure", body: "Any article in PubMed Central's open-access set. The figure is the published file, checked against its published checksum." },
  { icon: Crop, title: "Mark two panels", body: "Box the two panels you believe are one image used twice, as the paper labels them. File it with a stake." },
  { icon: BookOpenCheck, title: "Code measures, validators look", body: "Code cuts both panels out and scores their shapes, mirrored and shifted. Validators look at them side by side for details that coincide." },
  { icon: Scale, title: "Contest, then settle", body: "A match is open to contest; a second look reads the figure's caption. Uncontested or upheld findings are paid; a later correction notice can confirm too." },
];

export default function HomePage() {
  const { funds, findings, isLoading, isError, error, isFetching, refetch, fetchedAt } = useRegistry();
  const [creating, setCreating] = useState(false);
  const net = useNetwork();
  const order = ["match", "upheld", "confirmed", "disclosed", "known", "unclear", "overturned", "unresolved", "no_match"];
  const shown = [...findings].sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state) || Number(b.id.split("_")[1]) - Number(a.id.split("_")[1]));
  const held = findings.filter((d) => ["match", "confirmed", "upheld"].includes(d.state)).length;
  const papers = new Set(findings.map((d) => d.pmcid)).size;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onCreate={() => setCreating(true)} />
      <main className="flex-grow pt-24 pb-12 px-4 md:px-6">
        <div className="max-w-6xl mx-auto space-y-10">
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-5 lg:pt-3">
              <p className="label-tag">image integrity · pubmed central open access · genlayer</p>
              <h1 className="display text-[50px] md:text-[64px] font-bold leading-[0.95]">
                The same image,
                <br />
                <span className="text-[#C8102E] italic">twice?</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Duplicated blots and microscopy panels are how many retractions start. FigureCheck lets anyone report two panels of an open-access figure as
                one image used twice, with a stake. GenLayer validators cut both panels out of the published figure, measure them in code and look at them side
                by side; findings that hold are paid from a bounty fund.
              </p>
              <dl className="grid grid-cols-3 gap-2">
                {[
                  ["findings", findings.length],
                  ["matches held", held],
                  ["papers", papers],
                ].map(([k, v]) => (
                  <div key={k as string} className="lab-card px-3 py-2.5">
                    <dt className="label-tag">{k}</dt>
                    <dd className="display text-3xl font-bold">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="lg:col-span-7">
              <FigureBench funds={funds} findings={findings} />
            </div>
          </section>

          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-lg border border-border bg-[#FFFDF8]/80 p-4">
                <p className="flex items-center gap-2">
                  <span className="mono text-xs text-muted-foreground">0{i + 1}</span>
                  <s.icon className="h-4 w-4 text-[#C8102E]" />
                  <strong className="display text-base">{s.title}</strong>
                </p>
                <p className="text-sm text-muted-foreground mt-1.5">{s.body}</p>
              </div>
            ))}
          </section>
          <p className="text-xs text-muted-foreground -mt-6">
            A finding records that two panels look like one image, as judged on the published figure. It is not an accusation of misconduct: reuse can be
            legitimate and disclosed, and the second look reads the caption for exactly that. The fund below is a demo funded by test wallets; the papers are
            real.
          </p>

          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-5">
              <div className="flex items-end justify-between gap-3">
                <h2 className="display text-3xl font-bold">Findings</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {fetchedAt && <span>updated {new Date(fetchedAt).toLocaleTimeString()}</span>}
                  <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh">
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
              {isLoading && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Reading the findings from {net.label}…
                </p>
              )}
              {isError && <p className="text-destructive text-sm">Could not read the contract: {error?.message}</p>}
              {!isLoading && shown.length === 0 && <div className="lab-card p-6 text-center text-muted-foreground">No findings yet: open a figure above.</div>}
              {shown.map((d) => (
                <FindingCard key={d.id} finding={d} fund={funds.find((f) => f.id === d.fund_id)} />
              ))}
            </div>
            <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
              <OwedCard />
              {[...funds].reverse().map((f) => (
                <FundCard key={f.id} fund={f} />
              ))}
              {funds.length === 0 && !isLoading && (
                <div className="lab-card p-5 text-sm space-y-3">
                  <p>No fund pays for findings yet.</p>
                  <Button size="sm" onClick={() => setCreating(true)}>
                    Fund bounties
                  </Button>
                </div>
              )}
              <TransactionPanel />
            </aside>
          </section>
        </div>
      </main>
      <footer className="border-t border-border py-6 px-4 text-center text-xs text-muted-foreground space-y-1">
        <p>
          FigureCheck on {net.label} ·{" "}
          <a className="underline mono" href={addressUrl(net, net.contract)} target="_blank" rel="noreferrer">
            {net.contract.slice(0, 6)}…{net.contract.slice(-4)}
          </a>{" "}
          · figures and captions from the PubMed Central open-access bucket, correction notices from Europe PMC.
        </p>
        <p>
          <a className="underline" href="https://github.com/bars26/genlayer-figurecheck" target="_blank" rel="noreferrer">
            Source and reproduction on GitHub
          </a>
        </p>
      </footer>
      <CreateFundModal open={creating} onOpenChange={setCreating} />
    </div>
  );
}
