import { http, createConfig, createConnector } from "wagmi";
import { baseSepolia } from "wagmi/chains";

export const anvil = {
  id: 31337,
  name: "Anvil Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ANVIL_RPC_URL || "http://127.0.0.1:8545"],
    },
  },
  testnet: true,
} as const;

export function customInjectedConnector() {
  return createConnector((config) => ({
    id: "injected",
    name: "Browser Injected Wallet",
    type: "injected",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async connect(parameters?: any): Promise<any> {
      const provider =
        typeof window !== "undefined"
          ? (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<unknown> } }).ethereum
          : undefined;

      if (!provider) {
        return {
          accounts: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`] as const,
          chainId: anvil.id,
        };
      }
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as `0x${string}`[];
      const currentChainId = (await provider.request({
        method: "eth_chainId",
      })) as string;
      return {
        accounts: accounts as readonly `0x${string}`[],
        chainId: Number(currentChainId),
      };
    },
    async disconnect() {},
    async getAccounts() {
      const provider =
        typeof window !== "undefined"
          ? (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<unknown> } }).ethereum
          : undefined;
      if (!provider) {
        return ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`];
      }
      const accounts = (await provider.request({
        method: "eth_accounts",
      })) as `0x${string}`[];
      return accounts as readonly `0x${string}`[];
    },
    async getChainId() {
      const provider =
        typeof window !== "undefined"
          ? (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<unknown> } }).ethereum
          : undefined;
      if (!provider) return anvil.id;
      const chainId = (await provider.request({
        method: "eth_chainId",
      })) as string;
      return Number(chainId);
    },
    async getProvider() {
      return typeof window !== "undefined"
        ? (window as unknown as { ethereum?: unknown }).ethereum
        : undefined;
    },
    async isAuthorized() {
      return true;
    },
    onAccountsChanged(accounts) {
      config.emitter.emit("change", {
        accounts: accounts as readonly `0x${string}`[],
      });
    },
    onChainChanged(chain) {
      config.emitter.emit("change", { chainId: Number(chain) });
    },
    onDisconnect() {
      config.emitter.emit("disconnect");
    },
  }));
}

export const wagmiConfig = createConfig({
  chains: [baseSepolia, anvil],
  connectors: [customInjectedConnector()],
  transports: {
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    ),
    [anvil.id]: http(
      process.env.NEXT_PUBLIC_ANVIL_RPC_URL || "http://127.0.0.1:8545",
    ),
  },
  ssr: true,
});
