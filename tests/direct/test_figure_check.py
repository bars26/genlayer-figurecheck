"""Direct-mode tests for the FigureCheck contract, with real PubMed Central figures (tests/fixtures) and mocked reads."""

import hashlib
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from tests.direct.conftest import CONTRACT_PATH, llm_json, to_hex

GEN = 10**18
STAKE = GEN // 10
REWARD = GEN // 2
FIX = Path(__file__).resolve().parents[1] / "fixtures"
BUCKET = "https://pmc-oa-opendata.s3.amazonaws.com"
EPMC = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
PMC = "PMC7665890"
FIG7 = "elife-60151-fig7-figsupp1.jpg"
FIG5 = "elife-60151-fig5.jpg"
# Figure 7-S1: the GCN2 (T899) strip of RKO cells and of HT29 cells (the duplicate the authors later corrected),
# and the eIF2a (S51) strips, which only look alike.
GCN2_RKO, GCN2_HT29 = "195,112,348,178", "372,112,525,178"
S51_RKO, S51_HT29 = "195,198,348,288", "372,198,525,288"
# Figure 5A: two different wells (clearly different images).
WELL_WT_GLN, WELL_KI_GLN = "66,67,102,103", "66,123,102,159"
CAPTION = "Figure 7—figure supplement 1. Western blots of RKO and HT29 cells under glutamine deprivation."
FIRST = r"Decide whether\s+these are literally the same picture"
SECOND = r"It was contested"
NOTICE = r"correction, erratum or retraction notice"


def _days_from_now(n):
    return (datetime.now(timezone.utc) + timedelta(days=n)).strftime("%Y-%m-%d")


def _mock(direct_vm, url, body, status=200, regex=False):
    data = body if isinstance(body, bytes) else (json.dumps(body) if not isinstance(body, str) else body).encode()
    direct_vm.mock_web(url if regex else "^" + re.escape(url) + "$", {"method": "GET", "response": {"status": status, "headers": {}, "body": data}})


def _paper(direct_vm, pmcid=PMC, versions=(1,), retracted=False, oa=True, files=None, served=None, caption=CAPTION):
    """Mock the PMC bucket for one article: version listing, metadata JSON, figures and JATS XML."""
    listing = "".join(f"<CommonPrefixes><Prefix>{pmcid}.{v}/</Prefix></CommonPrefixes>" for v in versions)
    _mock(direct_vm, f"{BUCKET}/?list-type=2&prefix={pmcid}.&delimiter=/", f"<ListBucketResult>{listing}</ListBucketResult>")
    v = f"{pmcid}.{max(versions)}" if versions else ""
    files = files if files is not None else {FIG7: FIX / FIG7, FIG5: FIX / FIG5}
    media = [f"s3://pmc-oa-opendata/{v}/{name}?md5={hashlib.md5(path.read_bytes()).hexdigest()}" for name, path in files.items()]
    _mock(direct_vm, f"{BUCKET}/{v}/{v}.json", {"pmcid": pmcid, "is_pmc_openaccess": oa, "is_retracted": retracted,
                                               "license_code": "CC BY", "media_urls": media})
    for name, path in files.items():
        _mock(direct_vm, f"{BUCKET}/{v}/{name}", (served or {}).get(name, path.read_bytes()))
    stem = FIG7.rsplit(".", 1)[0]
    _mock(direct_vm, f"{BUCKET}/{v}/{v}.xml",
          f'<article><fig id="f7s1"><label>Figure 7—figure supplement 1.</label><caption><p>{caption[len("Figure 7—figure supplement 1. "):]}</p></caption>'
          f'<graphic xlink:href="{stem}"/></fig></article>')


def _first(direct_vm, answer):
    direct_vm.mock_llm(FIRST, llm_json({"matching_details": [], "answer": answer}))


def _payments(contract, monkeypatch):
    sent = []
    monkeypatch.setattr(sys.modules[type(contract).__module__], "_send", lambda to, amount: sent.append((to.as_hex, int(amount))))
    return sent


def _owed(contract, who):
    return int(contract.owed_to(to_hex(who)))


def _totals(contract):
    return json.loads(contract.totals())


def _fund(direct_vm, direct_deploy, sponsor, value=2 * GEN, reward=REWARD, stake=STAKE, minutes=60, cap=5, ends=None):
    direct_vm.sender = sponsor
    contract = direct_deploy(CONTRACT_PATH)
    direct_vm.value = value
    fid = contract.create_fund("Image integrity in open-access papers", ends or _days_from_now(60), reward, stake, minutes, cap)
    direct_vm.value = 0
    return contract, fid


def _deposit(direct_vm, contract, who, amount=STAKE):
    direct_vm.sender, direct_vm.value = who, amount
    contract.deposit()
    direct_vm.value = 0


def _file(direct_vm, contract, who, a=GCN2_RKO, b=GCN2_HT29, figure=FIG7, answer="DUPLICATED", stake=STAKE, pmcid=PMC, **paper):
    """Deposit `stake` for `who`, then file (the fund's stake is taken from that credit)."""
    direct_vm.clear_mocks()
    _paper(direct_vm, pmcid=pmcid, **paper)
    _first(direct_vm, answer)
    if stake:
        _deposit(direct_vm, contract, who, stake)
    direct_vm.sender = who
    return contract.file_finding("fund_0", pmcid, figure, a, b, "GCN2 (T899), RKO", "GCN2 (T899), HT29")


def _expire(contract, fid):
    contract.findings[fid].deadline = "2020-01-01T00:00:00"


def _module(contract):
    return sys.modules[type(contract).__module__]


# --- reading figures in code -----------------------------------------------------------------------------------------


def test_the_decoder_reads_pubmed_central_jpegs_and_the_shape_score_tells_panels_apart(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    m = _module(direct_deploy(CONTRACT_PATH))
    data = (FIX / FIG7).read_bytes()
    w, h, crops = m.decode_luma(data, [(0, 0, 40, 30)])
    assert (w, h) == (568, 719) and crops[0][:2] == (40, 30) and len(crops[0][2]) == 1200

    def score(a, b, figure=FIG7):
        size, match, pic = m.compare((FIX / figure).read_bytes(), m.parse_box(a), m.parse_box(b))
        assert pic[:8] == b"\x89PNG\r\n\x1a\n"
        return match[0]

    assert score(GCN2_RKO, GCN2_HT29) >= 0.9  # the duplicated blot strip
    assert score(WELL_WT_GLN, WELL_KI_GLN, FIG5) < 0.5  # two different wells
    assert m.parse_box("1,2,3,4") == [1, 2, 3, 4] and m.parse_box("5,5,5,9") == [] and m.parse_box("a,b") == []
    with pytest.raises(m.JpegError):
        m.decode_luma(b"\x89PNG not a jpeg", [(0, 0, 8, 8)])


def test_captions_come_from_the_innermost_figure_and_labels_from_their_number(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    m = _module(direct_deploy(CONTRACT_PATH))
    # eLife nests each figure supplement inside its parent <fig>
    xml = ('<fig id="fig7"><label>Figure 7.</label><caption><p>Parent caption.</p></caption><graphic xlink:href="x-fig7.jpg"/>'
           '<p><fig id="fig7s1"><label>Figure 7—figure supplement 1.</label><caption><p>Child caption.</p></caption>'
           '<graphic xlink:href="x-fig7-figsupp1.jpg"/></fig></p></fig>')
    assert m._caption(xml, "x-fig7-figsupp1.jpg") == "Figure 7—figure supplement 1. Child caption."
    assert m._caption(xml, "x-fig7.jpg") == "Figure 7. Parent caption." and m._caption(xml, "other.jpg") == ""
    assert [m._label(c) for c in ("Figure 7—figure supplement 1. Child", "Fig. 2. Inhibition", "FIGURE 3 The inhibition", "")] == [
        "Figure 7—figure supplement 1", "Fig. 2", "FIGURE 3", "the figure"]


@pytest.mark.parametrize("shape, answer, state", [
    (0.95, "DUPLICATED", "match"), (0.62, "DUPLICATED", "match"), (0.55, "DUPLICATED", "unclear"), (0.95, "UNCLEAR", "unclear"),
    (0.95, "DISTINCT", "no_match"), (0.45, "DUPLICATED", "no_match"),
])
def test_code_decides_from_the_shape_score_and_the_models_answer(direct_vm, direct_deploy, direct_alice, shape, answer, state):
    direct_vm.sender = direct_alice
    assert _module(direct_deploy(CONTRACT_PATH)).verdict({"shape": shape, "answer": answer}) == state


def test_validators_settle_a_wavering_model_on_the_cautious_answer(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    m = _module(direct_deploy(CONTRACT_PATH))
    code = {"state": "ok", "md5": "x", "shape": 0.92}

    def agrees(leader, mine, cautious=("UNCLEAR",)):
        return m._validator(lambda: json.dumps(mine), cautious)(m.gl.vm.Return(json.dumps(leader)))

    assert agrees({**code, "answer": "DUPLICATED"}, {**code, "answer": "DUPLICATED"})
    assert not agrees({**code, "answer": "DUPLICATED"}, {**code, "answer": "UNCLEAR"})  # a match needs every validator
    assert agrees({**code, "answer": "UNCLEAR"}, {**code, "answer": "DUPLICATED"})  # the cautious answer is accepted
    assert not agrees({**code, "answer": "UNCLEAR"}, {**code, "shape": 0.5, "answer": "UNCLEAR"})  # code must match
    assert not agrees({**code, "answer": "DISTINCT"}, {**code, "answer": "UNCLEAR"})  # costing a stake needs agreement
    assert agrees({"state": "none", "answer": "NONE", "checked": 2}, {"state": "ok", "answer": "YES", "notice": "PMC1"}, ("NONE",))
    assert not agrees({"state": "ok", "answer": "YES", "notice": "PMC1"}, {"state": "none", "answer": "NONE"}, ("NONE",))
    assert not agrees({"state": "error"}, {"state": "ok"}) and agrees({"state": "error"}, {"state": "error"})


# --- funds -----------------------------------------------------------------------------------------------------------


@pytest.mark.parametrize("args, value, reason", [
    (("ab", None, REWARD, STAKE, 60, 5), 2 * GEN, "title must be 3 to 80 characters"),
    (("Fund", "2026-02-31", REWARD, STAKE, 60, 5), 2 * GEN, "ends must be a real date"),
    (("Fund", "2020-01-01", REWARD, STAKE, 60, 5), 2 * GEN, "ends must be from today"),
    (("Fund", None, REWARD, GEN // 1000, 60, 5), 2 * GEN, "reward and stake at least 0.01 GEN"),
    (("Fund", None, REWARD, STAKE, 5, 5), 2 * GEN, "contest_minutes 10 to 43200"),
    (("Fund", None, REWARD, STAKE, 60, 0), 2 * GEN, "per_reporter 1 to 100"),
    (("Fund", None, REWARD, STAKE, 60, 5), GEN // 4, "fund it with at least one reward"),
])
def test_invalid_funds_are_refused_and_their_gen_credited_back(direct_vm, direct_deploy, direct_alice, monkeypatch, args, value, reason):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    sent = _payments(contract, monkeypatch)
    direct_vm.value = value
    title, ends, *rest = args
    result = contract.create_fund(title, ends or _days_from_now(30), *rest)
    direct_vm.value = 0
    assert result.startswith("REFUNDED: ") and reason in result and int(contract.fund_count) == 0
    assert _owed(contract, direct_alice) == value and sent == []
    assert int(contract.withdraw()) == value and sent == [(to_hex(direct_alice), value)]


def test_anyone_tops_up_a_fund_with_at_least_a_tenth_of_a_gen(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract, fid = _fund(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender, direct_vm.value = direct_bob, GEN
    assert contract.fund(fid) == "funded"
    direct_vm.value = GEN // 20
    assert contract.fund(fid).startswith("REFUNDED: Send at least 0.1 GEN")
    direct_vm.value = 0
    assert int(contract.get_fund(fid).pot) == 3 * GEN and _owed(contract, direct_bob) == GEN // 20
    assert [r["address"] for r in json.loads(contract.get_funders(fid, 0, 200))] == [to_hex(direct_alice), to_hex(direct_bob)]


# --- filing ----------------------------------------------------------------------------------------------------------


def test_a_duplicated_blot_is_a_match_with_its_evidence_and_a_reserved_reward(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract, fid = _fund(direct_vm, direct_deploy, direct_alice)
    assert _file(direct_vm, contract, direct_bob) == "finding_0"
    d = contract.get_finding("finding_0")
    assert (d.state, d.version, d.answer, d.license, d.transform) == ("match", f"{PMC}.1", "DUPLICATED", "CC BY", "")
    assert float(d.shape) >= 0.9 and d.md5 == hashlib.md5((FIX / FIG7).read_bytes()).hexdigest() and len(d.packet) == 64
    assert d.deadline > d.filed_at and int(d.reward) == REWARD and "open to contest" in d.why
    f = contract.get_fund(fid)
    assert (int(f.pot), int(f.reserved), int(f.n_findings)) == (2 * GEN - REWARD, REWARD, 1)
    assert _totals(contract)["expected_balance"] == str(2 * GEN + STAKE)


def test_clearly_different_panels_lose_the_stake_without_asking_the_model(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract, fid = _fund(direct_vm, direct_deploy, direct_alice)
    _file(direct_vm, contract, direct_bob, a=WELL_WT_GLN, b=WELL_KI_GLN, figure=FIG5, answer="DUPLICATED")  # the model is not asked
    d = contract.get_finding("finding_0")
    assert (d.state, d.answer) == ("no_match", "UNCLEAR") and float(d.shape) < 0.5
    assert int(contract.get_fund(fid).pot) == 2 * GEN + STAKE and _owed(contract, direct_bob) == 0


@pytest.mark.parametrize("answer, state, owed", [("DISTINCT", "no_match", 0), ("UNCLEAR", "unclear", STAKE)])
def test_the_models_answer_decides_lookalike_panels(direct_vm, direct_deploy, direct_alice, direct_bob, answer, state, owed):
    contract, fid = _fund(direct_vm, direct_deploy, direct_alice)
    _file(direct_vm, contract, direct_bob, a=S51_RKO, b=S51_HT29, answer=answer)
    assert contract.get_finding("finding_0").state == state and _owed(contract, direct_bob) == owed
    assert int(contract.get_fund(fid).reserved) == 0


@pytest.mark.parametrize("kwargs, reason", [
    ({"stake": STAKE // 2}, "deposit the stake first"),
    ({"pmcid": "12345"}, "pmcid like PMC1234567"),
    ({"figure": "figure.png"}, "the figure's JPEG file name"),
    ({"a": "195,112,348,170"}, "of the same size"),
    ({"a": "0,0,400,400", "b": "1,1,401,401"}, "12 to 360 pixels"),
    ({"versions": ()}, "not open access"),
    ({"retracted": True}, "retracted"),
    ({"files": {FIG5: FIX / FIG5}}, "no figure"),
    ({"served": {FIG7: (FIX / FIG5).read_bytes()}}, "md5 mismatch"),
    ({"a": "400,600,450,619", "b": "530,600,580,619"}, "outside"),
])
def test_bad_findings_are_refused_and_the_deposit_stays_credited(direct_vm, direct_deploy, direct_alice, direct_bob, kwargs, reason):
    contract, fid = _fund(direct_vm, direct_deploy, direct_alice)
    stake = kwargs.get("stake", STAKE)
    with direct_vm.expect_revert(reason):
        _file(direct_vm, contract, direct_bob, **kwargs)
    assert int(contract.finding_count) == 0 and _owed(contract, direct_bob) == stake


def test_a_panel_at_the_edge_of_the_figure_is_compared_within_the_figure(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract, fid = _fund(direct_vm, direct_deploy, direct_alice)
    # B touches the right edge (the figure is 568 px wide): the search only uses offsets inside the figure.
    assert _file(direct_vm, contract, direct_bob, a="195,600,348,665", b="415,600,568,665", answer="UNCLEAR") == "finding_0"
    d = contract.get_finding("finding_0")
    assert int(d.offset.split(",")[0]) <= 0 and float(d.shape) > 0


def test_the_same_panels_once_per_fund_and_a_cap_per_reporter(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract, fid = _fund(direct_vm, direct_deploy, direct_alice, cap=2)
    _file(direct_vm, contract, direct_bob)
    with direct_vm.expect_revert("finding_0 already reports these panels"):
        _file(direct_vm, contract, direct_bob, a=GCN2_HT29, b=GCN2_RKO)
    _file(direct_vm, contract, direct_bob, a=S51_RKO, b=S51_HT29, answer="UNCLEAR")
    with direct_vm.expect_revert("at most 2 findings per reporter"):
        _file(direct_vm, contract, direct_bob, a=WELL_WT_GLN, b=WELL_KI_GLN, figure=FIG5)


# --- settling, contests and notices -------------------------------------------------------------------------------


def test_an_uncontested_match_is_confirmed_and_paid_after_the_window(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie, monkeypatch):
    contract, fid = _fund(direct_vm, direct_deploy, direct_alice)
    sent = _payments(contract, monkeypatch)
    _file(direct_vm, contract, direct_bob)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("can be contested until"):
        contract.settle("finding_0")
    _expire(contract, "finding_0")
    assert contract.settle("finding_0") == "confirmed"
    assert _owed(contract, direct_bob) == STAKE + REWARD and int(contract.get_fund(fid).paid_total) == REWARD
    with direct_vm.expect_revert("not an open match"):
        contract.settle("finding_0")
    direct_vm.sender = direct_bob
    assert int(contract.withdraw()) == STAKE + REWARD and sent == [(to_hex(direct_bob), STAKE + REWARD)]
    assert _totals(contract) == {"expected_balance": str(2 * GEN - REWARD), "owed": "0", "withdrawn": str(STAKE + REWARD)}


@pytest.mark.parametrize("answer, state, reporter, contester, reward_paid", [
    ("UPHELD", "upheld", 2 * STAKE + REWARD, 0, True),
    ("DISCLOSED", "disclosed", STAKE, STAKE, False),
    ("OVERTURNED", "overturned", 0, 2 * STAKE, False),
    ("UNCLEAR", "unresolved", STAKE, STAKE, False),
])
def test_a_contest_gets_a_second_look_with_the_caption(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie,
                                                      answer, state, reporter, contester, reward_paid):
    contract, fid = _fund(direct_vm, direct_deploy, direct_alice)
    _file(direct_vm, contract, direct_bob)
    direct_vm.mock_llm(SECOND, llm_json({"answer": answer}))
    _deposit(direct_vm, contract, direct_charlie)
    assert contract.contest("finding_0", "The caption says both lines share one GCN2 blot.") == state
    d = contract.get_finding("finding_0")
    assert (d.contest_answer, d.contester.as_hex) == (answer, to_hex(direct_charlie))
    assert (_owed(contract, direct_bob), _owed(contract, direct_charlie)) == (reporter, contester)
    f = contract.get_fund(fid)
    assert int(f.reserved) == 0 and int(f.pot) == (2 * GEN - REWARD if reward_paid else 2 * GEN)
    assert _totals(contract)["expected_balance"] == str(int(f.pot) + reporter + contester)


def test_contests_need_the_stake_another_wallet_and_an_open_window(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract, fid = _fund(direct_vm, direct_deploy, direct_alice)
    _file(direct_vm, contract, direct_bob)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("cannot contest their own"):
        contract.contest("finding_0", "I changed my mind about it.")
    _deposit(direct_vm, contract, direct_charlie, STAKE // 2)
    with direct_vm.expect_revert("deposit the stake first"):
        contract.contest("finding_0", "Same loading control, see caption.")
    with direct_vm.expect_revert("explanation must be 10 to 600"):
        contract.contest("finding_0", "no")
    _expire(contract, "finding_0")
    with direct_vm.expect_revert("not an open match"):
        contract.contest("finding_0", "Same loading control, see caption.")
    assert _owed(contract, direct_charlie) == STAKE // 2 and contract.get_finding("finding_0").state == "match"


def _notice(direct_vm, published, answer="YES"):
    _mock(direct_vm, f"{EPMC}?query=PMCID:{PMC}&format=json&resultType=core",
          {"resultList": {"result": [{"pmcid": PMC, "commentCorrectionList": {"commentCorrection": [
              {"id": "41236815", "source": "MED", "type": "Erratum in"}, {"id": "999", "source": "MED", "type": "Comment in"}]}}]}})
    _mock(direct_vm, f"{EPMC}?query=EXT_ID:41236815%20AND%20SRC:MED&format=json&resultType=lite",
          {"resultList": {"result": [{"pmcid": "PMC12618004", "firstPublicationDate": published}]}})
    _mock(direct_vm, f"{BUCKET}/?list-type=2&prefix=PMC12618004.&delimiter=/",
          "<ListBucketResult><CommonPrefixes><Prefix>PMC12618004.1/</Prefix></CommonPrefixes></ListBucketResult>")
    _mock(direct_vm, f"{BUCKET}/PMC12618004.1/PMC12618004.1.txt",
          "Correction. In Figure 7-S1, the GCN2 blot of RKO cells was inadvertently duplicated in that of HT 29 cells.")
    direct_vm.mock_llm(NOTICE, llm_json({"answer": answer}))


def test_a_notice_published_after_filing_confirms_and_pays(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract, fid = _fund(direct_vm, direct_deploy, direct_alice)
    _file(direct_vm, contract, direct_bob, a=S51_RKO, b=S51_HT29, answer="UNCLEAR")  # unclear: the stake is already back
    _notice(direct_vm, _days_from_now(1))
    direct_vm.sender = direct_charlie
    assert contract.confirm_by_notice("finding_0") == "confirmed"
    d = contract.get_finding("finding_0")
    assert d.notice.startswith("PMC12618004 (") and _owed(contract, direct_bob) == STAKE + REWARD


def test_a_notice_published_before_filing_means_the_problem_was_already_known(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract, fid = _fund(direct_vm, direct_deploy, direct_alice)
    _file(direct_vm, contract, direct_bob)
    _notice(direct_vm, "2025-11-14")
    assert contract.confirm_by_notice("finding_0") == "known"
    assert _owed(contract, direct_bob) == STAKE and int(contract.get_fund(fid).pot) == 2 * GEN
    assert _totals(contract)["expected_balance"] == str(2 * GEN + STAKE)


def test_a_notice_that_does_not_mention_the_figure_changes_nothing(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract, fid = _fund(direct_vm, direct_deploy, direct_alice)
    _file(direct_vm, contract, direct_bob)
    _notice(direct_vm, _days_from_now(1), answer="NO")
    with direct_vm.expect_revert("acknowledges an image problem in this figure (1 read)"):
        contract.confirm_by_notice("finding_0")
    assert contract.get_finding("finding_0").state == "match"


# --- closing ---------------------------------------------------------------------------------------------------------


def test_close_waits_for_open_matches_and_returns_the_pot_pro_rata(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie, monkeypatch):
    contract, fid = _fund(direct_vm, direct_deploy, direct_alice)
    sent = _payments(contract, monkeypatch)
    direct_vm.sender, direct_vm.value = direct_bob, GEN
    contract.fund(fid)
    _file(direct_vm, contract, direct_charlie)
    with direct_vm.expect_revert("Findings are taken until"):
        contract.close(fid)
    contract.funds[fid].ends = "2020-01-01"
    with direct_vm.expect_revert("Settle or resolve the open matches first"):
        contract.close(fid)
    _expire(contract, "finding_0")
    contract.settle("finding_0")
    returnable = 3 * GEN - REWARD
    assert contract.close(fid) == str(returnable)
    assert contract.refund(fid, to_hex(direct_alice)) == str(returnable * 2 // 3)
    with direct_vm.expect_revert("already been credited"):
        contract.refund(fid, to_hex(direct_alice))
    assert contract.refund(fid, to_hex(direct_bob)) == str(returnable - returnable * 2 // 3)
    for who in (direct_alice, direct_bob, direct_charlie):
        direct_vm.sender = who
        contract.withdraw()
    assert sum(a for _, a in sent) == 3 * GEN + STAKE
    assert _totals(contract) == {"expected_balance": "0", "owed": "0", "withdrawn": str(3 * GEN + STAKE)}


def test_stress_hundreds_of_funders_still_close_in_fixed_work(direct_vm, direct_deploy, direct_alice, monkeypatch):
    contract, fid = _fund(direct_vm, direct_deploy, direct_alice)
    for i in range(300):
        direct_vm.sender, direct_vm.value = (0xFA11000 + i).to_bytes(20, "big"), GEN // 10 + i
        contract.fund(fid)
    direct_vm.value = 0
    funded = 2 * GEN + sum(GEN // 10 + i for i in range(300))
    contract.funds[fid].ends = "2020-01-01"
    reads = {"n": 0}
    real = type(contract.funds).__getitem__
    monkeypatch.setattr(type(contract.funds), "__getitem__", lambda m, k: (reads.__setitem__("n", reads["n"] + ("|" in str(k))), real(m, k))[1])
    assert contract.close(fid) == str(funded) and reads["n"] == 0
    monkeypatch.setattr(type(contract.funds), "__getitem__", real)
    rows = json.loads(contract.get_funders(fid, 0, 200)) + json.loads(contract.get_funders(fid, 200, 200))
    for row in rows:
        contract.refund(fid, row["address"])
    assert len(rows) == 301 and _totals(contract)["owed"] == str(funded)
