import Link from "next/link";
import { publicConfig } from "@/lib/genlayer/config";

export function SiteFooter() {
  const config = publicConfig();
  const network = config.genlayerMode === "mock"
    ? "GenLayer mode: mock. Results are labeled and are not chain-finalized."
    : config.studioConfigured
      ? "GenLayer Studio Next is configured for verification."
      : "GenLayer studio mode is selected, but verification is unavailable until the RPC and contract address are set.";
  return (
    <footer className="no-print mt-20 border-t border-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <p className="font-serif text-xl">FoodTrace</p>
          <p className="mt-2 text-sm leading-6 text-muted">Recall and batch checks with the evidence left visible.</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Product</p>
          <ul className="mt-2 grid gap-1 text-sm text-muted">
            <li><Link href="/lookup">Check a product</Link></li>
            <li><Link href="/how-it-works">How it works</Link></li>
            <li><Link href="/history">History</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Businesses</p>
          <ul className="mt-2 grid gap-1 text-sm text-muted">
            <li><Link href="/inventory">Inventory</Link></li>
            <li><Link href="/alerts">Alerts</Link></li>
            <li><Link href="/settings">Settings</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Documentation</p>
          <ul className="mt-2 grid gap-1 text-sm text-muted">
            <li><Link href="/docs">Documentation</Link></li>
            <li><Link href="/privacy">Privacy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
            <li><Link href="/terms#disclaimer">Safety disclaimer</Link></li>
          </ul>
          <p className="mt-4 text-sm font-semibold">Social</p>
          <p className="mt-1 text-sm text-muted">Social profiles are not connected.</p>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-4 text-sm text-muted sm:px-6">Network status: {network}</p>
      </div>
    </footer>
  );
}
