"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { STUDIO_NEXT } from "@/lib/genlayer/config";
import { walletConnectConfigured } from "@/lib/wallet/config";
import { walletErrorMessage } from "@/lib/wallet/reducer";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletControls({ compact = false }: { compact?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, error, isPending, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching, error: switchError } = useSwitchChain();
  const [notice, setNotice] = useState<string | null>(null);
  const wrongNetwork = Boolean(isConnected && chainId !== STUDIO_NEXT.chainId);

  useEffect(() => {
    const message = error ? walletErrorMessage(error) : null;
    if (!message) return;
    setNotice(message);
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [error]);

  function openChooser() {
    reset();
    dialogRef.current?.showModal();
  }

  return (
    <div className={compact ? "grid gap-2" : "flex items-center gap-2"}>
      {isConnected && address ? (
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold">
            {shortAddress(address)}
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-line bg-card p-4 text-sm shadow-lg">
            <p className="break-all font-mono text-xs">{address}</p>
            <p className="mt-2 text-muted">Network: {chainId === STUDIO_NEXT.chainId ? STUDIO_NEXT.name : `Chain ${chainId ?? "unknown"}`}</p>
            <p className="text-muted">GenLayer Studio {chainId === STUDIO_NEXT.chainId ? "chain matches" : "chain does not match"}.</p>
            {wrongNetwork ? (
              <button className="mt-3 w-full rounded-xl bg-pine px-3 py-2 font-semibold text-white" type="button" onClick={() => void switchChain({ chainId: STUDIO_NEXT.chainId })}>
                {switching ? "Switching..." : "Switch network"}
              </button>
            ) : null}
            {switchError ? <p className="mt-2 text-recall">{walletErrorMessage(switchError)}</p> : null}
            <button className="mt-2 w-full rounded-xl border border-line px-3 py-2" type="button" onClick={() => disconnect()}>Disconnect</button>
          </div>
        </details>
      ) : (
        <button className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white" type="button" onClick={openChooser}>
          {isPending ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
      {notice ? (
        <p className="max-w-xs rounded-xl bg-recall-soft px-3 py-2 text-xs text-recall" role="status">
          <button className="float-right ml-2 font-semibold" type="button" onClick={() => setNotice(null)} aria-label="Dismiss wallet message">Close</button>
          {notice}
        </p>
      ) : null}
      <dialog ref={dialogRef} aria-labelledby={titleId} className="w-[min(100%,28rem)] rounded-3xl border border-line bg-card p-0 text-ink backdrop:bg-ink/40">
        <form method="dialog" className="p-6">
          <h2 id={titleId} className="font-serif text-2xl">Choose a wallet</h2>
          <p className="mt-2 text-sm leading-6 text-muted">FoodTrace uses the wallet you pick. Lookup works without one. A wallet is used to sign studio verification, appeals, and business inventory.</p>
          <ul className="mt-4 grid gap-2">
            {connectors.map((connector) => (
              <li key={connector.uid}>
                <button
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-left font-semibold hover:border-pine"
                  type="submit"
                  onClick={() => connect({ connector })}
                >
                  {connector.name}
                </button>
              </li>
            ))}
          </ul>
          {walletConnectConfigured ? (
            <p className="mt-3 text-xs leading-5 text-muted">WalletConnect opens the Reown wallet modal for wallets that are not installed in this browser.</p>
          ) : (
            <p className="mt-3 text-xs leading-5 text-muted">WalletConnect and the Reown modal need NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID. Installed EIP-1193 wallets such as MetaMask, Rabby, Coinbase Wallet, OKX Wallet, Trust Wallet, and Brave Wallet can still connect.</p>
          )}
          <button className="mt-4 text-sm font-semibold text-lake" type="submit">Close</button>
        </form>
      </dialog>
    </div>
  );
}
