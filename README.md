# FigureCheck

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/license/mit/)

<img src="assets/figurecheck-logo.png" alt="FigureCheck logo" width="96" align="right" />

**The same image, twice? FigureCheck pays for image-integrity findings in open-access research papers. Anyone reports two
panels of a published figure as one image used twice, with a stake; GenLayer validators cut both panels out of the figure as
PubMed Central publishes it, measure them in code and look at them side by side. Findings that hold are paid from a bounty
fund; findings that do not lose their stake.**

Duplicated western blots and microscopy panels are how a large share of corrections and retractions start. Today they are
found by volunteers who post on PubPeer and wait, often years, for a journal to act. FigureCheck turns a finding into a
contract anyone can check and re-check:

1. A **funder** (an integrity group, a journal, a research funder) opens a **fund**: a reward per confirmed finding, the stake to
   file or contest one, a contest window and a cap per reporter.
2. A **reporter** opens any article of the **PubMed Central open-access set** by its PMCID, picks a figure, draws a box around
   panel A, places panel B (same size), names both as the paper labels them, and files the finding with the stake.
3. **Every validator** lists the article's versions in the PMC open-access bucket, reads its metadata (open access, not
   retracted, license), downloads the figure and **checks it against the md5 PubMed Central publishes**. Then:
   - **in code**, decodes both panels with the contract's own JPEG decoder (GenVM's Pillow cannot read JPEG) and computes a
     **shape score**: the best correlation of panel A with panel B shifted up to 10 pixels, mirrored, flipped or turned;
   - unless the score is below 0.5, the validators' **model looks at the two panels side by side**, stretched to full
     contrast and aligned, and answers DUPLICATED, DISTINCT or UNCLEAR: are the specks, band edges and smudges the same?
4. Code decides: **DUPLICATED with a score of at least 0.6 is a match**; DISTINCT, or a score below 0.5, is **no match** (the
   stake goes to the fund); anything else is **unclear** (stake back).
5. A match is **open to contest** (the authors, or anyone) with the same stake and an explanation. The **second look** shows the
   validators the panels again with the figure's **caption** from the article's JATS XML: still the same image and not disclosed
   → **upheld** (the reporter takes both stakes and the reward); the same image but the caption says so (for example "the same
   loading control") → **disclosed** (stakes back, no reward); different images → **overturned** (the contester takes both stakes).
6. An uncontested match is **confirmed** after the window and paid. Any match or unclear finding can also be checked against the
   article's **correction notices**: validators read the article's "Erratum in" / "Correction in" links in Europe PMC, fetch each
   notice's text from PubMed Central and ask whether it acknowledges an image problem in that figure. Published **after** the
   finding was filed, it **confirms** and pays it (a second, independent source); published before, the finding was **already
   known** (stake back, no reward).

**Live app:** [figurecheck-bars26.vercel.app](https://figurecheck-bars26.vercel.app). Open a figure and draw two panels without a
wallet: the app shows both crops and a preview of the shape score. Writes need MetaMask on GenLayer Studio (chain 61999);
**Test GEN** funds your wallet.

**Contract:** [`0x97045EFBC8e879d502ed6975B3Ece2f43045ed59`](https://explorer-studio.genlayer.com/address/0x97045EFBC8e879d502ed6975B3Ece2f43045ed59) on GenLayer Studio.

## Why GenLayer

- **Looking is a judgment.** Whether two blot strips are one image or two samples that look alike is decided by fine details,
  not by any threshold. Every validator looks at the same aligned pair and must agree on one answer.
- **Measuring is code.** The figure, its checksum, the crops, the alignment and the shape score are computed identically by
  every validator; the model is only asked when the numbers leave room, and a match needs both.
- **Disclosure is reading.** Whether a caption discloses reuse ("Image (B) and Image (E) ... with the same loading control") is
  read by the validators from the paper itself, not taken from the contester's word.
- **Nobody's word is the evidence.** The contract reads PubMed Central and Europe PMC itself and stores the figure's md5, the
  boxes, the alignment and a sha256 evidence packet with every ruling.

## Calibrated on real cases

Before writing the contract, probes on GenLayer Studio ran the validators' look on pairs whose truth is known from the authors'
own corrections (eLife 2020 PMC7665890, PNAS 2019 PMC6731642) and on pairs of different samples from the same figures:

| Pair | Truth | Shape score | Validators |
|---|---|---|---|
| eLife Fig 7-S1, GCN2 strip RKO vs HT29 | duplicated (corrected 2025) | 0.922 | DUPLICATED |
| PNAS Fig 2B, A375 tubulin Parental vs AR | duplicated (corrected) | 0.992 | DUPLICATED (UNCLEAR in later runs) |
| eLife Fig 5A, two wells | duplicated, flipped and re-scaled (corrected 2025) | 0.698 | UNCLEAR |
| Five pairs of different samples (wells, eIF2α, actin, tubulin) | different | 0.41 to 0.97 | UNCLEAR, never DUPLICATED |

Blot strips of different samples often score above 0.8 on shape alone, which is why the score is a gate and not the decision.
A first prompt that showed a difference map made the model call everything DISTINCT; a loose prompt called two different
wells DUPLICATED. The prompt in the contract asks for coinciding details and produced no false match in these runs.

## Verified live, on real papers

DEMO_RESULTS

## Who can do what (and the attacks this blocks)

| Rule | Why |
|---|---|
| The figure is read from PubMed Central's open-access bucket and must match the md5 PubMed Central publishes | Nobody can submit a doctored copy of a figure |
| Articles already retracted are refused; only the open-access set is accepted | Findings are about what readers can see and reuse |
| A shape score below 0.5 forfeits the stake without asking the model; a match needs DUPLICATED and at least 0.6 | Spam costs the reporter; the model cannot make a match on its own |
| One finding per pair of panels per fund, a cap per reporter, and the exact stake | Nobody farms rewards by re-filing or splitting |
| A reward is held from the pot when a match is filed, so a match is always payable | Funders cannot drain the pot under an open finding |
| Contests need the same stake, another wallet and an open window; only the figure's own caption counts as disclosure | Reporters cannot contest themselves; contesters cannot talk a match away |
| A correction notice pays only if it was published after the finding was filed | Copying known corrections earns nothing |
| Rewards, stakes and refunds are credited; only `withdraw` sends GEN, to the caller | No call pays a third party or fails on someone else's behalf |
| Funders live in their own maps; closing does a fixed amount of work, each share is credited by its own `refund`; a fund closes only with no open match | No fund can grow so large that closing it strands GEN |
| Payable calls never revert; they credit the GEN back and return `REFUNDED: <reason>`, including dates that do not exist (2026-02-31) | GenLayer keeps the value of a reverted call |

## One source, two networks

`contracts/figure_check.py` runs on GenLayer Studio; a short block at its top picks the API names of the newer py-genlayer runner
that Bradbury testnet (Phase 2) runs, and `scripts/bradbury_source.py` writes `contracts/figure_check.bradbury.py` (the same
program with the Bradbury header and without comments, checked by comparing syntax trees; Bradbury stores deployed source
on-chain and a block holds about 38 KB of it). The 43 direct tests run on both files in CI. The app is deployed on Studio; the
validators' image look was unreliable on Bradbury in November 2026 (two of eight image prompts decided), so FigureCheck is not
deployed there yet.

## The app

- **The bench:** open a PMCID, pick a figure, drag a box around panel A and click where panel B is (arrow buttons nudge it by a
  pixel). Both crops and a preview of the shape score update as you go (the browser decodes the JPEG slightly differently, so
  the preview can differ in the second decimal). Name both panels and file.
- **Findings:** each with its stamp, the two crops as the validators aligned them, the shape score, what the validators saw,
  the evidence (md5, boxes, alignment, packet), a countdown while it can be contested, and buttons to contest, settle or look
  for a correction notice.
- **Funds:** reward, stake, contest window, what was paid, what is held for open matches, a fund box, and after the last day each
  funder's share with a button to credit it. **Your GEN in FigureCheck** shows what you can withdraw.
- Figures are served from this site (`/api/figure`, PubMed Central's bucket sends no CORS headers), so the page can read their
  pixels and keep `img-src 'self'`. Page loads read the registry server-side, CDN-cached (Studio allows 30 calls a minute per IP).

## Run it

```bash
pip install -r requirements.txt
python3 scripts/bradbury_source.py --check
genvm-lint check contracts/figure_check.py && genvm-lint check contracts/figure_check.bradbury.py
pytest tests/direct/ -v                     # 43 tests, real PMC figures in tests/fixtures, reads and the model mocked

# the same tests under the Bradbury runner (genlayer-test 0.30 reads GenVM Manager v0.6.0-rc10)
pip install "genlayer-test==0.30.0rc2" && FIGURECHECK_NETWORK=bradbury pytest tests/direct/ -v

npm install
node scripts/deploy.mjs
node scripts/verify-code.mjs <address>
node scripts/demo.mjs <address>             # the live run above
node scripts/reproduction.mjs               # regenerate docs/REPRODUCTION.md

cd frontend && npm run dev
```

## Limits, stated plainly

- A finding says two panels look like one image on the published figure. It is not an accusation of misconduct: reuse can be
  legitimate, and it is disclosed only if the caption says so.
- PubMed Central's figures are about 700 pixels wide. Small strips and re-scaled duplicates are often UNCLEAR at that
  resolution; UNCLEAR returns the stake, and a later correction notice can still confirm the finding.
- The shape score covers shifts up to 10 pixels, mirroring, flipping and a half turn; it does not search scales or rotations by
  90 degrees. The model sees the pair as aligned by that search.
- Only baseline JPEG figures can be read (all PMC figures sampled were). Both panels must come from one figure file.
- Correction notices are found through Europe PMC's links and read from PubMed Central; notices outside the open-access set
  cannot be read. At most two notices are read per call.
- The demo fund and the wallets are test wallets; the papers, figures, captions and notices are real.

Test figures in `tests/fixtures` are from eLife 9:e60151 (CC BY 4.0). MIT licensed.
