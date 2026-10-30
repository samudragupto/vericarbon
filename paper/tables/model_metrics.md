# Table: Spatial-Block Cross-Validation and Model Accuracy (`mrv train`)

Evaluation of `HistGradientBoostingRegressor` biomass estimation across 4 spatial-block clusters
(`6z2zz`, `6z3pb`, `6z8bp`, `6z900`) in the Tapajós National Forest study site.
Spatial-block partitioning prevents spatial autocorrelation leakage across train and test sets.

> **Caption:** Self-consistency on synthesized fixtures — NOT a field-accuracy claim.

- **Model Architecture:** `HistGradientBoostingRegressor` (`max_depth = 4`, `max_iter = 40`, `lr = 0.1`)
- **Input Features (12):** `ndvi_mean`, `ndvi_3m_p10`, `ndvi_3m_p50`, `ndvi_3m_p90`, `ndre_mean`, `reci_mean`, `ireci_mean`, `wc_tree_cover`, `wc_shrubland`, `wc_grassland`, `wc_cropland`, `wc_wetland`
- **Target Unit:** Aboveground Biomass (AGB) in $\text{Mg}/\text{ha}$ (metric tons / hectare)
- **Spatial Partitioning:** 4 quadrant partition blocks (`6z2zz`, `6z3pb`, `6z8bp`, `6z900`, precision 5) over 1.05 km × 1.05 km AOI

| Fold | Train Blocks | Test Block | Train $N$ | Test $N$ | MAE ($\text{Mg}/\text{ha}$) | RMSE ($\text{Mg}/\text{ha}$) | $R^2$ Score | Notes |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| Fold 1 | `6z3pb, 6z8bp, 6z900` | `6z2zz` | 192 | 64 | 2.1744 | 2.7026 | 0.7699 | Spatial Holdout |
| Fold 2 | `6z2zz, 6z8bp, 6z900` | `6z3pb` | 192 | 64 | 1.7450 | 2.1326 | 0.9935 | Spatial Holdout |
| Fold 3 | `6z2zz, 6z3pb, 6z900` | `6z8bp` | 192 | 64 | 13.4895 | 33.4757 | 0.7744 | Spatial Holdout |
| Fold 4 | `6z2zz, 6z3pb, 6z8bp` | `6z900` | 192 | 64 | 3.7514 | 8.1675 | 0.9869 | **Canonical Deployment** |
| **CV Mean** | — | — | 192 | 64 | **5.2901** | **11.6196** | **0.8812** | Cross-Validation Average |
| **CV Std** | — | — | — | — | $\pm$4.7925 | $\pm$12.8367 | $\pm$0.1091 | Standard Deviation |

> [!NOTE]
> The Canonical Deployment model (Fold 4, held-out block `6z900`) achieved an $R^2$ of **0.9869** and an MAE of **3.7514** $\text{Mg}/\text{ha}$, identical to the exported ONNX model card used for verifiable Halo2 circuit proofs in `services/zk`.
