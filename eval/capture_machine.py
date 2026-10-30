"""
eval/capture_machine.py — Hardware inspection script for VeriCarbon reproducibility.
Captures true machine specifications via Windows CIM and nvidia-smi.
Emits eval/results/machine_specs.json.
"""

import datetime
import json
import os
import subprocess
import sys

def run_ps_json(cmd: str):
    res = subprocess.run(
        ["powershell", "-NoProfile", "-Command", f"ConvertTo-Json @({cmd})"],
        capture_output=True,
        text=True,
        check=True
    )
    out = res.stdout.strip()
    if not out:
        return []
    data = json.loads(out)
    if isinstance(data, list):
        return data
    return [data]

def capture_specs():
    # 1. System & Model
    cs_prod = run_ps_json("Get-CimInstance Win32_ComputerSystemProduct")[0]
    manufacturer = cs_prod.get("Vendor", "LENOVO").strip()
    model = cs_prod.get("Version", cs_prod.get("Name", "LOQ 15APH8")).strip()

    # 2. Processor
    proc = run_ps_json("Get-CimInstance Win32_Processor")[0]
    cpu_name = proc.get("Name", "").strip()
    
    cores_physical = None
    threads_logical = None
    ram_usable_gb = None

    try:
        import psutil
        cores_physical = psutil.cpu_count(logical=False)
        threads_logical = psutil.cpu_count(logical=True)
        ram_usable_gb = round(psutil.virtual_memory().total / (1024**3), 2)
    except ImportError:
        pass

    if cores_physical is None:
        cores_physical = int(proc.get("NumberOfCores", 8))
    if threads_logical is None:
        threads_logical = int(proc.get("NumberOfLogicalProcessors", 16))

    # 3. RAM
    mem_modules = run_ps_json("Get-CimInstance Win32_PhysicalMemory")
    total_installed_bytes = sum(int(m.get("Capacity", 0)) for m in mem_modules)
    ram_installed_gb = round(total_installed_bytes / (1024**3), 2)

    # 4. OS
    os_info = run_ps_json("Get-CimInstance Win32_OperatingSystem")[0]
    os_name = os_info.get("Caption", "").strip()
    os_version = os_info.get("Version", "").strip()

    if ram_usable_gb is None:
        vis_kb = int(os_info.get("TotalVisibleMemorySize", 0))
        ram_usable_gb = round(vis_kb / (1024**2), 2)

    # 5. GPU
    gpu_name = "None"
    gpu_vram_gb = 0.0
    try:
        smi_out = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
            capture_output=True,
            text=True,
            check=True
        ).stdout.strip()
        if smi_out:
            parts = [p.strip() for p in smi_out.splitlines()[0].split(",")]
            gpu_name = parts[0]
            gpu_vram_gb = round(float(parts[1]) / 1024.0, 2)
    except Exception as e:
        print(f"Warning: nvidia-smi failed ({e})", file=sys.stderr)

    captured_at_utc = datetime.datetime.now(datetime.timezone.utc).isoformat()

    specs = {
        "manufacturer": manufacturer,
        "model": model,
        "cpu_name": cpu_name,
        "cores_physical": cores_physical,
        "threads_logical": threads_logical,
        "ram_installed_gb": ram_installed_gb,
        "ram_usable_gb": ram_usable_gb,
        "gpu_name": gpu_name,
        "gpu_vram_gb": gpu_vram_gb,
        "os_name": os_name,
        "os_version": os_version,
        "captured_at_utc": captured_at_utc
    }
    return specs

def main():
    specs = capture_specs()
    out_dir = os.path.join(os.path.dirname(__file__), "results")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "machine_specs.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(specs, f, indent=2)

    print("=== CAPTURED MACHINE SPECIFICATIONS ===")
    print(json.dumps(specs, indent=2))
    print(f"\nWrote specs to {out_file}")

if __name__ == "__main__":
    main()
