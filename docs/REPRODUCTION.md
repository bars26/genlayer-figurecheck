# FigureCheck: reproduction of the live runs

Contract on GenLayer Studio: [`0xf56eBa85685F7Ca624C6078beC9C76cfd48Bd2C0`](https://explorer-studio.genlayer.com/address/0xf56eBa85685F7Ca624C6078beC9C76cfd48Bd2C0) (source `contracts/figure_check.py`, checked
byte-identical with `node scripts/verify-code.mjs 0xf56eBa85685F7Ca624C6078beC9C76cfd48Bd2C0`).

`scripts/demo.mjs` opened a **demo fund** from fresh test wallets and filed findings on **real open-access figures** from the
PubMed Central bucket; it ran 2 times on this contract, each time with its own fund and wallets. Every finding is
validator consensus: each validator listed the article's versions, read its metadata, downloaded the figure, checked it against
the md5 PubMed Central publishes, decoded the two panels with the contract's own JPEG decoder, scored their shapes and, unless the
score was below 0.5, looked at the two panels side by side.

## Wallet test from the live app

Run by hand on 2026-11-09 from https://figurecheck-bars26.vercel.app with MetaMask on GenLayer Studio, opened from a bench link on PLOS ONE PMC3572008 Figure 3C (cyclin D1, M23 vs K033; the 2024 correction says the K033 image was copied from M23). The app deposited the missing stake first, filed the finding in fund_0, validators saw DUPLICATED at shape 0.993, nobody contested in the 10-minute window, Settle confirmed it and Withdraw paid out the reward plus the stake. Nudging box B afterwards, the bench showed that the boxes still cover finding_13's panels. Wallet `0x4f80b5c475fced34fc9a07ffccf39e1adc1406bf`.

| Step | GEN sent | Result | Tx |
|---|---|---|---|
| deposit (auto, missing stake) | 0.1 | credited 0.1 GEN | [`0xf7f1f2ab…`](https://explorer-studio.genlayer.com/tx/0xf7f1f2ab8e49043435863ccfd3595d0c6e37856e2d874e92d05044ec09fe7a15) |
| file_finding fund_0 PMC3572008 pone.0056134.g003.jpg, boxes 455,251,532,263 / 538,251,615,263 | 0 | finding_13 match: DUPLICATED, shape 0.993 | [`0xd3a831d8…`](https://explorer-studio.genlayer.com/tx/0xd3a831d80475681fff946b93519caae1cad6b391f8e0e788f5735c9d5497dd86) |
| settle finding_13 after the window | 0 | confirmed: 0.5 GEN reward + 0.1 GEN stake credited | [`0xa65441b3…`](https://explorer-studio.genlayer.com/tx/0xa65441b3aaa4a00b1a6340fe41f448405265553df55e69d9f73d9c1dccfca66d) |
| withdraw | 0 | 0.6 GEN sent to the wallet | [`0x811d20ed…`](https://explorer-studio.genlayer.com/tx/0x811d20ed781b0482eb8bbb2abc874a29f423ed92ea8afb90f63b4a3570418ba8) |

## Run 1: fund `fund_0`

Accounts: sponsor `0x4F25302fA5EE1077Db8aAE36Ad4acc90D030258a`, reporter `0x0bd59c9dc9B94BD80B05f2b196b566FDfFd286A4`, contester `0x9CF60d5EE7D33562e5bF4cAa4Bfa857F89504831`, bystander `0x54B379497b3BF3370e7C50a5Cb814B005a693B0c`.

Fund `fund_0`: reward 0.5 GEN per confirmed finding, stake 0.1 GEN, contest window
10 minutes, 7 findings per reporter. Funded 4 GEN, paid 0 GEN.

### Findings

| Finding | Article and figure | Panels (as the paper labels them) | Boxes A / B | Shape | Validators saw | State | Why |
|---|---|---|---|---|---|---|---|
| finding_0 | [PMC7665890](https://pmc.ncbi.nlm.nih.gov/articles/PMC7665890/) [elife-60151-fig7-figsupp1.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC7665890.1/elife-60151-fig7-figsupp1.jpg) | GCN2 (T899), RKO / GCN2 (T899), HT29 | `195,112,348,178` / `372,112,525,178` | 0.922 | UNCLEAR | **unclear** | Could not tell (shape 0.922, validators: UNCLEAR); stake back |
| finding_1 | [PMC3572008](https://pmc.ncbi.nlm.nih.gov/articles/PMC3572008/) [pone.0056134.g001.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC3572008.1/pone.0056134.g001.jpg) | Fig 1B Akt, K028 / Fig 1B Akt, M23 | `268,353,377,369` / `517,353,626,369` | 0.997 | UNCLEAR | **unclear** | Could not tell (shape 0.997, validators: UNCLEAR); stake back |
| finding_2 | [PMC6731642](https://pmc.ncbi.nlm.nih.gov/articles/PMC6731642/) [pnas.1901323116fig02.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC6731642.1/pnas.1901323116fig02.jpg) | Fig. 2B A375 Parental, Tubulin / Fig. 2B A375 AR, Tubulin | `270,74,316,90` / `325,74,371,90` | 0.992 | UNCLEAR | **known** | Already acknowledged in PMC12745687 (2025-12-19), before filing; stake back |
| finding_3 | [PMC11514072](https://pmc.ncbi.nlm.nih.gov/articles/PMC11514072/) [fphar-15-1443422-g003.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC11514072.1/fphar-15-1443422-g003.jpg) | Panel B (T47D), Actin / Panel E (T47D), Actin | `418,119,474,131` / `611,363,667,375` | 0.983 | UNCLEAR | **unclear** | Could not tell (shape 0.983, validators: UNCLEAR); stake back |
| finding_4 | [PMC7665890](https://pmc.ncbi.nlm.nih.gov/articles/PMC7665890/) [elife-60151-fig5.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC7665890.1/elife-60151-fig5.jpg) | Fig. 5A WT, GLU + / Fig. 5A KI, GLN + | `176,67,212,103` / `66,123,102,159` | 0.698 | UNCLEAR | **known** | Already acknowledged in PMC12618004 (2025-11-14), before filing; stake back |
| finding_5 | [PMC7665890](https://pmc.ncbi.nlm.nih.gov/articles/PMC7665890/) [elife-60151-fig5.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC7665890.1/elife-60151-fig5.jpg) | Fig. 5A WT, GLN + / Fig. 5A KI, GLN + | `66,67,102,103` / `66,123,102,159` | 0.414 | UNCLEAR | **no_match** | Not the same image (shape 0.414, validators: UNCLEAR); stake to the fund |

### Evidence per finding

| Finding | Figure md5 (as published by PubMed Central) | License | B aligned | Packet sha256 | Second look | Notice |
|---|---|---|---|---|---|---|
| finding_0 | `fa5e56d6e2135799f0b7e0c04f59176c` | CC BY | -1,-4 as is | `6f1ccd66efbcb4dba50da9e36495c0a771f0dea94330fd58d910ed43d855481a` |  |  |
| finding_1 | `3a9407f820db2ddd95ddf4b3e2653171` | CC BY | 1,1 as is | `71b19af2a5e80f660e9157618f66f7b14bea14bfc2165f71e8a0f4f880cde501` |  |  |
| finding_2 | `7f2947a5316397fcfab864a3520c8537` | CC BY-NC-ND | 0,0 as is | `98ffdcb87e8e299a7106bfeeccff971dfd66b8222463bd818474071fd623ad0d` |  | PMC12745687 (2025-12-19) |
| finding_3 | `ece57a0aedc0d268e7c6602e25b1efd4` | CC BY | 2,0 as is | `8ec39a3700d4c5c70a0bc998b718b67c4c8416e05cb66fe74210fda9eca7fe25` |  |  |
| finding_4 | `28c26173b6c49024af7d73a927894f44` | CC BY | 0,-4 FLIP_LEFT_RIGHT | `74e5598a1b1fd0fafd5d33c79c6e4745e4880fc7fa8a8f7b416ec18ed2f6cd0b` |  | PMC12618004 (2025-11-14) |
| finding_5 | `28c26173b6c49024af7d73a927894f44` | CC BY | 0,1 ROTATE_180 | `9739fa138d6e330a3e8f5dbfb667f65ddd93253f4d4bc4a7b462bdd763b02e12` |  |  |

### Balance reconciliation

`totals()` (pots, rewards held for open matches, stakes of open matches, and credited GEN not yet withdrawn) against the
contract's on-chain balance, after every transfer had finalized:

| Point | Expected | Contract balance | Match |
|---|---|---|---|
| after a refused fund: its GEN is credited back | 2 GEN | 2 GEN | yes |
| after filing | 5.05 GEN | 5.05 GEN | yes |
| after contests and the notice | 5.05 GEN | 5.05 GEN | yes |
| after settling | 5.05 GEN | 5.05 GEN | yes |
| end of run, after withdrawals | 4.2 GEN | 4.2 GEN | yes |

Credited before withdrawing: reporter 0.6 GEN, contester 0.2 GEN, bystander 0.05 GEN.

### Every transaction

| Who | Call | GEN | Result | Returned / refused | Tx |
|---|---|---|---|---|---|
| sponsor | `create_fund("Image integrity in open-access papers", "2026-02-31", 0.5 GEN, 0.1 GEN, 10, 7)` | 2 | SUCCESS | REFUNDED: ends must be a real date, YYYY-MM-DD (your GEN is credited back: withdraw it) | [`0x61bf8e9d…`](https://explorer-studio.genlayer.com/tx/0x61bf8e9d70c5d901565b62547a586dd469ef4937294a8b045bbab355d4b6e252) |
| sponsor | `withdraw()` | 0 | SUCCESS | 2000000000000000000 | [`0x6d5c6d57…`](https://explorer-studio.genlayer.com/tx/0x6d5c6d578cadfbd63d1da43b65f2b36cbd98e91f1ffab3de064f51f4709a5ca6) |
| sponsor | `create_fund("Image integrity in open-access papers", "2027-01-08", 0.5 GEN, 0.1 GEN, 10, 7)` | 3 | SUCCESS | fund_0 | [`0xc27ca4f0…`](https://explorer-studio.genlayer.com/tx/0xc27ca4f06caf7ce9a2e526d8ca856af781381a6161989fd8ad3e90ca87683984) |
| bystander | `fund("fund_0")` | 1 | SUCCESS | funded | [`0x1c01ff68…`](https://explorer-studio.genlayer.com/tx/0x1c01ff68ac2c3372a318d2268c2e807711bb83bd8fab27afd273555694cc58d3) |
| reporter | `deposit()` | 0.8 | SUCCESS | 800000000000000000 | [`0x5b2de77e…`](https://explorer-studio.genlayer.com/tx/0x5b2de77e01047801beb50496c9537a3ed2b241fcd848c475cf66a2008e450ae3) |
| contester | `deposit()` | 0.2 | SUCCESS | 200000000000000000 | [`0xa46711f6…`](https://explorer-studio.genlayer.com/tx/0xa46711f676e66a1850f7e0d1f1427a343697fcfac3d068155836e610b52d185b) |
| bystander | `deposit()` | 0.05 | SUCCESS | 50000000000000000 | [`0xce2bc396…`](https://explorer-studio.genlayer.com/tx/0xce2bc3965e3a25549114cdafae4e1bd026033af3dc72dc7551c6ce62739d8da9) |
| reporter | `file_finding("fund_0", "PMC7665890", "elife-60151-fig7-figsupp1.jpg", "195,112,348,178", "372,112,525,178", "GCN2 (T899), RKO", "GCN2 (T899), HT29")` | 0 | SUCCESS | finding_0 | [`0xc171d4f6…`](https://explorer-studio.genlayer.com/tx/0xc171d4f67f2b4740b6ea3a8c1bbf26c900ddf9d4d2fb011f17e90f56183852ab) |
| reporter | `file_finding("fund_0", "PMC3572008", "pone.0056134.g001.jpg", "268,353,377,369", "517,353,626,369", "Fig 1B Akt, K028", "Fig 1B Akt, M23")` | 0 | SUCCESS | finding_1 | [`0x2908449d…`](https://explorer-studio.genlayer.com/tx/0x2908449d99746994f6905b75ba346bbe55254b10cfc5bd2041abadbf21c97df0) |
| reporter | `file_finding("fund_0", "PMC6731642", "pnas.1901323116fig02.jpg", "270,74,316,90", "325,74,371,90", "Fig. 2B A375 Parental, Tubulin", "Fig. 2B A375 AR, Tubulin")` | 0 | SUCCESS | finding_2 | [`0x953d47b2…`](https://explorer-studio.genlayer.com/tx/0x953d47b2b3bf00115dbcef4f2203983b9b74c82e6fdb8a466034c0a8dc6f1e09) |
| reporter | `file_finding("fund_0", "PMC11514072", "fphar-15-1443422-g003.jpg", "418,119,474,131", "611,363,667,375", "Panel B (T47D), Actin", "Panel E (T47D), Actin")` | 0 | SUCCESS | finding_3 | [`0x5dd4d306…`](https://explorer-studio.genlayer.com/tx/0x5dd4d306c1799d4dcf6650dd5df0045051ada76ce0320021671532556794999b) |
| reporter | `file_finding("fund_0", "PMC7665890", "elife-60151-fig5.jpg", "176,67,212,103", "66,123,102,159", "Fig. 5A WT, GLU +", "Fig. 5A KI, GLN +")` | 0 | SUCCESS | finding_4 | [`0xe96151e3…`](https://explorer-studio.genlayer.com/tx/0xe96151e31c6487110422ba90eccde524b858cdf76b022e8b1f8fd2fef364d25c) |
| reporter | `file_finding("fund_0", "PMC7665890", "elife-60151-fig5.jpg", "66,67,102,103", "66,123,102,159", "Fig. 5A WT, GLN +", "Fig. 5A KI, GLN +")` | 0 | SUCCESS | finding_5 | [`0x20925e12…`](https://explorer-studio.genlayer.com/tx/0x20925e12bee300b3d3661ddb82f3037602446a02ad24d131528ae8c44d368ec9) |
| reporter | `file_finding("fund_0", "PMC8139131", "fig1.jpg", "10,10,60,60", "100,10,150,60", "A", "B")` | 0 | ERROR | PMC8139131/fig1.jpg: retracted | [`0x6060b0e5…`](https://explorer-studio.genlayer.com/tx/0x6060b0e582c3881d1c48d0110301ebfa803823de47bc83949a44c5373f9cc476) |
| reporter | `file_finding("fund_0", "PMC7665890", "elife-60151-fig7-figsupp1.jpg", "372,112,525,178", "195,112,348,178", "x", "y")` | 0 | ERROR | finding_0 already reports these panels | [`0x3b7fcbbc…`](https://explorer-studio.genlayer.com/tx/0x3b7fcbbce02adf2382bc142f6521dc8fd311547490b3ceba1492e07d162fff0e) |
| bystander | `file_finding("fund_0", "PMC3572008", "pone.0056134.g001.jpg", "270,354,379,370", "519,354,628,370", "Akt K028", "Akt M23")` | 0 | ERROR | finding_1 already reports these panels | [`0x02b77176…`](https://explorer-studio.genlayer.com/tx/0x02b77176e72521ee0124b2d16203bbb5739a8955e536ed0561476f8bb3044303) |
| bystander | `file_finding("fund_0", "PMC7665890", "elife-60151-fig7-figsupp1.jpg", "195,198,348,288", "372,198,525,288", "eIF2a (S51), RKO", "eIF2a (S51), HT29")` | 0 | ERROR | deposit the stake first: 100000000000000000 wei needed, 50000000000000000 credited | [`0xb558f743…`](https://explorer-studio.genlayer.com/tx/0xb558f74356b9b9bb05ac4a66c4a9cf998ff8c8c0ca50a802cb3be311f3bed729) |
| reporter | `file_finding("fund_0", "PMC7665890", "elife-60151-fig7-figsupp1.jpg", "400,600,450,619", "530,600,580,619", "Actin, RKO", "Actin, HT29")` | 0 | ERROR | PMC7665890/elife-60151-fig7-figsupp1.jpg: outside (the figure is 568x719) | [`0x28b477f3…`](https://explorer-studio.genlayer.com/tx/0x28b477f3c508c6019ebd5c82dc965633e5083ba22e639baf5db5095b765a27fb) |
| reporter | `file_finding("fund_0", "PMC7665890", "elife-60151-fig5.jpg", "66,67,102,103", "66,123,102,159", "Fig. 5A WT, GLN +", "Fig. 5A KI, GLN +")` | 0 | SUCCESS | finding_6 | [`0x1a7187c9…`](https://explorer-studio.genlayer.com/tx/0x1a7187c9e45f7652cbc6bb0d024585b528d994d81b680a889785a13c5fe0b2ee) |
| reporter | `file_finding("fund_0", "PMC7665890", "elife-60151-fig5.jpg", "66,67,102,103", "66,123,102,159", "Fig. 5A WT, GLN +", "Fig. 5A KI, GLN +")` | 0 | ERROR | at most 7 findings per reporter in this fund | [`0x01fb667b…`](https://explorer-studio.genlayer.com/tx/0x01fb667bb912d0e0342c2588fe436c600bdac9eb100c7961316532e461a18d4d) |
| bystander | `confirm_by_notice("finding_4")` | 0 | SUCCESS | known | [`0x995cbc90…`](https://explorer-studio.genlayer.com/tx/0x995cbc905359e2b3247ee3eb39d9ede5b395716d15ebf132ecb407151e81a086) |
| bystander | `confirm_by_notice("finding_2")` | 0 | SUCCESS | known | [`0x72b06810…`](https://explorer-studio.genlayer.com/tx/0x72b068106b75d90ab5ee0027cdf0a54dc2413e366cbd54103d7fbd250e51d2f3) |
| bystander | `settle("finding_0")` | 0 | ERROR | finding_0 is unclear, not an open match | [`0xa50e7218…`](https://explorer-studio.genlayer.com/tx/0xa50e7218fc855250fd1eb963e2c2b8529f28a861b41d183e3cd15f761391fcf5) |
| sponsor | `close("fund_0")` | 0 | ERROR | Findings are taken until 2027-01-08 | [`0xd0490a0c…`](https://explorer-studio.genlayer.com/tx/0xd0490a0c32a1af401542fca6e48121d67935a4a1b40660838258ac9f029172c1) |
| reporter | `withdraw()` | 0 | SUCCESS | 600000000000000000 | [`0x76dec25f…`](https://explorer-studio.genlayer.com/tx/0x76dec25f2067efda49a49186c8e34572c8a3ac9186ef9c7e0dcbc50a0000e8f7) |
| contester | `withdraw()` | 0 | SUCCESS | 200000000000000000 | [`0x17fe3c4a…`](https://explorer-studio.genlayer.com/tx/0x17fe3c4a55e1a5c985b3cfe1db31dc494248b3c2c9e810294eba2705895e7252) |
| bystander | `withdraw()` | 0 | SUCCESS | 50000000000000000 | [`0xfdd088fc…`](https://explorer-studio.genlayer.com/tx/0xfdd088fc0b6a1860aa46f80193492f88d9d1f50cf18af780c3c232298aea2c61) |

## Run 2: fund `fund_1`

Accounts: sponsor `0xb3b282A4F8C2ae19215380b16Bf888F54B9512D3`, reporter `0x00dcA5C67902005F10887645c85c0043b86218b4`, contester `0x3d159861ee9484D2ee8f853D1a633f0a00EE00e2`, bystander `0xC888684D7Fe0EC743Fd8820FA0c05226f1Ba794a`.

Fund `fund_1`: reward 0.5 GEN per confirmed finding, stake 0.1 GEN, contest window
10 minutes, 7 findings per reporter. Funded 4 GEN, paid 0.5 GEN.

### Findings

| Finding | Article and figure | Panels (as the paper labels them) | Boxes A / B | Shape | Validators saw | State | Why |
|---|---|---|---|---|---|---|---|
| finding_7 | [PMC7665890](https://pmc.ncbi.nlm.nih.gov/articles/PMC7665890/) [elife-60151-fig7-figsupp1.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC7665890.1/elife-60151-fig7-figsupp1.jpg) | GCN2 (T899), RKO / GCN2 (T899), HT29 | `195,112,348,178` / `372,112,525,178` | 0.922 | DUPLICATED | **confirmed** | Confirmed: same image, uncontested by 2026-11-09T13:59:00 UTC |
| finding_8 | [PMC3572008](https://pmc.ncbi.nlm.nih.gov/articles/PMC3572008/) [pone.0056134.g001.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC3572008.1/pone.0056134.g001.jpg) | Fig 1B Akt, K028 / Fig 1B Akt, M23 | `268,353,377,369` / `517,353,626,369` | 0.997 | UNCLEAR | **unclear** | Could not tell (shape 0.997, validators: UNCLEAR); stake back |
| finding_9 | [PMC6731642](https://pmc.ncbi.nlm.nih.gov/articles/PMC6731642/) [pnas.1901323116fig02.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC6731642.1/pnas.1901323116fig02.jpg) | Fig. 2B A375 Parental, Tubulin / Fig. 2B A375 AR, Tubulin | `270,74,316,90` / `325,74,371,90` | 0.992 | UNCLEAR | **known** | Already acknowledged in PMC12745687 (2025-12-19), before filing; stake back |
| finding_10 | [PMC11514072](https://pmc.ncbi.nlm.nih.gov/articles/PMC11514072/) [fphar-15-1443422-g003.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC11514072.1/fphar-15-1443422-g003.jpg) | Panel B (T47D), Actin / Panel E (T47D), Actin | `418,119,474,131` / `611,363,667,375` | 0.983 | UNCLEAR | **unclear** | Could not tell (shape 0.983, validators: UNCLEAR); stake back |
| finding_11 | [PMC7665890](https://pmc.ncbi.nlm.nih.gov/articles/PMC7665890/) [elife-60151-fig5.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC7665890.1/elife-60151-fig5.jpg) | Fig. 5A WT, GLU + / Fig. 5A KI, GLN + | `176,67,212,103` / `66,123,102,159` | 0.698 | UNCLEAR | **known** | Already acknowledged in PMC12618004 (2025-11-14), before filing; stake back |
| finding_12 | [PMC7665890](https://pmc.ncbi.nlm.nih.gov/articles/PMC7665890/) [elife-60151-fig5.jpg](https://pmc-oa-opendata.s3.amazonaws.com/PMC7665890.1/elife-60151-fig5.jpg) | Fig. 5A WT, GLN + / Fig. 5A KI, GLN + | `66,67,102,103` / `66,123,102,159` | 0.414 | UNCLEAR | **no_match** | Not the same image (shape 0.414, validators: UNCLEAR); stake to the fund |

### Evidence per finding

| Finding | Figure md5 (as published by PubMed Central) | License | B aligned | Packet sha256 | Second look | Notice |
|---|---|---|---|---|---|---|
| finding_7 | `fa5e56d6e2135799f0b7e0c04f59176c` | CC BY | -1,-4 as is | `5030a1701d7675666d0ac49d749e4366ed555737f4577cdc34a592221aab79be` |  |  |
| finding_8 | `3a9407f820db2ddd95ddf4b3e2653171` | CC BY | 1,1 as is | `d0f9a4823a1767b4df8c476c55a3962a2b53d81e5a3e423c24ef563f9f6f4458` |  |  |
| finding_9 | `7f2947a5316397fcfab864a3520c8537` | CC BY-NC-ND | 0,0 as is | `9e2a75a64ee8a847cfc86e4141c11ac6fec88b0db04310e5f76e36c949f83ecd` |  | PMC12745687 (2025-12-19) |
| finding_10 | `ece57a0aedc0d268e7c6602e25b1efd4` | CC BY | 2,0 as is | `b5e5fb8e065fad43ef7cb758da9ca57b0bb26c6c71b88494c111edb9913b851a` |  |  |
| finding_11 | `28c26173b6c49024af7d73a927894f44` | CC BY | 0,-4 FLIP_LEFT_RIGHT | `e5c47d0a30d1aea7070318c822fc74925311c24ecc96ac85ac8c764d223ae4ed` |  | PMC12618004 (2025-11-14) |
| finding_12 | `28c26173b6c49024af7d73a927894f44` | CC BY | 0,1 ROTATE_180 | `fd991b9eed11a007d885d5a9675e5d1aa189d5b5cc13663ca1cd23f4fba7b962` |  |  |

### Balance reconciliation

`totals()` (pots, rewards held for open matches, stakes of open matches, and credited GEN not yet withdrawn) against the
contract's on-chain balance, after every transfer had finalized:

| Point | Expected | Contract balance | Match |
|---|---|---|---|
| after a refused fund: its GEN is credited back | 6.2 GEN | 6.2 GEN | yes |
| after filing | 9.35 GEN | 9.35 GEN | yes |
| after contests and the notice | 9.35 GEN | 9.35 GEN | yes |
| after settling | 9.35 GEN | 9.35 GEN | yes |
| end of run, after withdrawals | 8 GEN | 8 GEN | yes |

Credited before withdrawing: reporter 1.1 GEN, contester 0.2 GEN, bystander 0.05 GEN.

### Every transaction

| Who | Call | GEN | Result | Returned / refused | Tx |
|---|---|---|---|---|---|
| sponsor | `create_fund("Image integrity in open-access papers", "2026-02-31", 0.5 GEN, 0.1 GEN, 10, 7)` | 2 | SUCCESS | REFUNDED: ends must be a real date, YYYY-MM-DD (your GEN is credited back: withdraw it) | [`0xbd8193fa…`](https://explorer-studio.genlayer.com/tx/0xbd8193fad1bfbfad7b4452d3ffb9a967d403aac6268b00b014a90ec24fee5a6e) |
| sponsor | `withdraw()` | 0 | SUCCESS | 2000000000000000000 | [`0x3fb539f0…`](https://explorer-studio.genlayer.com/tx/0x3fb539f046455c1b07e0f78836e51cf141a593a3c9d9137edfa6aefdbeaf2cad) |
| sponsor | `create_fund("Image integrity in open-access papers", "2027-01-08", 0.5 GEN, 0.1 GEN, 10, 7)` | 3 | SUCCESS | fund_1 | [`0x18d35860…`](https://explorer-studio.genlayer.com/tx/0x18d358603e4aa87327198fa6b0df6d25d2e12f1e71f4dac54dbb91db960e559a) |
| bystander | `fund("fund_1")` | 1 | SUCCESS | funded | [`0x840eb126…`](https://explorer-studio.genlayer.com/tx/0x840eb126fcfecc6faf31bfa4744c8c0c6eb5c91591a85965e0e9dc957f004490) |
| reporter | `deposit()` | 0.8 | SUCCESS | 800000000000000000 | [`0x2a243efe…`](https://explorer-studio.genlayer.com/tx/0x2a243efedb726f3da1c101812654ef9401cba5cc69dac75d9d05f49a6e6cc78b) |
| contester | `deposit()` | 0.2 | SUCCESS | 200000000000000000 | [`0xa481eec4…`](https://explorer-studio.genlayer.com/tx/0xa481eec47364eee2ddfbc11a1d8c5d4fe8547c1ab054d58c6ab7990bc2fcad9d) |
| bystander | `deposit()` | 0.05 | SUCCESS | 50000000000000000 | [`0x350f6722…`](https://explorer-studio.genlayer.com/tx/0x350f6722d7f5d3e0a823c1224df3cfec2e03049d21e1077a0177364ee2685725) |
| reporter | `file_finding("fund_1", "PMC7665890", "elife-60151-fig7-figsupp1.jpg", "195,112,348,178", "372,112,525,178", "GCN2 (T899), RKO", "GCN2 (T899), HT29")` | 0 | SUCCESS | finding_7 | [`0x885d1a50…`](https://explorer-studio.genlayer.com/tx/0x885d1a50bc0eec14d05d386bff994d4e4aa947318b195ffed797dc7cf571a8f1) |
| reporter | `file_finding("fund_1", "PMC3572008", "pone.0056134.g001.jpg", "268,353,377,369", "517,353,626,369", "Fig 1B Akt, K028", "Fig 1B Akt, M23")` | 0 | SUCCESS | finding_8 | [`0xa1596c35…`](https://explorer-studio.genlayer.com/tx/0xa1596c35d7861df6b061494f1a751f15e8814cf1770c309c82349d7f819400ab) |
| reporter | `file_finding("fund_1", "PMC6731642", "pnas.1901323116fig02.jpg", "270,74,316,90", "325,74,371,90", "Fig. 2B A375 Parental, Tubulin", "Fig. 2B A375 AR, Tubulin")` | 0 | SUCCESS | finding_9 | [`0x50cca52d…`](https://explorer-studio.genlayer.com/tx/0x50cca52d636d4b325f28f8224d763b9260092ce72c519acf9edafb5231f38a15) |
| reporter | `file_finding("fund_1", "PMC11514072", "fphar-15-1443422-g003.jpg", "418,119,474,131", "611,363,667,375", "Panel B (T47D), Actin", "Panel E (T47D), Actin")` | 0 | SUCCESS | finding_10 | [`0x351c554c…`](https://explorer-studio.genlayer.com/tx/0x351c554cb74d6c6a17bfb21dfe1bed3cc0d5ebc96a9d7464917fa759f627cabb) |
| reporter | `file_finding("fund_1", "PMC7665890", "elife-60151-fig5.jpg", "176,67,212,103", "66,123,102,159", "Fig. 5A WT, GLU +", "Fig. 5A KI, GLN +")` | 0 | SUCCESS | finding_11 | [`0x763fe78d…`](https://explorer-studio.genlayer.com/tx/0x763fe78d675e169e5600fc8b8c56fe6d62f5b740d38d124b1f2bc89cb42bad05) |
| reporter | `file_finding("fund_1", "PMC7665890", "elife-60151-fig5.jpg", "66,67,102,103", "66,123,102,159", "Fig. 5A WT, GLN +", "Fig. 5A KI, GLN +")` | 0 | SUCCESS | finding_12 | [`0x0a8ec33d…`](https://explorer-studio.genlayer.com/tx/0x0a8ec33da3242dee4b9f9f6739b32b4bf10b716875e30eec38252fddfc47aa50) |
| reporter | `file_finding("fund_1", "PMC8139131", "fig1.jpg", "10,10,60,60", "100,10,150,60", "A", "B")` | 0 | ERROR | PMC8139131/fig1.jpg: retracted | [`0x865bea1e…`](https://explorer-studio.genlayer.com/tx/0x865bea1e15cfb27b427dc0cca78c7a3cad9dcd02953de24dd09b87daa08c3353) |
| reporter | `file_finding("fund_1", "PMC7665890", "elife-60151-fig7-figsupp1.jpg", "372,112,525,178", "195,112,348,178", "x", "y")` | 0 | ERROR | finding_7 already reports these panels | [`0x803f0479…`](https://explorer-studio.genlayer.com/tx/0x803f0479c541be428471990f84ab219a0199f8b21cebd0fd2be1ca1698338e50) |
| bystander | `file_finding("fund_1", "PMC3572008", "pone.0056134.g001.jpg", "270,354,379,370", "519,354,628,370", "Akt K028", "Akt M23")` | 0 | ERROR | finding_8 already reports these panels | [`0xdc334f1c…`](https://explorer-studio.genlayer.com/tx/0xdc334f1cebe4ac6f62c7598d2183bfad856be1c42786bb1e14c2ac80a8779c27) |
| bystander | `file_finding("fund_1", "PMC7665890", "elife-60151-fig7-figsupp1.jpg", "195,198,348,288", "372,198,525,288", "eIF2a (S51), RKO", "eIF2a (S51), HT29")` | 0 | ERROR | deposit the stake first: 100000000000000000 wei needed, 50000000000000000 credited | [`0x94cdbee1…`](https://explorer-studio.genlayer.com/tx/0x94cdbee1060239b8f162712ce369916e91d72e2b5d0af6acfe541afb81d1f499) |
| reporter | `file_finding("fund_1", "PMC7665890", "elife-60151-fig7-figsupp1.jpg", "400,600,450,619", "530,600,580,619", "Actin, RKO", "Actin, HT29")` | 0 | ERROR | PMC7665890/elife-60151-fig7-figsupp1.jpg: outside (the figure is 568x719) | [`0x5b703161…`](https://explorer-studio.genlayer.com/tx/0x5b703161c615f8df4ba632fd24df0ed665f3be942b398486e210a2cdf6feae83) |
| reporter | `file_finding("fund_1", "PMC7665890", "elife-60151-fig5.jpg", "66,67,102,103", "66,123,102,159", "Fig. 5A WT, GLN +", "Fig. 5A KI, GLN +")` | 0 | SUCCESS | finding_14 | [`0xd99bf5bd…`](https://explorer-studio.genlayer.com/tx/0xd99bf5bd5b4439888c613c058d3cd7e827678b60d692166809ea4cd8fc31e418) |
| reporter | `file_finding("fund_1", "PMC7665890", "elife-60151-fig5.jpg", "66,67,102,103", "66,123,102,159", "Fig. 5A WT, GLN +", "Fig. 5A KI, GLN +")` | 0 | ERROR | at most 7 findings per reporter in this fund | [`0xec1a4446…`](https://explorer-studio.genlayer.com/tx/0xec1a444611f5829a5d095a27e299552ca84e14c1dc5fa4a19fad72f4b688a491) |
| reporter | `contest("finding_7", "My own finding, contested to test the rule.")` | 0 | ERROR | the reporter cannot contest their own finding | [`0xfab819d6…`](https://explorer-studio.genlayer.com/tx/0xfab819d6c64c45f7d8d331dd80406b62284b0915c7dfda952e8be44c4c24190a) |
| bystander | `confirm_by_notice("finding_11")` | 0 | SUCCESS | known | [`0x0d09c05b…`](https://explorer-studio.genlayer.com/tx/0x0d09c05bbed5183e618e64d1c4148beecd362b4361e857421b55daf847835c73) |
| bystander | `confirm_by_notice("finding_9")` | 0 | SUCCESS | known | [`0xf3256e69…`](https://explorer-studio.genlayer.com/tx/0xf3256e6918a0da2293055eea0cf005a7417401869716440e75bbd07a5295de26) |
| bystander | `settle("finding_7")` | 0 | ERROR | finding_7 can be contested until 2026-11-09T13:59:00 UTC | [`0x408ccf70…`](https://explorer-studio.genlayer.com/tx/0x408ccf70c6b675996d6627a92c0953b7f6ef52a2e5a09a810cf7bcd539e473fd) |
| bystander | `settle("finding_7")` | 0 | SUCCESS | confirmed | [`0xf346e877…`](https://explorer-studio.genlayer.com/tx/0xf346e87776d8b66c102f6dae09d0ca95794260514d8d99701527093af3ba2279) |
| sponsor | `close("fund_1")` | 0 | ERROR | Findings are taken until 2027-01-08 | [`0x3e96011a…`](https://explorer-studio.genlayer.com/tx/0x3e96011a7567b2aacfdc15bf50e8a7b2c9739c856d629b665e6af18c1ae35402) |
| reporter | `withdraw()` | 0 | SUCCESS | 1100000000000000000 | [`0xca1da9b3…`](https://explorer-studio.genlayer.com/tx/0xca1da9b318c2479a84b229402d46ecd72caab7765ea3caa23c530e25491d2bbb) |
| contester | `withdraw()` | 0 | SUCCESS | 200000000000000000 | [`0xe156f1d6…`](https://explorer-studio.genlayer.com/tx/0xe156f1d6c91dd0079f910cb05d3766b16e8abc913ac4dc8e72da1b1fd60ef01a) |
| bystander | `withdraw()` | 0 | SUCCESS | 50000000000000000 | [`0x9dfbf3db…`](https://explorer-studio.genlayer.com/tx/0x9dfbf3db0b1a9e8879649f8d19df633936012e4e3f2ce3f4fd483166b587b583) |
