# Section 2: Background & Related Work (Word Budget: 900 words + Table 1)

## 2.1 Spaceborne Remote Sensing & Machine Learning for Forest Biomass
*Topic Sentence:* Optical and synthetic aperture radar (SAR) remote sensing have become the gold standard for continuous forest canopy monitoring and Aboveground Biomass (AGB) estimation.
- Key concepts: Multispectral bands (Sentinel-2 L2A 10m/20m); red-edge vegetation indices (NDRE, RECI, IRECI); spaceborne LiDAR calibration (GEDI L4A); machine learning regressors for carbon density.
- Target words: 220 words.
- Claims: None.
- Citations: TODOCITE: Dubayah 2020 GEDI mission overview; TODOCITE: Santoro 2021 ESA CCI Biomass global dataset; TODOCITE: Lang 2023 high-resolution global canopy height maps.

## 2.2 Blockchain Carbon Registries and Web3 Offsetting Failures
*Topic Sentence:* The intersection of blockchain and voluntary carbon markets began with permissionless tokenized credit bridges, which rapidly exposed structural vulnerabilities in credit origin quality and double-retirement accounting.
- Key concepts: Toucan Base Carbon Tonne (BCT); permissionless bridging of dormant/zombie legacy credits; lack of on-chain verification of continuing biomass permanence; World Bank Climate Warehouse metadata consolidation.
- Target words: 220 words.
- Claims: [CLAIM: C-16: 1088 baseline double-issued credits].
- Citations: TODOCITE: Toucan Protocol tokenized carbon retrospective 2022; TODOCITE: World Bank Climate Warehouse 2022; TODOCITE: Chia Climate Warehouse design.

## 2.3 Zero-Knowledge Cryptography and Verifiable Machine Learning (ZKML)
*Topic Sentence:* Zero-knowledge proofs (ZK-SNARKs) enable a prover to demonstrate that a specific computational graph produced an output from private inputs without revealing the inputs themselves or requiring redundant re-execution by verifiers.
- Key concepts: Arithmetic circuits over BN254; polynomial commitment schemes (KZG); Halo2 PLONKish arithmetization; quantized fixed-point representations; ezkl compilation pipeline.
- Target words: 240 words.
- Claims: None.
- Citations: TODOCITE: Ben-Sasson 2014 Zerocash; TODOCITE: ezkl Halo2 zero-knowledge inference engine; TODOCITE: Zhang 2020 zero-knowledge machine learning.

## 2.4 Gap Analysis and Comparison Matrix
*Topic Sentence:* Despite rapid progress in both dMRV and ZKML, existing systems remain disjointed: no deployed protocol combines in-circuit machine learning bound to satellite rasters with salt-independent cross-registry geospatial nullifiers.
- Key concepts: Detailed breakdown of Toucan, KlimaDAO, Flowcarbon, Chia, Regen Network, Open Forest Protocol, and academic ZK credit schemes; structural voids VeriCarbon bridges.
- Target words: 220 words.
- Claims: [CLAIM: C-15: 9 security attacks evaluated].
- Citations: None.
- Artifacts: \input{tables/related_work_matrix.md}
