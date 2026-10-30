# Submission Checklist: Future Generation Computer Systems (Elsevier)

This checklist verifies all submission requirements for *Future Generation Computer Systems* (FGCS), Elsevier, following the official Guide for Authors.

---

## 1. Submission Package Inventory

- [x] **Manuscript File:** `paper/manuscript.tex` (compiled successfully with `tectonic` / `latexmk` into `paper/manuscript.pdf`, 289.8 KiB, zero unresolved references).
- [x] **Cover Letter:** `paper/cover_letter_fgcs.md` (304 words, 5 paragraphs, addresses distributed systems focus, C1–C4 summary, data availability, zero conflicts).
- [x] **Highlights File:** `paper/highlights.md` (exactly 5 bullet points, each $\le 85$ characters including spaces).
- [x] **Reference Bibliography:** `paper/refs.bib` (30 peer-reviewed sources, 100% human-verified DOIs at Gate 3).
- [x] **Vector PDF Figures:** `paper/figures/proving_time.pdf` and `paper/figures/gas_comparison.pdf` (generated via matplotlib PDF backend at 300 DPI).
- [x] **LaTeX Tables:** `paper/tables/*.tex` (6 tables: `related_work_matrix.tex`, `model_metrics.tex`, `zk_benchmarks.tex`, `gas_costs.tex`, `fraud_results.tex`, `latency.tex`).

---

## 2. Mandatory Journal Declarations

### CRediT Authorship Contribution Statement
* **Conceptualization:** Lead Researcher.
* **Methodology:** Lead Researcher.
* **Software:** Lead Researcher (MRV pipeline, ezkl ZK-SNARK compilation, Solidity contracts, Deno indexer, Next.js explorer).
* **Validation:** Lead Researcher (Foundry adversarial suite, spatial-block CV, RPC latency, gas benchmarks).
* **Formal Analysis:** Lead Researcher (Lemma 1 proof of cross-registry unicity, Amendment A0 security analysis).
* **Investigation:** Lead Researcher.
* **Data Curation:** Lead Researcher (Sentinel-2 L2A STAC queries, ESA WorldCover raster processing).
* **Writing – Original Draft:** Lead Researcher.
* **Writing – Review & Editing:** Lead Researcher.
* **Visualization:** Lead Researcher (vector PDF figures, MapLibre GIS explorer).
* **Supervision:** Lead Researcher.
* **Project Administration:** Lead Researcher.

### Declaration of Competing Interests
> The authors declare that they have no known competing financial interests or personal relationships that could have appeared to influence the work reported in this paper.

### Data Availability Statement
> All remote sensing rasters utilized in this study are openly accessible without authentication through the Microsoft Planetary Computer STAC API (Sentinel-2 L2A and ESA WorldCover). Synthesized ground-truth biomass training fixtures and deterministic dataset manifests are provided in the open-source repository under `services/mrv/tests/fixtures/`.

### Code & Artifact Availability (Zenodo DOI & Git Tag)
> The complete software monorepo is public and reproducible under the MIT License. A frozen release tag `v1.0-artifact` has been created.
> To generate the archival Zenodo DOI:
> 1. Create a GitHub Release pointing to Git tag `v1.0-artifact`.
> 2. Ensure Zenodo integration is enabled on the repository to automatically mint a permanent Digital Object Identifier (DOI: `10.5281/zenodo.XXXXXXX`).
> 3. Verify that running `uv run eval/run_all.py` from a fresh clone completes the full benchmark sweep offline using cached fixtures.

---

## 3. Keywords & Subject Classification

```
Zero-Knowledge Proofs; Verifiable Machine Learning; Carbon Markets; Digital MRV; Blockchain Nullifiers; Layer 2 Rollups
```

* **Target Subject Areas:** Distributed Systems; Verifiable Computation; Cryptographic Protocols; Smart Contracts.
* **Primary Venue:** *Future Generation Computer Systems* (FGCS), Elsevier.

---

## 4. arXiv Pre-print Timing & Categories Note

* **Recommended Primary Category:** `cs.CR` (Cryptography and Security).
* **Secondary Category:** `cs.DC` (Distributed, Network and Cluster Computing).
* **Submission Timing:** In accordance with Elsevier’s Sharing Policy, authors may upload preprints to arXiv at any time prior to formal journal acceptance. It is recommended to upload to arXiv simultaneously with journal submission to timestamp the discovery of Amendment A0 and the cross-registry unicity proof (Lemma 1).

---

## 5. Final Author Reminder

* Prior to final upload in the Elsevier Editorial Manager (Editorial System), re-verify the live [FGCS Guide for Authors](https://www.sciencedirect.com/journal/future-generation-computer-systems/publish/guide-for-authors) for any recent updates to word limit policies or anonymization guidelines.
