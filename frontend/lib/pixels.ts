"use client";

/**
 * In-browser preview of the contract's pixel check (contracts/figure_check.py: shape_match). The browser decodes the
 * JPEG with its own decoder and resizes slightly differently from Pillow, so the score can differ in the second
 * decimal: it is a preview, the validators' score is the one that counts.
 */

import type { Box } from "./contracts/types";

export const REACH = 10;

export type Luma = { w: number; h: number; px: Uint8ClampedArray };

export async function loadLuma(src: string): Promise<{ img: HTMLImageElement; luma: Luma }> {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const px = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) px[j] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  return { img, luma: { w: canvas.width, h: canvas.height, px } };
}

function crop(l: Luma, x0: number, y0: number, w: number, h: number, t: number): Float64Array {
  // t: 0 as is, 1 mirrored, 2 flipped, 3 turned 180 degrees
  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sx = t === 1 || t === 3 ? w - 1 - x : x;
      const sy = t === 2 || t === 3 ? h - 1 - y : y;
      out[y * w + x] = l.px[(y0 + sy) * l.w + (x0 + sx)];
    }
  return out;
}

function vec(v: Float64Array, w: number, h: number, n = 32): Float64Array {
  const out = new Float64Array(n * n);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const fx = ((i + 0.5) * w) / n - 0.5;
      const fy = ((j + 0.5) * h) / n - 0.5;
      const x0 = Math.max(0, Math.min(w - 1, Math.floor(fx)));
      const y0 = Math.max(0, Math.min(h - 1, Math.floor(fy)));
      const x1 = Math.min(w - 1, x0 + 1);
      const y1 = Math.min(h - 1, y0 + 1);
      const ax = Math.max(0, Math.min(1, fx - x0));
      const ay = Math.max(0, Math.min(1, fy - y0));
      out[j * n + i] = (v[y0 * w + x0] * (1 - ax) + v[y0 * w + x1] * ax) * (1 - ay) + (v[y1 * w + x0] * (1 - ax) + v[y1 * w + x1] * ax) * ay;
    }
  let m = 0;
  for (const x of out) m += x;
  m /= out.length;
  let s = 0;
  for (let k = 0; k < out.length; k++) {
    out[k] -= m;
    s += out[k] * out[k];
  }
  s = Math.sqrt(s) || 1;
  for (let k = 0; k < out.length; k++) out[k] /= s;
  return out;
}

const dot = (a: Float64Array, b: Float64Array) => {
  let s = 0;
  for (let k = 0; k < a.length; k++) s += a[k] * b[k];
  return s;
};

/** Preview of the shape score: null when a box leaves the figure. */
export function shapeScore(l: Luma, a: Box, b: Box): { score: number; dx: number; dy: number; t: number } | null {
  const w = a[2] - a[0];
  const h = a[3] - a[1];
  if (a[2] > l.w || a[3] > l.h || b[2] > l.w || b[3] > l.h) return null;
  // offsets that keep B's window inside the figure
  const lo = [Math.max(-REACH, -b[0]), Math.max(-REACH, -b[1])];
  const hi = [Math.min(REACH, l.w - b[0] - w), Math.min(REACH, l.h - b[1] - h)];
  const va = vec(crop(l, a[0], a[1], w, h, 0), w, h);
  let best = { score: -2, dx: 0, dy: 0, t: 0 };
  const at = (dx: number, dy: number, t: number) => dot(va, vec(crop(l, b[0] + dx, b[1] + dy, w, h, t), w, h));
  const steps = (from: number, to: number) => [...new Set([...Array.from({ length: Math.floor((to - from) / 2) + 1 }, (_, i) => from + 2 * i), 0])].sort((x, y) => x - y);
  for (const dx of steps(lo[0] + REACH, hi[0] + REACH).map((v) => v - REACH))
    for (const dy of steps(lo[1] + REACH, hi[1] + REACH).map((v) => v - REACH))
      for (let t = 0; t < 4; t++) {
        const s = at(dx, dy, t);
        if (s > best.score) best = { score: s, dx, dy, t };
      }
  const c = best;
  for (let dx = Math.max(lo[0], c.dx - 1); dx <= Math.min(hi[0], c.dx + 1); dx++)
    for (let dy = Math.max(lo[1], c.dy - 1); dy <= Math.min(hi[1], c.dy + 1); dy++) {
      const s = at(dx, dy, c.t);
      if (s > best.score) best = { score: s, dx, dy, t: c.t };
    }
  return { ...best, score: Math.round(best.score * 1000) / 1000 };
}

/** Draw one box of the figure into a canvas, scaled to fit `side`, optionally shifted/turned like the contract aligns it. */
export function drawCrop(canvas: HTMLCanvasElement, img: HTMLImageElement, box: Box, side: number, t = 0) {
  const w = box[2] - box[0];
  const h = box[3] - box[1];
  const scale = side / Math.max(w, h);
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  if (t === 1 || t === 3) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  if (t === 2 || t === 3) {
    ctx.translate(0, canvas.height);
    ctx.scale(1, -1);
  }
  ctx.drawImage(img, box[0], box[1], w, h, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

export const TRANSFORM_NAMES = ["as is", "mirrored", "flipped", "turned 180°"];
export const transformIndex = (t: string) => ({ "": 0, FLIP_LEFT_RIGHT: 1, FLIP_TOP_BOTTOM: 2, ROTATE_180: 3 })[t] ?? 0;
