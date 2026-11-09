# FigureCheck: reproduction of the live run

Contract on GenLayer Studio: [`0xB0595462362313C08f7b41dC66BE135eEe8Ce018`](https://explorer-studio.genlayer.com/address/0xB0595462362313C08f7b41dC66BE135eEe8Ce018) (source `contracts/figure_check.py`, checked
byte-identical with `node scripts/verify-code.mjs 0xB0595462362313C08f7b41dC66BE135eEe8Ce018`).

`scripts/demo.mjs` opened a **demo fund** from test wallets and filed findings on **real open-access figures** from the PubMed
Central bucket. Every finding is validator consensus: each validator listed the article's versions, read its metadata, downloaded
the figure, checked it against the md5 PubMed Central publishes, decoded the two panels with the contract's own JPEG decoder,
scored their shapes and, unless the score was below 0.5, looked at the two panels side by side.

Accounts: sponsor `0x3edadb91d6fee63900F1DF431A3b0a442B0842FC`, reporter `0xE888284d7874Bb516D0927a44fE615952cA30ecD`, contester `0x5174F48E1aa7Dc130c6E0bA1481D1Ff1a6d5700e`, bystander `0x7e76E252b2f9800F4B331C4132390BE99CD080E1`.

Fund `fund_0`: reward 0.5 GEN per confirmed finding, stake 0.1 GEN, contest window
10 minutes, 6 findings per reporter. Funded 4 GEN, paid 0.5 GEN.

## Findings

| Finding | Article and figure | Panels (as the paper labels them) | Boxes A / B | Shape | Validators saw | State | Why |
|---|---|---|---|---|---|---|---|
| finding_0 | [PMC7665890](https://pmc.ncbi.nlm.nih.gov/articles/PMC7665890/) [elife-60151-fig7-figsupp1.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC7665890.1/elife-60151-fig7-figsupp1.jpg) | GCN2 (T899), RKO / GCN2 (T899), HT29 | `195,112,348,178` / `372,112,525,178` | 0.922 | UNCLEAR | **unclear** | Could not tell (shape 0.922, validators: UNCLEAR); stake back |
| finding_1 | [PMC3572008](https://pmc.ncbi.nlm.nih.gov/articles/PMC3572008/) [pone.0056134.g001.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC3572008.1/pone.0056134.g001.jpg) | Fig 1B Akt, K028 / Fig 1B Akt, M23 | `268,353,377,369` / `517,353,626,369` | 0.997 | DUPLICATED | **upheld** | Upheld: same image, not disclosed in the caption |
| finding_2 | [PMC6731642](https://pmc.ncbi.nlm.nih.gov/articles/PMC6731642/) [pnas.1901323116fig02.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC6731642.1/pnas.1901323116fig02.jpg) | Fig. 2B A375 Parental, Tubulin / Fig. 2B A375 AR, Tubulin | `270,74,316,90` / `325,74,371,90` | 0.992 | UNCLEAR | **known** | Already acknowledged in PMC12745687 (2025-12-19), before filing; stake back |
| finding_3 | [PMC11514072](https://pmc.ncbi.nlm.nih.gov/articles/PMC11514072/) [fphar-15-1443422-g003.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC11514072.1/fphar-15-1443422-g003.jpg) | Panel B (T47D), Actin / Panel E (T47D), Actin | `418,119,474,131` / `611,363,667,375` | 0.983 | DUPLICATED | **disclosed** | Disclosed: same image, and the caption says so; stakes back |
| finding_4 | [PMC7665890](https://pmc.ncbi.nlm.nih.gov/articles/PMC7665890/) [elife-60151-fig5.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC7665890.1/elife-60151-fig5.jpg) | Fig. 5A WT, GLU + / Fig. 5A KI, GLN + | `176,67,212,103` / `66,123,102,159` | 0.698 | UNCLEAR | **known** | Already acknowledged in PMC12618004 (2025-11-14), before filing; stake back |
| finding_5 | [PMC7665890](https://pmc.ncbi.nlm.nih.gov/articles/PMC7665890/) [elife-60151-fig5.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC7665890.1/elife-60151-fig5.jpg) | Fig. 5A WT, GLN + / Fig. 5A KI, GLN + | `66,67,102,103` / `66,123,102,159` | 0.414 | UNCLEAR | **no_match** | Not the same image (shape 0.414, validators: UNCLEAR); stake to the fund |

## Evidence per finding

| Finding | Figure md5 (as published by PubMed Central) | License | B aligned | Packet sha256 | Second look | Notice |
|---|---|---|---|---|---|---|
| finding_0 | `fa5e56d6e2135799f0b7e0c04f59176c` | CC BY | -1,-4 as is | `8c14f5d4e6127a052fab7a227c2a3d6cfee268ac8e8f143fc762e5d44c230808` |  |  |
| finding_1 | `3a9407f820db2ddd95ddf4b3e2653171` | CC BY | 1,1 as is | `7f13ffb56858da69cfdf28b1239102d9d081e9e0077a6606f5af794e8e5ef1dd` | UPHELD |  |
| finding_2 | `7f2947a5316397fcfab864a3520c8537` | CC BY-NC-ND | 0,0 as is | `7edccab2db12846b4cd142780f53d73a74b8602bb7deb514cf8c33ad9bcb936c` |  | PMC12745687 (2025-12-19) |
| finding_3 | `ece57a0aedc0d268e7c6602e25b1efd4` | CC BY | 2,0 as is | `32e1de96a723ff1ad904b5ffd2143f3e8a9af58100277259bc67cadf349ed7e5` | DISCLOSED |  |
| finding_4 | `28c26173b6c49024af7d73a927894f44` | CC BY | 0,-4 FLIP_LEFT_RIGHT | `14a993e7732a8c6fb22f9bb50243ffabec9bc53062f471f037ecef041e3e5cc6` |  | PMC12618004 (2025-11-14) |
| finding_5 | `28c26173b6c49024af7d73a927894f44` | CC BY | 0,1 ROTATE_180 | `1c1d435e70030dce8f1985512121bc9eea274a5d9533b265961e9cdf6aa63a65` |  |  |

## Balance reconciliation

`totals()` (pots, rewards held for open matches, stakes of open matches, and credited GEN not yet withdrawn) against the
contract's on-chain balance, after every transfer had finalized:

| Point | Expected | Contract balance | Match |
|---|---|---|---|
| after a refused fund: its GEN is credited back | 2 GEN | 2 GEN | yes |
| after filing | 5.05 GEN | 5.05 GEN | yes |
| after contests and the notice | 5.05 GEN | 5.05 GEN | yes |
| after settling | 5.05 GEN | 5.05 GEN | yes |
| end of run, after withdrawals | 3.6 GEN | 3.6 GEN | yes |

Credited before withdrawing: reporter 1.3 GEN, contester 0.1 GEN, bystander 0.05 GEN.

## Wallet test from the live app

Run by hand on 2026-11-09 from https://figurecheck-bars26.vercel.app with MetaMask on GenLayer Studio, opened from a bench link on PLOS ONE PMC3572008 Figure 3C (cyclin D1, M23 vs K033; the 2024 correction says the K033 image was copied from M23). The app deposited the missing stake first, filed the finding, validators saw DUPLICATED at shape 0.993, nobody contested in the 10-minute window, Settle confirmed it and Withdraw paid out the reward plus the stake. Wallet `0x4f80b5c475fced34fc9a07ffccf39e1adc1406bf`.

| Step | GEN sent | Result | Tx |
|---|---|---|---|
| deposit (auto, missing stake) | 0.1 | credited 0.1 GEN | [`0xcc8d5e98…`](https://explorer-studio.genlayer.com/tx/0xcc8d5e988ddcbfdc3f2e68992dc7228ef9ee501dd79bf76f6c1daef60f01d6f0) |
| file_finding PMC3572008 pone.0056134.g003.jpg, boxes 455,251,532,263 / 538,251,615,263 | 0 | match: DUPLICATED, shape 0.993, B offset -1,0, contest until 12:31:59 UTC | [`0x5ad4f4e1…`](https://explorer-studio.genlayer.com/tx/0x5ad4f4e182b80dae4c3f8919371021fdd13e6b6971dcbd880bf1efa9abaa4422) |
| settle finding_6 after the window | 0 | confirmed: 0.5 GEN reward + 0.1 GEN stake credited | [`0x722d262f…`](https://explorer-studio.genlayer.com/tx/0x722d262fd97eff70e32852452850d79666de469218f6813701675f1e6844722b) |
| withdraw | 0 | 0.6 GEN sent to the wallet | [`0x209730a2…`](https://explorer-studio.genlayer.com/tx/0x209730a20f3e62ee2673ca5e39975cecaecdbcd478bdc3cac1c9bbb81e9b954c) |

## Every transaction

| Who | Call | GEN | Result | Returned / refused | Tx |
|---|---|---|---|---|---|
| sponsor | `create_fund("Image integrity in open-access papers", "2026-02-31", 0.5 GEN, 0.1 GEN, 10, 6)` | 2 | SUCCESS | REFUNDED: ends must be a real date, YYYY-MM-DD (your GEN is credited back: withdraw it) | [`0x7c0a2128…`](https://explorer-studio.genlayer.com/tx/0x7c0a212879b992ad0f66608f8b28e38cc4538afbb72a6547105fad93cf3b7a04) |
| sponsor | `withdraw()` | 0 | SUCCESS | 2000000000000000000 | [`0xd72d317a…`](https://explorer-studio.genlayer.com/tx/0xd72d317a216e779af434ae5d35161f26340ea3be3aa76895b76ff244c848a63c) |
| sponsor | `create_fund("Image integrity in open-access papers", "2027-01-08", 0.5 GEN, 0.1 GEN, 10, 6)` | 3 | SUCCESS | fund_0 | [`0xf5b09dcc…`](https://explorer-studio.genlayer.com/tx/0xf5b09dcccc73008b24969217a01626fb0914481a3b02a0859485a5d898b59f7e) |
| bystander | `fund("fund_0")` | 1 | SUCCESS | funded | [`0xfc787515…`](https://explorer-studio.genlayer.com/tx/0xfc787515822f504e488f9c62f3106b20ddfa80dfdb11f85a5f8a8bbea79c0a60) |
| reporter | `deposit()` | 0.8 | SUCCESS | 800000000000000000 | [`0xd232bacf…`](https://explorer-studio.genlayer.com/tx/0xd232bacfb0da1a269de497314fe8d00ffe77346c27f6aa67418abd23336a452b) |
| contester | `deposit()` | 0.2 | SUCCESS | 200000000000000000 | [`0x84379b24…`](https://explorer-studio.genlayer.com/tx/0x84379b24ead1ac274cc133e4a90d0c25add4dc0860cec08f80e7aefe6919e905) |
| bystander | `deposit()` | 0.05 | SUCCESS | 50000000000000000 | [`0x081679f0…`](https://explorer-studio.genlayer.com/tx/0x081679f09e0ad6983e5bb3c6cea426fb804474883ce03ad22db548dcc5892656) |
| reporter | `file_finding("fund_0", "PMC7665890", "elife-60151-fig7-figsupp1.jpg", "195,112,348,178", "372,112,525,178", "GCN2 (T899), RKO", "GCN2 (T899), HT29")` | 0 | SUCCESS | finding_0 | [`0x39139b67…`](https://explorer-studio.genlayer.com/tx/0x39139b6783c1b2ab24622124ecb4da359141238529dfd3334bd44c31c5c890a3) |
| reporter | `file_finding("fund_0", "PMC3572008", "pone.0056134.g001.jpg", "268,353,377,369", "517,353,626,369", "Fig 1B Akt, K028", "Fig 1B Akt, M23")` | 0 | SUCCESS | finding_1 | [`0xc004b8b6…`](https://explorer-studio.genlayer.com/tx/0xc004b8b6fa46f6e3aeb1088fddbfb34e8309ae268166458b3a226e6ded6ac045) |
| reporter | `file_finding("fund_0", "PMC6731642", "pnas.1901323116fig02.jpg", "270,74,316,90", "325,74,371,90", "Fig. 2B A375 Parental, Tubulin", "Fig. 2B A375 AR, Tubulin")` | 0 | SUCCESS | finding_2 | [`0x3ea6a693…`](https://explorer-studio.genlayer.com/tx/0x3ea6a693d983fa1604a966c35c0194f3d7f8feb9dce7595f7fe33710009b12eb) |
| reporter | `file_finding("fund_0", "PMC11514072", "fphar-15-1443422-g003.jpg", "418,119,474,131", "611,363,667,375", "Panel B (T47D), Actin", "Panel E (T47D), Actin")` | 0 | SUCCESS | finding_3 | [`0x5c2a2abd…`](https://explorer-studio.genlayer.com/tx/0x5c2a2abd7554cf41428469bceb1fc04b46e27836d9d77f5c6978dccaca1444b4) |
| reporter | `file_finding("fund_0", "PMC7665890", "elife-60151-fig5.jpg", "176,67,212,103", "66,123,102,159", "Fig. 5A WT, GLU +", "Fig. 5A KI, GLN +")` | 0 | SUCCESS | finding_4 | [`0xf6a9b3d0…`](https://explorer-studio.genlayer.com/tx/0xf6a9b3d0693b7e7ea3b29e70c1cf4ab0bcf35ec5c9f1c9d2bbd36cb0ef01c16b) |
| reporter | `file_finding("fund_0", "PMC7665890", "elife-60151-fig5.jpg", "66,67,102,103", "66,123,102,159", "Fig. 5A WT, GLN +", "Fig. 5A KI, GLN +")` | 0 | SUCCESS | finding_5 | [`0xbf7488ed…`](https://explorer-studio.genlayer.com/tx/0xbf7488ed74539c0a83488d05d492c3748e8d9aa10f2ba857ca67d7f8adc01ef9) |
| reporter | `file_finding("fund_0", "PMC8139131", "fig1.jpg", "10,10,60,60", "100,10,150,60", "A", "B")` | 0 | ERROR | at most 6 findings per reporter in this fund | [`0xf22ebadd…`](https://explorer-studio.genlayer.com/tx/0xf22ebadd0b5b5bca4c580f07907cb8fdce224ddd51e7c7a0962505a8b9ad5b83) |
| reporter | `file_finding("fund_0", "PMC7665890", "elife-60151-fig7-figsupp1.jpg", "372,112,525,178", "195,112,348,178", "x", "y")` | 0 | ERROR | at most 6 findings per reporter in this fund | [`0x729854d7…`](https://explorer-studio.genlayer.com/tx/0x729854d7f5905d89d7d4c3f6bef8a82d0b8dfb4090006fa6f88bc597b6bae003) |
| bystander | `file_finding("fund_0", "PMC7665890", "elife-60151-fig7-figsupp1.jpg", "195,198,348,288", "372,198,525,288", "eIF2a (S51), RKO", "eIF2a (S51), HT29")` | 0 | ERROR | deposit the stake first: 100000000000000000 wei needed, 50000000000000000 credited | [`0xcac9b6f5…`](https://explorer-studio.genlayer.com/tx/0xcac9b6f5b2dfa9d4c428960e2769e45d0b4e5e79ec1d415464cd58964cb7e7e0) |
| reporter | `file_finding("fund_0", "PMC7665890", "elife-60151-fig7-figsupp1.jpg", "400,600,450,619", "530,600,580,619", "Actin, RKO", "Actin, HT29")` | 0 | ERROR | at most 6 findings per reporter in this fund | [`0x9c1360d5…`](https://explorer-studio.genlayer.com/tx/0x9c1360d5ffc7bc6467f43853130ec4cd22f6908a37fe220a06d74d417ac5f8b0) |
| contester | `contest("finding_1", "K028 and M23 were run on separate gels; similar)` | 0 | SUCCESS | upheld | [`0xe95ee1bb…`](https://explorer-studio.genlayer.com/tx/0xe95ee1bb62685f7511ce370958a118997d527e6dd410c346ec162018dc1f6140) |
| contester | `contest("finding_3", "The caption says: Image (B) and Image (E) are f)` | 0 | SUCCESS | disclosed | [`0xd8ceb700…`](https://explorer-studio.genlayer.com/tx/0xd8ceb700fbd4dd0ab76d8bd81a1c62d871e5ee0f61cbc6a830c2e499950402f8) |
| reporter | `contest("finding_0", "My own finding, contested to test the rule.")` | 0 | ERROR | finding_0 is not an open match | [`0x1cb7914b…`](https://explorer-studio.genlayer.com/tx/0x1cb7914bd2abe3e3b27b970cd0a4e1fb62fe4057911bae0addb9141714680997) |
| bystander | `confirm_by_notice("finding_4")` | 0 | SUCCESS | known | [`0xa72a8a8d…`](https://explorer-studio.genlayer.com/tx/0xa72a8a8dce46212d4a7f6f1bb2e2c842cd38723ad8e13b2b6109f3b611a03486) |
| bystander | `confirm_by_notice("finding_2")` | 0 | SUCCESS | known | [`0x5c8e3ccb…`](https://explorer-studio.genlayer.com/tx/0x5c8e3ccb520c5a080b690c504496bc5dd47bac0e7ee41089aa539ff39d99accb) |
| bystander | `settle("finding_0")` | 0 | ERROR | finding_0 is unclear, not an open match | [`0xe9387399…`](https://explorer-studio.genlayer.com/tx/0xe9387399ff1931059d0ef5371ffda9e481b10bf398d1ab93832cac7f1613fc5e) |
| sponsor | `close("fund_0")` | 0 | ERROR | Findings are taken until 2027-01-08 | [`0x75e369e4…`](https://explorer-studio.genlayer.com/tx/0x75e369e41cbedcee9e578f59b5808cddc825a9a0daf63f2c9a52d907a3e75d66) |
| reporter | `withdraw()` | 0 | SUCCESS | 1300000000000000000 | [`0xbe3f5af9…`](https://explorer-studio.genlayer.com/tx/0xbe3f5af9ff0192e389c45c458a97940e7443f7b4eda5ceb1ae21654ad566f134) |
| contester | `withdraw()` | 0 | SUCCESS | 100000000000000000 | [`0x87712dd2…`](https://explorer-studio.genlayer.com/tx/0x87712dd255948b46d5e16b2824f12212efd09a6bdefd059e2088c53129e41054) |
| bystander | `withdraw()` | 0 | SUCCESS | 50000000000000000 | [`0xf36a66d1…`](https://explorer-studio.genlayer.com/tx/0xf36a66d1280e1b4abe86b13a54927d47e01302fdb6309f3c662392148e0086ef) |
