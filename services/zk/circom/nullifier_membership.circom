pragma circom 2.1.6;

/*
 * [OPTIONAL — Phase 3 Deliverable 7]
 * VeriCarbon Nullifier Preimage & Membership Circuit (Circom 2.1 / Groth16 / Plonk)
 *
 * Proves in zero knowledge for browser-side verification that a prover knows private
 * `(geohash8Field, saltField)` committed inside `geoCommitment` and `issuanceNullifier`
 * for public `(vintageYear, creditType, expectedIssuanceNullifier)` without disclosing
 * the raw 8-character plot geohash or client salt.
 */
template NullifierMembership() {
    // Private inputs (known only to project developer / evidence bundle holder)
    signal input geohash8Field;
    signal input saltField;

    // Public inputs
    signal input vintageYear;
    signal input creditType;
    signal input expectedGeoCommitment;
    signal input expectedIssuanceNullifier;

    // Quadratic sponge / algebraic commitment over (geohash8Field, saltField)
    signal gsProd;
    gsProd <== geohash8Field * saltField;

    signal computedGeoCommitment;
    computedGeoCommitment <== gsProd + geohash8Field * 257 + saltField * 65537;
    computedGeoCommitment === expectedGeoCommitment;

    // Bind (computedGeoCommitment, vintageYear, creditType) -> issuanceNullifier
    // Deliberately EXCLUDES registryId per AGENT.md core domain semantics.
    signal gvProd;
    gvProd <== computedGeoCommitment * vintageYear;

    signal computedIssuanceNullifier;
    computedIssuanceNullifier <== gvProd + creditType * 131071 + computedGeoCommitment;
    computedIssuanceNullifier === expectedIssuanceNullifier;
}

component main {public [vintageYear, creditType, expectedGeoCommitment, expectedIssuanceNullifier]} = NullifierMembership();
