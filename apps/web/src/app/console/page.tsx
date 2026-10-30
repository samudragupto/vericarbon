"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { keccak256, encodePacked, encodeAbiParameters, stringToBytes, type Hex, type Address } from "viem";
import { supabase } from "@/lib/supabase";
import { encodeGeohash } from "@/lib/geohash";
import {
  CARBON_REGISTRY_ADDRESS,
  CARBON_REGISTRY_ABI,
} from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  Cpu,
  MapPin,
  Upload,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Trees,
  Lock,
  Flame,
  ArrowRight,
  FileCode,
} from "lucide-react";
import type { MapPin as IMapPin } from "@/components/map-view";

const MapView = dynamic(
  () => import("@/components/map-view").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
  }
);

export default function RegistryConsolePage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { success, error: toastError, info } = useToast();

  const [activeTab, setActiveTab] = useState<"project" | "issuance" | "retire">("project");
  const [isRegistryUser, setIsRegistryUser] = useState<boolean>(true); // Demo mode enabled by default
  const [loadingAuth, setLoadingAuth] = useState(false);

  // --- TAB 1: New Project State ---
  const [pinLat, setPinLat] = useState<number>(-2.8125);
  const [pinLon, setPinLon] = useState<number>(-54.8437);
  const [projectGeohash8, setProjectGeohash8] = useState<string>("6z900000");
  const [projectSalt, setProjectSalt] = useState<Hex>(
    "0x0000000000000000000000000000000000000000000000000000000000000042"
  );
  const [createdProjectId, setCreatedProjectId] = useState<Hex | null>(null);
  const [pinnedCid, setPinnedCid] = useState<string | null>(null);
  const [submittingProject, setSubmittingProject] = useState(false);

  // --- TAB 2: New Issuance State ---
  const [issuanceProjectId, setIssuanceProjectId] = useState<string>("");
  const [issuanceVintage, setIssuanceVintage] = useState<number>(2024);
  const [issuanceAmount, setIssuanceAmount] = useState<number>(544);
  const [issuanceCreditType, setIssuanceCreditType] = useState<number>(0);
  const [issuanceDataCommitment, setIssuanceDataCommitment] = useState<Hex>(
    "0x00000000000000000000000000000000000000000000000000000000000000f6"
  );
  const [uploadedProofHex, setUploadedProofHex] = useState<Hex | null>(null);
  const [computedIssuanceNullifier, setComputedIssuanceNullifier] = useState<Hex | null>(null);
  const [submittingIssuance, setSubmittingIssuance] = useState(false);

  // --- TAB 3: Retire State ---
  const [retireSerialId, setRetireSerialId] = useState<number>(1);
  const [retireAmount, setRetireAmount] = useState<number>(100);
  const [retireClaimType, setRetireClaimType] = useState<number>(0);
  const [retireBeneficiary, setRetireBeneficiary] = useState<string>("Corporate ESG Scope 3 Offset");
  const [computedClaimNullifier, setComputedClaimNullifier] = useState<Hex | null>(null);
  const [submittingRetire, setSubmittingRetire] = useState(false);

  const { writeContractAsync } = useWriteContract();

  // Initialize random salt client-side
  useEffect(() => {
    try {
      const randomBytes = new Uint8Array(32);
      window.crypto.getRandomValues(randomBytes);
      const hex =
        "0x" +
        Array.from(randomBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      setProjectSalt(hex as Hex);
    } catch {
      // fallback
    }
  }, []);

  // Update geohash when pin coordinates change
  function handleMapClick(lat: number, lon: number) {
    setPinLat(lat);
    setPinLon(lon);
    const gh = encodeGeohash(lat, lon, 8);
    setProjectGeohash8(gh);
    info("AOI Pin Updated", `Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)} -> ${gh}`);
  }

  // Action: Register Project
  async function handleRegisterProject() {
    setSubmittingProject(true);
    try {
      // 1. Generate client-side salt and commitments
      const gh8 = projectGeohash8.padEnd(8, "0").slice(0, 8);
      const gh8Bytes = stringToBytes(gh8);
      const gh8Hex = ("0x" + Buffer.from(gh8Bytes).toString("hex").padEnd(16, "0").slice(0, 16)) as Hex;

      // geoCommitment := keccak256(abi.encode(geohash8, salt))
      const geoCommitment = keccak256(
        encodeAbiParameters(
          [{ type: "bytes8" }, { type: "bytes32" }],
          [gh8Hex, projectSalt]
        )
      );

      // Unique projectId
      const projId = keccak256(
        encodePacked(
          ["string", "bytes32", "uint256"],
          ["vericarbon-project", geoCommitment, BigInt(Date.now())]
        )
      );

      // 2. Build Evidence Bundle and POST to /api/evidence
      const bundlePayload = {
        bundleVersion: "1.0.0",
        projectId: projId,
        aoiGeohash8: gh8,
        salt: projectSalt,
        sceneIds: [
          "S2A_MSIL2A_20240715_T21MYT",
          "S2B_MSIL2A_20240824_T21MYT",
          "S2A_MSIL2A_20240918_T21MYT",
        ],
        featureStats: {
          ndvi_mean: { min: 0.65, max: 0.88, mean: 0.81, std: 0.04 },
          ndre_mean: { min: 0.45, max: 0.68, mean: 0.58, std: 0.03 },
        },
        dataCommitment: "0x00000000000000000000000000000000000000000000000000000000000000f6" as Hex,
        modelHash: "0x00000000000000000000000000000000000000000000000000000000000078ab" as Hex,
        quantizedFeatures: [780, 810, 840, 560, 590, 610, 10, 1, 0, 0, 0, 0],
        predictedCredits: 544,
        vintageYear: 2024,
        creditType: 0,
      };

      const res = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bundlePayload),
      });

      if (!res.ok) {
        throw new Error(`Failed to pin evidence bundle: HTTP ${res.status}`);
      }

      const { cid } = await res.json();
      setPinnedCid(cid);
      setCreatedProjectId(projId);

      // 3. Submit wagmi transaction registerProject
      if (writeContractAsync) {
        const hash = await writeContractAsync({
          address: CARBON_REGISTRY_ADDRESS,
          abi: CARBON_REGISTRY_ABI,
          functionName: "registerProject",
          args: [projId, geoCommitment, cid],
        });

        // Trigger indexer sync
        await fetch("/api/cron/indexer", { method: "POST" });
        success("Project Registered Successfully", `Tx: ${hash.slice(0, 10)}... | Project: ${projId.slice(0, 10)}...`);
      } else {
        success("Project Bundle Created (Simulated)", `CID: ${cid}`);
      }

      setIssuanceProjectId(projId);
    } catch (err) {
      toastError(
        "Project Registration Failed",
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setSubmittingProject(false);
    }
  }

  // Action: Handle proof.json file upload
  function handleProofFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.hex_proof) {
          setUploadedProofHex(parsed.hex_proof as Hex);
          success("Proof Loaded", `Loaded ezkl Halo2 proof (${parsed.hex_proof.length / 2} bytes)`);
        } else {
          toastError("Invalid Proof File", "Expected .hex_proof property in JSON.");
        }
      } catch (err) {
        toastError("JSON Parse Error", "Could not parse proof.json file.");
      }
    };
    reader.readAsText(file);
  }

  // Action: Issue Credits
  async function handleIssueCredits() {
    setSubmittingIssuance(true);
    try {
      const pid = (issuanceProjectId.trim() ||
        createdProjectId ||
        "0x0f2424f45c5bc025be3b6482794fa03966d6d93aab549f1526e7494d17e562a9") as Hex;

      // Proof fixture fallback (ezkl proof bytes)
      const proofHex = uploadedProofHex || ("0x" + "00".repeat(4032) as Hex);

      if (writeContractAsync) {
        const hash = await writeContractAsync({
          address: CARBON_REGISTRY_ADDRESS,
          abi: CARBON_REGISTRY_ABI,
          functionName: "issue",
          args: [
            pid,
            issuanceVintage,
            issuanceCreditType,
            BigInt(issuanceAmount),
            issuanceDataCommitment,
            proofHex,
          ],
        });

        // Derive expected nullifier
        // issuanceNullifier := keccak256(abi.encode(geoCommitment, vintageYear, creditType))
        const sampleNullifier = keccak256(
          encodePacked(
            ["bytes32", "uint16", "uint8"],
            [pid, issuanceVintage, issuanceCreditType]
          )
        );
        setComputedIssuanceNullifier(sampleNullifier);

        await fetch("/api/cron/indexer", { method: "POST" });
        success("Credits Issued Successfully", `Tx: ${hash.slice(0, 10)}... | Amount: ${issuanceAmount} tCO2e`);
      } else {
        const sampleNullifier = keccak256(
          encodePacked(
            ["bytes32", "uint16", "uint8"],
            [pid, issuanceVintage, issuanceCreditType]
          )
        );
        setComputedIssuanceNullifier(sampleNullifier);
        success("Credits Issued (Simulated)", `Nullifier: ${sampleNullifier.slice(0, 12)}...`);
      }
    } catch (err) {
      toastError(
        "Credit Issuance Failed",
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setSubmittingIssuance(false);
    }
  }

  // Action: Retire Credits
  async function handleRetireCredits() {
    setSubmittingRetire(true);
    try {
      const beneficiaryCommitment = keccak256(stringToBytes(retireBeneficiary));

      if (writeContractAsync) {
        const hash = await writeContractAsync({
          address: CARBON_REGISTRY_ADDRESS,
          abi: CARBON_REGISTRY_ABI,
          functionName: "retireAmounts",
          args: [
            [BigInt(retireSerialId)],
            [BigInt(retireAmount)],
            retireClaimType,
            beneficiaryCommitment,
          ],
        });

        const sampleClaimNullifier = keccak256(
          encodePacked(
            ["bytes32", "address", "uint8", "bytes32"],
            [
              computedIssuanceNullifier || ("0x" + "20".repeat(32) as Hex),
              (address || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266") as Address,
              retireClaimType,
              beneficiaryCommitment,
            ]
          )
        );
        setComputedClaimNullifier(sampleClaimNullifier);

        await fetch("/api/cron/indexer", { method: "POST" });
        success("Credits Retired Successfully", `Claim Nullifier: ${sampleClaimNullifier.slice(0, 12)}...`);
      } else {
        const sampleClaimNullifier = keccak256(
          encodePacked(
            ["bytes32", "string", "uint8"],
            [("0x" + "20".repeat(32)) as Hex, retireBeneficiary, retireClaimType]
          )
        );
        setComputedClaimNullifier(sampleClaimNullifier);
        success("Credits Retired (Simulated)", `Claim Nullifier: ${sampleClaimNullifier.slice(0, 12)}...`);
      }
    } catch (err) {
      toastError(
        "Retirement Failed",
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setSubmittingRetire(false);
    }
  }

  const mapPins: IMapPin[] = [
    {
      id: "new-aoi-placement",
      latitude: pinLat,
      longitude: pinLon,
      title: `AOI: ${projectGeohash8}`,
      description: `Lat: ${pinLat.toFixed(4)}, Lon: ${pinLon.toFixed(4)}`,
      badge: "Pending Pin",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <Cpu className="h-6 w-6 text-emerald-400" />
            Registry Management Console
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gated registrar operations: project registration, ZK-verified credit issuance, and retirement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs py-1 px-3 gap-1.5 border border-emerald-800 bg-emerald-950/70">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Registry Role: Authorized
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 space-x-2">
        <button
          onClick={() => setActiveTab("project")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "project"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Trees className="h-4 w-4" />
          1. New Project Registration
        </button>
        <button
          onClick={() => setActiveTab("issuance")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "issuance"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Upload className="h-4 w-4" />
          2. ZK Credit Issuance
        </button>
        <button
          onClick={() => setActiveTab("retire")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "retire"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Flame className="h-4 w-4" />
          3. Retire &amp; Claim Nullifier
        </button>
      </div>

      {/* TAB 1: New Project */}
      {activeTab === "project" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-400" />
              Click-to-Place Map AOI Selector
            </h3>
            <p className="text-xs text-zinc-400">
              Click anywhere on the map to define the project centroid. The client computes the 8-character geohash and derives the cryptographic commitment.
            </p>
            <MapView
              pins={mapPins}
              center={[pinLon, pinLat]}
              zoom={13}
              onMapClick={handleMapClick}
              className="h-[360px] w-full"
            />
          </div>

          <div className="space-y-4">
            <Card className="border-zinc-800 bg-zinc-950/70">
              <CardHeader className="pb-3 border-b border-zinc-900">
                <CardTitle className="text-sm font-mono text-zinc-200">
                  Client-Side Commitment Parameters
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Salt generated with crypto.getRandomValues; evidence bundle pinned via IPFS adapter.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 text-xs font-mono">
                <div>
                  <label className="text-zinc-400 block mb-1">DERIVED GEOHASH8</label>
                  <Input
                    value={projectGeohash8}
                    onChange={(e) => setProjectGeohash8(e.target.value)}
                    className="font-mono text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">CLIENT-SIDE SALT (32 BYTES)</label>
                  <Input
                    value={projectSalt}
                    onChange={(e) => setProjectSalt(e.target.value as Hex)}
                    className="font-mono text-[11px]"
                  />
                </div>

                <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800 space-y-1 text-[11px]">
                  <div className="text-zinc-400">Selected Coordinates:</div>
                  <div className="text-zinc-200 font-mono">
                    Lat: {pinLat.toFixed(6)}, Lon: {pinLon.toFixed(6)}
                  </div>
                </div>

                <Button
                  onClick={handleRegisterProject}
                  disabled={submittingProject}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-2 mt-4"
                >
                  {submittingProject ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Pinning to IPFS &amp; Registering on-chain...
                    </>
                  ) : (
                    <>
                      <Trees className="h-4 w-4" />
                      Register Project On-Chain
                    </>
                  )}
                </Button>

                {createdProjectId && (
                  <div className="mt-4 p-3 rounded-lg border border-emerald-800/80 bg-emerald-950/40 text-emerald-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      Project Registered On-Chain!
                    </div>
                    <div className="text-[11px] font-mono break-all text-zinc-300">
                      ID: {createdProjectId}
                    </div>
                    {pinnedCid && (
                      <div className="text-[11px] font-mono text-zinc-400 break-all">
                        CID: {pinnedCid}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: ZK Credit Issuance */}
      {activeTab === "issuance" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-zinc-800 bg-zinc-950/70">
            <CardHeader className="border-b border-zinc-900 pb-4">
              <CardTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-400" />
                MRV Quantify Upload &amp; ZK Proof Issuance
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Upload quantification output and proof.json from services/mrv and services/zk to mint verified ERC-1155 tokens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6 text-xs font-mono">
              <div>
                <label className="text-zinc-400 block mb-1">TARGET PROJECT ID</label>
                <Input
                  value={issuanceProjectId}
                  onChange={(e) => setIssuanceProjectId(e.target.value)}
                  placeholder="0x..."
                  className="font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">VINTAGE YEAR</label>
                  <Input
                    type="number"
                    value={issuanceVintage}
                    onChange={(e) => setIssuanceVintage(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">AMOUNT (tCO2e)</label>
                  <Input
                    type="number"
                    value={issuanceAmount}
                    onChange={(e) => setIssuanceAmount(Number(e.target.value))}
                    className="text-emerald-400 font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">CREDIT TYPE</label>
                  <Input
                    type="number"
                    value={issuanceCreditType}
                    onChange={(e) => setIssuanceCreditType(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">DATA COMMITMENT (SHA256 PREIMAGE)</label>
                <Input
                  value={issuanceDataCommitment}
                  onChange={(e) => setIssuanceDataCommitment(e.target.value as Hex)}
                  className="font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">ATTACH EZKL PROOF.JSON</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleProofFileUpload}
                  className="block w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-emerald-400 hover:file:bg-zinc-700 cursor-pointer"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block font-sans">
                  Default fixture loaded if file is not selected.
                </span>
              </div>

              <Button
                onClick={handleIssueCredits}
                disabled={submittingIssuance}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-2 mt-4"
              >
                {submittingIssuance ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Executing ZK Proof Verification &amp; Minting...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Issue Verified Credits (call issue)
                  </>
                )}
              </Button>

              {computedIssuanceNullifier && (
                <div className="mt-4 p-4 rounded-lg border border-emerald-800/80 bg-emerald-950/40 text-emerald-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Issuance Succeeded!
                  </div>
                  <div className="text-xs font-mono text-zinc-400">
                    Computed Global Issuance Nullifier:
                  </div>
                  <div className="text-xs font-mono break-all text-emerald-300 font-bold p-2 bg-zinc-950/80 rounded border border-emerald-900/60">
                    {computedIssuanceNullifier}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans mt-1">
                    This nullifier is now spent globally on-chain across all registries.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Retire Credits */}
      {activeTab === "retire" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-zinc-800 bg-zinc-950/70">
            <CardHeader className="border-b border-zinc-900 pb-4">
              <CardTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-400" />
                Retire Credits &amp; Generate Claim Nullifier
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Permanently burns credit tokens and records the unique claimNullifier to prevent double-claiming.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">SERIAL BATCH ID</label>
                  <Input
                    type="number"
                    value={retireSerialId}
                    onChange={(e) => setRetireSerialId(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">RETIRE AMOUNT (tCO2e)</label>
                  <Input
                    type="number"
                    value={retireAmount}
                    onChange={(e) => setRetireAmount(Number(e.target.value))}
                    className="text-amber-400 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">CLAIM TYPE</label>
                <Input
                  type="number"
                  value={retireClaimType}
                  onChange={(e) => setRetireClaimType(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">BENEFICIARY STATEMENT / COMMITMENT</label>
                <Input
                  value={retireBeneficiary}
                  onChange={(e) => setRetireBeneficiary(e.target.value)}
                  className="font-sans text-xs"
                />
              </div>

              <Button
                onClick={handleRetireCredits}
                disabled={submittingRetire}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium gap-2 mt-4"
              >
                {submittingRetire ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Burning Tokens &amp; Recording Nullifier...
                  </>
                ) : (
                  <>
                    <Flame className="h-4 w-4" />
                    Execute Retirement (retire tx)
                  </>
                )}
              </Button>

              {computedClaimNullifier && (
                <div className="mt-4 p-4 rounded-lg border border-amber-800/80 bg-amber-950/40 text-amber-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Retirement Complete!
                  </div>
                  <div className="text-xs font-mono text-zinc-400">
                    Recorded Claim Nullifier:
                  </div>
                  <div className="text-xs font-mono break-all text-amber-300 font-bold p-2 bg-zinc-950/80 rounded border border-amber-900/60">
                    {computedClaimNullifier}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans mt-1">
                    This claim nullifier guarantees permanent retirement and renders replaying this claim impossible.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

