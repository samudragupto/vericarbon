# VeriCarbon MRV Service (`services/mrv`)

Python 3.11 pipeline managed by `uv` for satellite imagery ingestion, feature engineering, biomass model training, and quantification.

## Geospatial Grid and Precision Architecture

1. **Parcel-Level Commitment & Nullifier Precision (`geohash8`):**
   - Carbon project plots are registered and bound at `geohash8` precision (~38.2m × ~19.1m bounding box).
   - In Amendment A0, the global on-chain issuance nullifier is defined as `keccak256(abi.encode(geohash8, vintageYear, creditType))`.

2. **Spatial-Block Partitioning Precision (`geohash5`):**
   - The pilot study site covers a ~1.05 km × ~1.05 km Sentinel-2 L2A tile in the Tapajós National Forest. Because a 1 km window falls entirely inside a single geographic geohash-5 cell, spatial cross-validation partitions the chip into 4 spatial quadrant blocks (`6z2zz`, `6z3pb`, `6z8bp`, `6z900`).
   - Spatial-block cross-validation evaluates generalization across these blocks to prevent spatial autocorrelation leakage.

3. **Biomass Label Ground Truth & Self-Consistency:**
   - Labels are derived from deterministic synthesized fixtures (`SEED = 42`) simulating Aboveground Biomass (AGB in $\text{Mg}/\text{ha}$) calibrated to tropical forest canopy metrics.
   - Cross-validation results evaluate **internal pipeline self-consistency on synthesized fixtures — NOT a field-accuracy claim**.

## CLI Usage

```bash
cd services/mrv

# 1. Fetch Sentinel-2 STAC metadata and window cube
uv run mrv fetch --aoi "-55.05,-3.05,-55.04,-3.04"

# 2. Extract features and build parquet dataset with spatial blocks
uv run mrv build-dataset

# 3. Train HistGradientBoostingRegressor and export ONNX model
uv run mrv train

# 4. Quantify biomass and generate EvidenceBundle JSON
uv run mrv quantify --aoi "-55.05,-3.05,-55.04,-3.04" --vintage 2024 --type 0
```
