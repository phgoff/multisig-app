import { type AppType } from "next/app";

import { trpc } from "../utils/trpc";

import "../styles/globals.css";

import { configureChains, createClient, Chain, WagmiConfig } from "wagmi";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import {
  BitkubNextConnector,
  chains as bitkubChains,
} from "wagmi-bitkubnext-connector";
import { env } from "../env/client.mjs";

const chainsData: Chain[] = [bitkubChains.testnet];

const { provider } = configureChains(chainsData, [
  jsonRpcProvider({
    priority: 0,
    rpc: (chain) => {
      return {
        http: chain.rpcUrls.default,
      };
    },
  }),
]);

const client = createClient({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector(),
    new BitkubNextConnector({
      options: {
        networkMode: "testnet",
        clientId: env.NEXT_PUBLIC_BKN_CLIENT_ID,
        oauthRedirectURI: env.NEXT_PUBLIC_REDIRECT_URI,
      },
    }),
  ],
  provider,
});

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <>
      <WagmiConfig client={client}>
        <Component {...pageProps} />
      </WagmiConfig>
    </>
  );
};

export default trpc.withTRPC(MyApp);
