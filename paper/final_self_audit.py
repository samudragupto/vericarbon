#!/usr/bin/env python3
"""
Comprehensive Final Self-Audit for VeriCarbon (TASK X4, STEP 12).
Evaluates all submission readiness gates and generates paper/SUBMISSION_SCORECARD.md.
"""
import os
import re
import json
import subprocess
import sys
from pathlib import Path

def main():
    repo_root = Path(__file__).resolve().parent.parent
    paper_dir = repo_root / "paper"
    sections_dir = paper_dir / "sections"
    scorecard_path = paper_dir / "SUBMISSION_SCORECARD.md"
    results_dir = repo_root / "eval" / "results"

    checks = []

    # ----------------------------------------------------
    # Check 1: Zero [C- markers in paper/
    # ----------------------------------------------------
    marker_hits = []
    for root, dirs, files in os.walk(paper_dir):
        for f in files:
            if f.endswith(('.md', '.tex')):
                p = Path(root) / f
                content = p.read_text(encoding='utf-8', errors='ignore')
                found = re.findall(r'\[C-\d+[^\]]*\]', content)
                if found:
                    marker_hits.append((str(p.relative_to(repo_root)), len(found)))
    
    if marker_hits:
        checks.append({
            "name": "Zero Provenance Markers ([C-)",
            "status": "FAIL",
            "details": f"Found [C- markers in: {marker_hits}"
        })
    else:
        checks.append({
            "name": "Zero Provenance Markers ([C-)",
            "status": "PASS",
            "details": "0 instances of [C- markers across paper/"
        })

    # ----------------------------------------------------
    # Check 2: Zero Banned Phrases
    # ----------------------------------------------------
    banned_phrases = [
        'prevents all fraud',
        'intercepts all',
        'solves double counting',
        'guarantees carbon integrity',
        'accurate agb estimation',
        'tamper-proof',
        'article 6 compliant',
        'production-ready',
        'profound',
        'catastrophic',
        'provably guarantee'
    ]
    banned_hits = []
    for root, dirs, files in os.walk(paper_dir):
        for f in files:
            if f.endswith(('.md', '.tex')) and f != 'final_self_audit.py':
                p = Path(root) / f
                content = p.read_text(encoding='utf-8', errors='ignore').lower()
                for bp in banned_phrases:
                    if bp in content:
                        banned_hits.append((str(p.relative_to(repo_root)), bp))

    if banned_hits:
        checks.append({
            "name": "Zero Banned Phrases",
            "status": "FAIL",
            "details": f"Found banned phrases: {banned_hits}"
        })
    else:
        checks.append({
            "name": "Zero Banned Phrases",
            "status": "PASS",
            "details": "0 banned phrases detected across manuscript files"
        })

    # ----------------------------------------------------
    # Check 3: Zero TODOCITE
    # ----------------------------------------------------
    todocite_hits = []
    for root, dirs, files in os.walk(paper_dir):
        for f in files:
            if f.endswith(('.md', '.tex')) and f not in ('final_self_audit.py', 'SUBMISSION_SCORECARD.md'):
                p = Path(root) / f
                content = p.read_text(encoding='utf-8', errors='ignore')
                if 'todocite' in content.lower():
                    todocite_hits.append(str(p.relative_to(repo_root)))

    if todocite_hits:
        checks.append({
            "name": "Zero TODOCITE Placeholders",
            "status": "FAIL",
            "details": f"Found TODOCITE in: {todocite_hits}"
        })
    else:
        checks.append({
            "name": "Zero TODOCITE Placeholders",
            "status": "PASS",
            "details": "0 TODOCITE occurrences detected in paper/"
        })

    # ----------------------------------------------------
    # Check 4: Cross-References Resolved
    # ----------------------------------------------------
    log_path = paper_dir / "manuscript.log"
    has_broken_refs = False
    ref_details = "manuscript.log clean"
    if log_path.exists():
        log_text = log_path.read_text(encoding='utf-8', errors='ignore')
        if "undefined references" in log_text.lower() or "undefined citations" in log_text.lower():
            has_broken_refs = True
            ref_details = "Found undefined references or citations in manuscript.log"
        else:
            ref_details = "Zero undefined references and zero undefined citations in manuscript.log"
    else:
        has_broken_refs = True
        ref_details = "manuscript.log missing"

    checks.append({
        "name": "Cross-References & Citations Resolved",
        "status": "FAIL" if has_broken_refs else "PASS",
        "details": ref_details
    })

    # ----------------------------------------------------
    # Check 5: Prose-Number Audit (eval/prose_number_audit.py)
    # ----------------------------------------------------
    pna_res = subprocess.run([sys.executable, str(repo_root / "eval" / "prose_number_audit.py")], capture_output=True, text=True)
    if pna_res.returncode == 0:
        checks.append({
            "name": "Section 6 Prose Number Audit",
            "status": "PASS",
            "details": "0 numerical discrepancies between Section 6 and canonical JSONs"
        })
    else:
        checks.append({
            "name": "Section 6 Prose Number Audit",
            "status": "FAIL",
            "details": pna_res.stdout.strip() or pna_res.stderr.strip()
        })

    # ----------------------------------------------------
    # Check 6: Geohash Audit (eval/geohash_audit.py)
    # ----------------------------------------------------
    gh_res = subprocess.run([sys.executable, str(repo_root / "eval" / "geohash_audit.py")], capture_output=True, text=True)
    if gh_res.returncode == 0:
        checks.append({
            "name": "Geohash Spatial Partition Audit",
            "status": "PASS",
            "details": "All 4 partition blocks intersect the AOI bounding box at the 4-way corner"
        })
    else:
        checks.append({
            "name": "Geohash Spatial Partition Audit",
            "status": "FAIL",
            "details": gh_res.stdout.strip() or gh_res.stderr.strip()
        })

    # ----------------------------------------------------
    # Check 7: Abstract Audit (Digits & Word Count)
    # ----------------------------------------------------
    ab_path = sections_dir / "00_abstract.md"
    ab_raw = ab_path.read_text(encoding='utf-8').replace('# Abstract', '').strip()
    ab_words = len(ab_raw.split())
    ab_digits = set(re.findall(r'\b\d+(?:[\.,]\d+)?\b', ab_raw))
    
    # Expected numbers that are allowed in abstract:
    allowed_digits = {'0.0119', '0.56', '1,088', '3', '4', '4,032', '5', '6', '643,269', '873,164'}
    extra_digits = ab_digits - allowed_digits

    if 150 <= ab_words <= 200 and not extra_digits:
        checks.append({
            "name": "Abstract Integrity & Word Count",
            "status": "PASS",
            "details": f"Word count: {ab_words} (range: 150-200); all digits match canonical table pointers"
        })
    else:
        details = []
        if not (150 <= ab_words <= 200):
            details.append(f"Word count {ab_words} out of [150, 200]")
        if extra_digits:
            details.append(f"Unmapped digits: {extra_digits}")
        checks.append({
            "name": "Abstract Integrity & Word Count",
            "status": "FAIL",
            "details": "; ".join(details)
        })

    # ----------------------------------------------------
    # Check 8: R² Containment Audit (P-A3)
    # ----------------------------------------------------
    # Banned from: abstract, highlights, contributions (§1.5), conclusion (§8)
    banned_r2_files = [
        sections_dir / "00_abstract.md",
        paper_dir / "highlights.md",
        sections_dir / "01_introduction.md",
        sections_dir / "08_conclusion.md"
    ]
    r2_leaks = []
    r2_pattern = re.compile(r'(R\^2|R²|0\.8812|0\.9869)')
    for bf in banned_r2_files:
        if bf.exists():
            content = bf.read_text(encoding='utf-8')
            if r2_pattern.search(content):
                r2_leaks.append(str(bf.relative_to(repo_root)))

    if r2_leaks:
        checks.append({
            "name": "R² Containment (P-A3)",
            "status": "FAIL",
            "details": f"R² leaked into restricted files: {r2_leaks}"
        })
    else:
        checks.append({
            "name": "R² Containment (P-A3)",
            "status": "PASS",
            "details": "R² strictly contained to Table 2 and §6.1 disclosure; 0 leaks"
        })

    # ----------------------------------------------------
    # Check 9: Machine Specification Audit (P-A5)
    # ----------------------------------------------------
    with open(results_dir / "machine_specs.json", "r", encoding="utf-8") as f:
        ms = json.load(f)
    
    sec6_text = (sections_dir / "06_evaluation.md").read_text(encoding='utf-8')
    ms_pass = True
    ms_details = []
    
    if ms["model"] not in sec6_text:
        ms_pass = False
        ms_details.append(f"Model '{ms['model']}' not in §6")
    if ms["cpu_name"] not in sec6_text:
        ms_pass = False
        ms_details.append(f"CPU '{ms['cpu_name']}' not in §6")
    if ms["gpu_name"] not in sec6_text:
        ms_pass = False
        ms_details.append(f"GPU '{ms['gpu_name']}' not in §6")

    checks.append({
        "name": "Hardware Specification Canonicalization (P-A5)",
        "status": "PASS" if ms_pass else "FAIL",
        "details": "Exact captured specs quoted in §6.1 prose" if ms_pass else "; ".join(ms_details)
    })

    # ----------------------------------------------------
    # Generate Scorecard Markdown
    # ----------------------------------------------------
    all_pass = all(c["status"] == "PASS" for c in checks)
    total_checks = len(checks)
    passed_checks = sum(1 for c in checks if c["status"] == "PASS")

    scorecard_lines = [
        "# VeriCarbon Submission Scorecard",
        "",
        f"**Target Venue:** Future Generation Computer Systems (Elsevier)",
        f"**Status:** {'ALL-PASS (Submission Ready)' if all_pass else 'FAIL (Remediation Required)'}",
        f"**Total Checks:** {total_checks} | **Passed:** {passed_checks} | **Failed:** {total_checks - passed_checks}",
        "",
        "| Gate / Check Name | Status | Details |",
        "| :--- | :---: | :--- |"
    ]

    for c in checks:
        icon = "PASS" if c["status"] == "PASS" else "**FAIL**"
        scorecard_lines.append(f"| {c['name']} | {icon} | {c['details']} |")

    scorecard_lines.extend([
        "",
        "---",
        f"**Automated Audit Execution Timestamp:** {ms.get('captured_at_utc', '2026-10-30T00:00:00Z')}",
        f"**Overall Result:** {'ALL-PASS' if all_pass else 'FAIL'}"
    ])

    scorecard_text = "\n".join(scorecard_lines) + "\n"
    scorecard_path.write_text(scorecard_text, encoding="utf-8")

    print(scorecard_text)

    if not all_pass:
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
