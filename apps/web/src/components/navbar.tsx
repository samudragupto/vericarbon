"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Trees, Globe, ShieldAlert, Cpu, Wallet, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const navLinks = [
    { href: "/projects", label: "Projects Explorer", icon: Globe },
    { href: "/nullifiers", label: "Nullifiers", icon: ShieldAlert },
    { href: "/console", label: "Registry Console", icon: Cpu },
  ];

  return (
    <header className="sticky top-[33px] z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950 border border-emerald-700/60 text-emerald-400 group-hover:border-emerald-500 transition-colors">
              <Trees className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-zinc-100 flex items-center gap-1.5 text-base">
                VeriCarbon
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                  zkMRV
                </span>
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-zinc-800/90 text-emerald-400 border border-zinc-700/60"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isConnected && address ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/90 px-3 py-1 font-mono text-xs text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {address.slice(0, 6)}...{address.slice(-4)}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => disconnect()}
                className="h-8 text-zinc-400 hover:text-zinc-100 px-2"
                title="Disconnect wallet"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const connector = connectors[0];
                if (connector) {
                  connect({ connector });
                }
              }}
              className="border-emerald-800/70 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50"
            >
              <Wallet className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

