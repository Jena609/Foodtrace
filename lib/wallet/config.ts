import { createConfig, createStorage, http, noopStorage } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { studioDevnet } from "genlayer-js/chains";

export const studioChain = studioDevnet;

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3460";

export const walletConnectConfigured = projectId.length > 0;

export const wagmiConfig = createConfig({
  chains: [studioChain],
  ssr: true,
  multiInjectedProviderDiscovery: true,
  storage: createStorage({ storage: typeof window === "undefined" ? noopStorage : window.localStorage }),
  transports: { [studioChain.id]: http(studioChain.rpcUrls.default.http[0]) },
  connectors: [
    injected({ shimDisconnect: true }),
    ...(walletConnectConfigured
      ? [
          walletConnect({
            projectId,
            showQrModal: true,
            metadata: {
              name: "FoodTrace",
              description: "Food recall and batch verification",
              url: appUrl,
              icons: [`${appUrl}/icon.svg`],
            },
          }),
        ]
      : []),
  ],
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
