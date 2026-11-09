"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { articleUrl, boxText, figureUrl, formatGen, parseBox, todayUtc, type Box, type Finding, type Fund } from "@/lib/contracts/types";
import { useWallet } from "@/lib/genlayer/wallet";
import { useFigureCheckWrite } from "@/lib/hooks/useFigureCheck";
import { TRANSFORM_NAMES, drawCrop, loadLuma, shapeScore, type Luma } from "@/lib/pixels";
import type { Paper } from "@/lib/pmc";
import { Button } from "./ui/button";

/** Real cases to try. The first three were later corrected by their authors; the last is disclosed in its caption. */
const SAMPLES = [
  { name: "eLife 2020 · Fig 7-S1 blots", pmcid: "PMC7665890", figure: "elife-60151-fig7-figsupp1.jpg", a: "195,112,348,178", b: "372,112,525,178", la: "GCN2 (T899), RKO", lb: "GCN2 (T899), HT29" },
  { name: "PLOS ONE 2013 · Fig 1B Akt", pmcid: "PMC3572008", figure: "pone.0056134.g001.jpg", a: "268,353,377,369", b: "517,353,626,369", la: "Fig 1B Akt, K028", lb: "Fig 1B Akt, M23" },
  { name: "PNAS 2019 · Fig 2B tubulin", pmcid: "PMC6731642", figure: "pnas.1901323116fig02.jpg", a: "270,74,316,90", b: "325,74,371,90", la: "Fig. 2B A375 Parental, Tubulin", lb: "Fig. 2B A375 AR, Tubulin" },
  { name: "Frontiers 2024 · Fig 3 actin", pmcid: "PMC11514072", figure: "fphar-15-1443422-g003.jpg", a: "418,119,474,131", b: "611,363,667,375", la: "Panel B (T47D), Actin", lb: "Panel E (T47D), Actin" },
];

type Mode = "a" | "b";

export function FigureBench({ funds, findings }: { funds: Fund[]; findings: Finding[] }) {
  const [input, setInput] = useState("");
  const [pmcid, setPmcid] = useState<string | null>(null);
  const [figure, setFigure] = useState<string | null>(null);
  const [a, setA] = useState<Box | null>(null);
  const [b, setB] = useState<Box | null>(null);
  const [labels, setLabels] = useState({ a: "", b: "" });
  const [mode, setMode] = useState<Mode>("a");
  const [pic, setPic] = useState<{ img: HTMLImageElement; luma: Luma } | null>(null);
  const [drag, setDrag] = useState<[number, number] | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canA = useRef<HTMLCanvasElement>(null);
  const canB = useRef<HTMLCanvasElement>(null);
  const { isConnected } = useWallet();
  const { writeAsync, pending } = useFigureCheckWrite();

  const q = useQuery<Paper, Error>({
    queryKey: ["paper", pmcid],
    enabled: !!pmcid,
    staleTime: 3_600_000,
    queryFn: async () => {
      const res = await fetch(`/api/paper?pmcid=${pmcid}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body;
    },
  });
  const paper = q.data;
  const fig = paper?.figures.find((f) => f.file === figure);

  useEffect(() => {
    setPic(null);
    if (!paper || !figure) return;
    let live = true;
    loadLuma(figureUrl(paper.version, figure)).then((p) => live && setPic(p)).catch(() => {});
    return () => {
      live = false;
    };
  }, [paper, figure]);

  const score = useMemo(() => (pic && a && b ? shapeScore(pic.luma, a, b) : null), [pic, a, b]);
  useEffect(() => {
    if (!pic) return;
    if (a && canA.current) drawCrop(canA.current, pic.img, a, 200);
    if (b && canB.current) {
      const shifted: Box | null = score ? [b[0] + score.dx, b[1] + score.dy, b[2] + score.dx, b[3] + score.dy] : b;
      drawCrop(canB.current, pic.img, shifted ?? b, 200, score?.t ?? 0);
    }
  }, [pic, a, b, score]);

  const load = (id: string, file?: string) => {
    setPmcid(id.trim().toUpperCase());
    setFigure(file ?? null);
    setA(null);
    setB(null);
    setMode("a");
  };
  const sample = (s: (typeof SAMPLES)[number]) => {
    setInput(s.pmcid);
    setPmcid(s.pmcid);
    setFigure(s.figure);
    setA(parseBox(s.a));
    setB(parseBox(s.b));
    setLabels({ a: s.la, b: s.lb });
    setMode("a");
  };

  // Mouse position in the figure's own pixels.
  const toPx = (e: React.PointerEvent): [number, number] | null => {
    if (!stage.current || !pic) return null;
    const r = stage.current.getBoundingClientRect();
    const k = pic.luma.w / r.width;
    return [Math.round((e.clientX - r.left) * k), Math.round((e.clientY - r.top) * k)];
  };
  const onDown = (e: React.PointerEvent) => {
    const p = toPx(e);
    if (!p || !pic) return;
    if (mode === "a") {
      setDrag(p);
      setA([p[0], p[1], p[0] + 1, p[1] + 1]);
    } else if (a) {
      const w = a[2] - a[0];
      const h = a[3] - a[1];
      const x0 = Math.max(0, Math.min(pic.luma.w - w, p[0] - Math.round(w / 2)));
      const y0 = Math.max(0, Math.min(pic.luma.h - h, p[1] - Math.round(h / 2)));
      setB([x0, y0, x0 + w, y0 + h]);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag || mode !== "a") return;
    const p = toPx(e);
    if (!p) return;
    setA([Math.min(drag[0], p[0]), Math.min(drag[1], p[1]), Math.max(drag[0], p[0]) + 1, Math.max(drag[1], p[1]) + 1]);
  };
  const onUp = () => {
    if (drag && a && a[2] - a[0] >= 12 && a[3] - a[1] >= 12) {
      setMode("b");
      setB(null);
    }
    setDrag(null);
  };
  const nudge = (dx: number, dy: number) => b && setB([b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy]);

  const open = funds.filter((f) => f.state === "open" && todayUtc() <= f.ends);
  const fund = open[0];
  const w = a ? a[2] - a[0] : 0;
  const h = a ? a[3] - a[1] : 0;
  const sizeOk = !!a && w >= 12 && h >= 12 && w <= 360 && h <= 360;
  const already = paper && a && b ? findings.find((d) => d.pmcid === paper.pmcid && d.figure === figure && [d.box_a, d.box_b].sort().join() === [boxText(a), boxText(b)].sort().join()) : undefined;
  const pct = (v: number, of: number) => `${(100 * v) / of}%`;

  return (
    <div className="lab-card overflow-hidden">
      <div className="lab-head px-5 sm:px-6 py-3 flex items-center justify-between">
        <span className="display text-lg font-semibold">The bench</span>
        <span className="label-tag !text-[#B9C6DA]">no wallet needed to look</span>
      </div>
      <div className="p-5 sm:p-6 space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (/^PMC\d{4,9}$/i.test(input.trim())) load(input);
          }}
        >
          <input className="field h-10 mono text-[13px]" placeholder="PubMed Central id, e.g. PMC7665890" value={input} onChange={(e) => setInput(e.target.value)} />
          <Button type="submit" className="h-10" disabled={!/^PMC\d{4,9}$/i.test(input.trim())}>
            <Search className="h-4 w-4" />
            Open
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Try a real case:{" "}
          {SAMPLES.map((s, i) => (
            <span key={s.name}>
              {i > 0 && " · "}
              <button type="button" className="underline decoration-dotted hover:text-foreground" onClick={() => sample(s)}>
                {s.name}
              </button>
            </span>
          ))}
        </p>

        {q.isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading PubMed Central…
          </p>
        )}
        {q.isError && <p className="text-sm text-destructive">{q.error.message}</p>}

        {paper && (
          <div className="space-y-3 animate-fade-in">
            <div>
              <p className="label-tag">
                {paper.pmcid} · v{paper.version.split(".")[1]} · {paper.license || "license ?"} {paper.retracted && "· retracted"}
              </p>
              <a href={articleUrl(paper.pmcid)} target="_blank" rel="noreferrer" className="display text-lg font-semibold leading-snug hover:underline inline-flex gap-1.5">
                {paper.title || paper.pmcid} <ExternalLink className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
              </a>
              <p className="text-xs text-muted-foreground">{paper.citation}</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {paper.figures.map((f) => (
                <button
                  key={f.file}
                  type="button"
                  title={f.caption}
                  onClick={() => {
                    setFigure(f.file);
                    setA(null);
                    setB(null);
                    setMode("a");
                  }}
                  className={`shrink-0 rounded-md border px-2 py-1 text-xs mono ${f.file === figure ? "border-[#13294B] bg-[#13294B] text-white" : "border-border bg-white hover:border-[#13294B]"}`}
                >
                  {f.label.replace(/\.$/, "").slice(0, 28) || f.file}
                </button>
              ))}
            </div>
          </div>
        )}

        {paper && figure && (
          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {mode === "a" ? "Drag a box around panel A." : "Click where panel B is: it gets panel A's size. Arrows nudge it by a pixel."}{" "}
                {a && (
                  <button type="button" className="underline" onClick={() => setMode(mode === "a" ? "b" : "a")}>
                    {mode === "a" ? "place B" : "redraw A"}
                  </button>
                )}
              </p>
              <div
                ref={stage}
                className="relative select-none touch-none cursor-crosshair rounded-md border border-border bg-white"
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerLeave={onUp}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={figureUrl(paper.version, figure)} alt={fig?.label || figure} className="block w-full h-auto" draggable={false} />
                {pic && a && (
                  <div className="box-a" style={{ left: pct(a[0], pic.luma.w), top: pct(a[1], pic.luma.h), width: pct(a[2] - a[0], pic.luma.w), height: pct(a[3] - a[1], pic.luma.h) }}>
                    <span>A</span>
                  </div>
                )}
                {pic && b && (
                  <div className="box-b" style={{ left: pct(b[0], pic.luma.w), top: pct(b[1], pic.luma.h), width: pct(b[2] - b[0], pic.luma.w), height: pct(b[3] - b[1], pic.luma.h) }}>
                    <span>B</span>
                  </div>
                )}
              </div>
              {fig?.caption && <p className="text-xs text-muted-foreground line-clamp-3" title={fig.caption}>{fig.label} {fig.caption}</p>}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                <figure className="crop-frame">
                  <canvas ref={canA} />
                  <figcaption>A {a && `· ${boxText(a)}`}</figcaption>
                </figure>
                <figure className="crop-frame">
                  <canvas ref={canB} />
                  <figcaption>B {b && `· ${boxText(b)}`}</figcaption>
                </figure>
              </div>
              {b && (
                <div className="flex gap-1">
                  {[
                    ["←", -1, 0],
                    ["→", 1, 0],
                    ["↑", 0, -1],
                    ["↓", 0, 1],
                  ].map(([k, dx, dy]) => (
                    <button key={k as string} type="button" className="nudge" onClick={() => nudge(dx as number, dy as number)}>
                      {k}
                    </button>
                  ))}
                </div>
              )}
              {a && b && (
                <div className="rounded-md bg-[#F4F1E8] px-3 py-2 text-xs space-y-1">
                  {score ? (
                    <>
                      <p>
                        Shape score preview <strong className="mono text-sm">{score.score.toFixed(3)}</strong>{" "}
                        <span className="text-muted-foreground">
                          (B {TRANSFORM_NAMES[score.t]}, shifted {score.dx},{score.dy})
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Below 0.5 the stake is lost without a model look; a match needs 0.6 and the validators&apos; DUPLICATED. Bands often score high
                        without being the same image: the validators decide.
                      </p>
                    </>
                  ) : (
                    <p className="text-destructive">Both boxes must lie inside the figure.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {paper && figure && a && b && (
          <div className="perf pt-3 space-y-3">
            <div className="grid sm:grid-cols-2 gap-2">
              <input className="field h-9 text-sm" placeholder="Panel A as the paper labels it" value={labels.a} maxLength={60} onChange={(e) => setLabels({ ...labels, a: e.target.value })} />
              <input className="field h-9 text-sm" placeholder="Panel B as the paper labels it" value={labels.b} maxLength={60} onChange={(e) => setLabels({ ...labels, b: e.target.value })} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground max-w-md">
                Validators read the figure from PubMed Central, check its published checksum, cut both panels out in code, score their shapes and look at
                them side by side. A match can be contested for {fund ? String(fund.contest_minutes) : "?"} minutes.
              </p>
              {already ? (
                <a className="text-sm underline" href={`#${already.id}`}>
                  {already.id} already reports these panels
                </a>
              ) : fund ? (
                <Button
                  size="sm"
                  disabled={!isConnected || !!pending || !sizeOk || !score || !labels.a.trim() || !labels.b.trim() || paper.retracted}
                  onClick={() =>
                    writeAsync({
                      kind: "file",
                      input: { fundId: fund.id, pmcid: paper.pmcid, figure, boxA: boxText(a), boxB: boxText(b), labelA: labels.a.trim(), labelB: labels.b.trim() },
                      stake: BigInt(String(fund.stake)),
                    }).catch(() => {})
                  }
                >
                  {pending === `file:${figure}` && <Loader2 className="h-4 w-4 animate-spin" />}
                  File the finding · stake {formatGen(fund.stake, 4)} GEN · reward {formatGen(fund.reward, 4)} GEN
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">No fund is open to take findings.</span>
              )}
            </div>
            {!sizeOk && <p className="text-xs text-destructive">Panels must be 12 to 360 pixels on each side (A is {w}×{h}).</p>}
          </div>
        )}
      </div>
    </div>
  );
}
