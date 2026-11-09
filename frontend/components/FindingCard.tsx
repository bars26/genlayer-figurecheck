"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileSearch, Gavel, Loader2, Scale } from "lucide-react";
import { STATE_STYLE, ZERO, articleUrl, deadlineMs, figureUrl, formatGen, parseBox, sameAddress, short, type Box, type Finding, type Fund } from "@/lib/contracts/types";
import { useWallet } from "@/lib/genlayer/wallet";
import { useFigureCheckWrite } from "@/lib/hooks/useFigureCheck";
import { useNow } from "@/lib/hooks/useNow";
import { TRANSFORM_NAMES, drawCrop, transformIndex } from "@/lib/pixels";
import { Button } from "./ui/button";

function Crops({ d }: { d: Finding }) {
  const ca = useRef<HTMLCanvasElement>(null);
  const cb = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const a = parseBox(d.box_a);
    const b = parseBox(d.box_b);
    if (!a || !b) return;
    const img = new Image();
    img.src = figureUrl(d.version, d.figure);
    img
      .decode()
      .then(() => {
        const [dx, dy] = (d.offset || "0,0").split(",").map(Number);
        const shifted: Box = [b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy];
        if (ca.current) drawCrop(ca.current, img, a, 220);
        if (cb.current) drawCrop(cb.current, img, shifted, 220, transformIndex(d.transform));
      })
      .catch(() => setFailed(true));
  }, [d]);
  if (failed) return <p className="text-xs text-muted-foreground">The figure could not be loaded.</p>;
  return (
    <div className="grid grid-cols-2 gap-2">
      <figure className="crop-frame">
        <canvas ref={ca} />
        <figcaption title={d.box_a}>A · {d.label_a}</figcaption>
      </figure>
      <figure className="crop-frame">
        <canvas ref={cb} />
        <figcaption title={d.box_b}>
          B · {d.label_b}
          {d.transform ? ` · ${TRANSFORM_NAMES[transformIndex(d.transform)]}` : ""}
        </figcaption>
      </figure>
    </div>
  );
}

export function FindingCard({ finding: d, fund }: { finding: Finding; fund?: Fund }) {
  const { address, isConnected } = useWallet();
  const { writeAsync, pending } = useFigureCheckWrite();
  const now = useNow(5_000);
  const [why, setWhy] = useState("");
  const [contesting, setContesting] = useState(false);
  const style = STATE_STYLE[d.state] ?? { label: d.state, stamp: "stamp-grey", help: "" };
  const due = deadlineMs(d);
  const open = d.state === "match" && now <= due;
  const settleable = d.state === "match" && now > due;
  const left = Math.max(0, Math.round((due - now) / 60000));
  const mine = sameAddress(d.reporter, address);
  const busy = !!pending;

  return (
    <section id={d.id} className="lab-card overflow-hidden animate-fade-in">
      <div className="p-5 sm:p-6 grid gap-4 md:grid-cols-[1fr_240px]">
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-start gap-3">
            <span className={`stamp ${style.stamp}`} title={style.help}>
              {style.label}
            </span>
            <span className="label-tag pt-1">
              {d.id} · {d.fund_id} · filed {d.filed_at.replace("T", " ")} UTC
            </span>
          </div>
          <a href={articleUrl(d.pmcid)} target="_blank" rel="noreferrer" className="display text-xl font-semibold hover:underline inline-flex items-center gap-1.5">
            {d.pmcid} <span className="mono text-sm font-normal text-muted-foreground">{d.figure}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
          <p className="text-sm">{d.why}</p>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="ledger">
              <dt>shape score</dt>
              <dd className="mono">{d.shape}</dd>
            </div>
            <div className="ledger">
              <dt>validators saw</dt>
              <dd className="mono">{d.answer}</dd>
            </div>
            <div className="ledger">
              <dt>stake</dt>
              <dd>{formatGen(d.stake, 4)} GEN</dd>
            </div>
            <div className="ledger">
              <dt>reward</dt>
              <dd>{BigInt(String(d.reward)) > 0n ? `${formatGen(d.reward, 4)} GEN` : "—"}</dd>
            </div>
          </dl>
          {d.contest_text && (
            <blockquote className="border-l-2 border-[#C8102E] pl-3 text-sm">
              <p className="label-tag">contested by {short(d.contester)} · second look: {d.contest_answer}</p>
              <p className="italic">“{d.contest_text}”</p>
            </blockquote>
          )}
          {d.notice && <p className="text-xs">Notice read: <span className="mono">{d.notice}</span></p>}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">Evidence</summary>
            <ul className="mt-2 space-y-1 mono break-all">
              <li>figure {d.version}/{d.figure} · md5 {d.md5} (as published by PubMed Central) · {d.license}</li>
              <li>A {d.box_a} · B {d.box_b} · B aligned by {d.offset} px, {TRANSFORM_NAMES[transformIndex(d.transform)]}</li>
              <li>reporter {d.reporter}</li>
              {d.contester !== ZERO && d.contester && <li>contester {d.contester}</li>}
              <li>packet sha256 {d.packet}</li>
            </ul>
          </details>
        </div>
        <div className="space-y-3">
          <Crops d={d} />
          {open && (
            <p className="text-xs">
              Open to contest for <strong>{left} min</strong> (until {d.deadline.replace("T", " ")} UTC).
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {open && !mine && (
              <Button size="sm" variant="outline" disabled={!isConnected || busy} onClick={() => setContesting((v) => !v)}>
                <Scale className="h-4 w-4" /> Contest
              </Button>
            )}
            {settleable && (
              <Button size="sm" disabled={!isConnected || busy} onClick={() => writeAsync({ kind: "settle", findingId: d.id }).catch(() => {})}>
                {pending === `settle:${d.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />} Settle
              </Button>
            )}
            {(d.state === "match" || d.state === "unclear") && (
              <Button size="sm" variant="ghost" disabled={!isConnected || busy} onClick={() => writeAsync({ kind: "notice", findingId: d.id }).catch(() => {})}
                title="Read the article's correction, erratum or retraction notices (Europe PMC) for an acknowledgment of this image">
                {pending === `notice:${d.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />} Look for a correction
              </Button>
            )}
          </div>
          {contesting && open && (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                writeAsync({ kind: "contest", findingId: d.id, explanation: why.trim(), stake: BigInt(String(d.stake)) })
                  .then(() => setContesting(false))
                  .catch(() => {});
              }}
            >
              <textarea
                className="field text-sm min-h-[80px] py-2"
                placeholder="Why this is not a problem (for example: the caption says both panels share a loading control). The validators read the caption; only the caption counts as disclosure."
                maxLength={600}
                value={why}
                onChange={(e) => setWhy(e.target.value)}
              />
              <Button size="sm" type="submit" disabled={busy || why.trim().length < 10}>
                {pending === `contest:${d.id}` && <Loader2 className="h-4 w-4 animate-spin" />}
                Contest · stake {formatGen(d.stake, 4)} GEN
              </Button>
            </form>
          )}
          {fund && <p className="text-[11px] text-muted-foreground">{fund.title}</p>}
        </div>
      </div>
    </section>
  );
}
