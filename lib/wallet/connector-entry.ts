export { injected } from "@wagmi/core";

// The package barrel also loads Coinbase and Base Account connectors. This file is
// the webpack target for `wagmi/connectors` so those unused connectors stay out of the build.
// @ts-expect-error Deep import has no accompanying declaration; the public barrel types stay on the app import.
export { walletConnect } from "../../node_modules/@wagmi/connectors/dist/esm/walletConnect.js";
