# Reviewer 3: Remote Sensing & Environmental Accounting

**Reviewer Focus:** Satellite Earth observation, machine learning allometry, spatial cross-validation rigor, synthetic label disclosure, stoichiometric carbon conversion, and decentralized registry governance.  
**Overall Recommendation:** Minor Revision (Strong Accept pending ecological and MRV clarifications).

---

### Meta-Review Summary
This manuscript tackles one of the most pressing challenges in climate finance and Earth observation: bridging the gap between spaceborne remote sensing analytics and trustless, tamper-resistant carbon accounting. By packaging non-parametric decision tree inference into Halo2 zero-knowledge circuits, the authors demonstrate that satellite-derived biomass estimations can be cryptographically verified on-chain without exposing private farm or forest boundaries.

The manuscript is refreshingly transparent regarding the synthetic nature of the ground-truth biomass training labels. However, from an ecological and remote sensing perspective, several aspects of the allometric conversion, spatial partitioning, cloud contamination, and multi-biome governance warrant clarification.

---

### Major Comments

1. **Major 1 (Synthetic Biomass Labels & National Forest Inventory Context):**  
   The authors commendably state in Section 6.1 that pixel-level biomass labels were generated from deterministic allometric formulas due to NASA Earthdata authentication barriers, ensuring strict compliance with reproducible zero-budget open-source protocols. However, the manuscript should clearly explain how this pipeline would be operationalized with real field data: specifically, linking spaceborne LiDAR waveforms (NASA GEDI L4A footprint aboveground biomass) with destructive harvest calibration plots and National Forest Inventory (NFI) field surveys, and highlighting why zero-knowledge verification remains agnostic to label provenance.

2. **Major 2 (Spatial Autocorrelation & Quadrant Partitioning):**  
   Section 5.1 describes partitioning the $1.05\,\text{km} \times 1.05\,\text{km}$ test chip into four spatial quadrant blocks (`6z2zz`, `6z3pb`, `6z8bp`, `6z900`). The authors must clarify that while these quadrant prefixes denote distinct spatial cluster identifiers within the local chip grid, spatial-block cross-validation was chosen specifically to eliminate spatial autocorrelation (Tobler's First Law of Geography) between training pixels and holdout pixels.

3. **Major 3 (IPCC Allometric Standards & Scope Boundaries):**  
   In Section 4.7, the stoichiometric conversion uses the IPCC carbon fraction constant ($CF = 0.47$) and the molecular weight ratio ($44/12$). The authors should explicitly cite the *IPCC 2006 Guidelines for National Greenhouse Gas Inventories (Volume 4: Agriculture, Forestry and Other Land Use)*. Furthermore, the paper should clearly state its ecological scope boundary: VeriCarbon models *Aboveground Biomass (AGB)* only; Below-Ground Biomass (BGB), dead wood, litter, and Soil Organic Carbon (SOC) are strictly excluded from this prototype, as optical satellite bands cannot observe subterranean carbon pools.

4. **Major 4 (Governance of the `modelHash` Whitelist):**  
   The Zero-Knowledge circuit enforces that the developer ran a specific model whose SHA-256 graph digest matches `instances[0] = modelHash`. But who determines what model is valid? The authors should clarify in Section 3.1 and Section 4.7 that the `modelHash` must be approved and whitelisted by the registry governance contract (or consortium multi-signature), preventing a malicious developer or rogue registry from deploying a self-trained, deliberately inflated model graph.

---

### Minor Comments

1. **Minor 1 (Sentinel-2 Constellation Specifications):**  
   In Section 2.1 and Section 5.1, note the operational cadence of Sentinel-2 (twin polar-orbiting satellites 2A and 2B providing a 5-day equatorial revisit time), which enables multi-temporal compositing across seasonal cloud windows.

2. **Minor 2 (Optical Cloud Occlusion & SAR Fusion):**  
   In Section 7.2, briefly discuss how tropical cloud persistence challenges optical sensors and explain how synthetic aperture radar (SAR, e.g., Sentinel-1 C-band or ALOS-2 L-band) can penetrate cloud cover to provide all-weather structural validation.

3. **Minor 3 (Unit Nomenclature Precision):**  
   Ensure consistent distinction between biomass density ($\text{Mg}/\text{ha}$ of dry matter) and carbon credits ($1\,\text{credit} = 1\,\text{tCO}_2\text{e}$ sequestered net).

4. **Minor 4 (Baseline System Differentiation in Table 1):**  
   In the caption of Table 1 (`related_work_matrix.md`), explicitly highlight that prior blockchain registries operate strictly on token transfer logistics without algorithmic computational verification.
