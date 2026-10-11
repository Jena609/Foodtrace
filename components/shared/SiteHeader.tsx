"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { WalletControls } from "@/components/wallet/WalletControls";

const links = [
  { href: "/product", label: "Product" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/for-businesses", label: "For businesses" },
  { href: "/trust-evidence", label: "Trust & Evidence" },
];

const appLinks = [
  { href: "/lookup", label: "Lookup" },
  { href: "/history", label: "History" },
  { href: "/alerts", label: "Alerts" },
  { href: "/inventory", label: "Inventory" },
  { href: "/settings", label: "Settings" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const marketing = pathname === "/";
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, defaultRegion: "", emailAlerts: false }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Sign-in failed.");
      setMessage("Saved on this device. History from later checks will stay with this profile.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <div className={`mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 ${marketing ? "py-4 lg:grid lg:grid-cols-[1fr_auto_1fr]" : "py-3"}`}>
        <Link href="/" className={`flex items-center gap-2 font-serif text-xl font-semibold ${marketing ? "lg:justify-self-start" : ""}`}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-pine text-sm text-white" aria-hidden="true">FT</span>
          FoodTrace
        </Link>
        <nav className={`hidden items-center gap-5 text-sm font-semibold text-muted lg:flex ${marketing ? "justify-center" : ""}`} aria-label="Primary">
          {links.map((link) => <Link key={link.href} href={link.href} className="hover:text-ink">{link.label}</Link>)}
        </nav>
        <div className={`hidden items-center gap-2 lg:flex ${marketing ? "lg:justify-self-end" : ""}`}>
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold">Sign in</summary>
            <form onSubmit={signIn} className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-line bg-card p-4 shadow-lg">
              <p className="text-sm leading-6 text-muted">Save an email on this device. FoodTrace does not use a password, and a wallet is still required for studio verification and inventory changes.</p>
              <label className="mt-3 block text-sm font-semibold" htmlFor="sign-in-email">Email</label>
              <input id="sign-in-email" className="ft-input mt-1" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              <button className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white" type="submit" disabled={pending}>{pending ? "Saving..." : "Save on this device"}</button>
              {message ? <p className="mt-2 text-sm" role="status">{message}</p> : null}
            </form>
          </details>
          <WalletControls />
        </div>
        <details className="relative lg:hidden">
          <summary className="cursor-pointer list-none rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold">
            <span className="inline-flex items-center gap-2"><Menu aria-hidden="true" className="h-4 w-4" /> Menu</span>
          </summary>
          <nav className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-line bg-card p-4 shadow-lg" aria-label="Mobile">
            {(marketing ? links : links.concat(appLinks)).map((link) => <Link key={link.href} className="block py-2 text-sm font-semibold" href={link.href}>{link.label}</Link>)}
            <form onSubmit={signIn} className="mt-3 border-t border-line pt-3">
              <label className="text-sm font-semibold" htmlFor="mobile-email">Email for this device</label>
              <input id="mobile-email" className="ft-input mt-1" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              <button className="mt-2 w-full rounded-full bg-ink px-3 py-2 text-sm font-semibold text-white" disabled={pending}>{pending ? "Saving..." : "Sign in"}</button>
              {message ? <p className="mt-2 text-xs" role="status">{message}</p> : null}
            </form>
            <div className="mt-3"><WalletControls compact /></div>
          </nav>
        </details>
      </div>
      {marketing ? null : (
        <div className="mx-auto hidden max-w-7xl gap-4 px-6 pb-3 text-sm font-semibold text-muted lg:flex">
          {appLinks.map((link) => <Link key={link.href} href={link.href} className="hover:text-ink">{link.label}</Link>)}
        </div>
      )}
    </header>
  );
}
