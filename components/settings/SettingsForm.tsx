"use client";

import { useEffect, useState } from "react";
import { Notice, PageFrame, RetryButton } from "@/components/shared/PageFrame";

interface SettingsUser {
  email: string;
  walletAddress: string;
  role: string;
  defaultRegion: string;
  emailAlerts: boolean;
}

interface PublicConfig {
  genlayerMode: string;
  studioConfigured: boolean;
  unavailableReason: string | null;
  walletConnectConfigured: boolean;
  networkName: string;
  chainId: number;
  openFdaEnabled: boolean;
  manufacturerConfigured: boolean;
  retailerConfigured: boolean;
  sessionSecretIsDefault: boolean;
}

export function SettingsForm() {
  const [user, setUser] = useState<SettingsUser | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("");
  const [alerts, setAlerts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings");
      const payload = (await response.json()) as { user: SettingsUser | null; config: PublicConfig; error?: string };
      if (!response.ok) throw new Error(payload.error || "Settings could not be loaded.");
      setUser(payload.user);
      setConfig(payload.config);
      setEmail(payload.user?.email ?? "");
      setRegion(payload.user?.defaultRegion ?? "");
      setAlerts(Boolean(payload.user?.emailAlerts));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(null);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), defaultRegion: region, emailAlerts: alerts }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Settings were not saved.");
      setSaved("Saved on this device.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Settings were not saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <PageFrame kicker="Settings" title="Profile and sources" lede="Email is optional and stays off the chain. A wallet is connected from the header when you want studio verification or inventory.">
      {loading ? <div className="h-40 animate-pulse rounded-3xl bg-white" /> : null}
      {error ? <div className="mb-4"><Notice tone="error">{error}</Notice><div className="mt-3"><RetryButton onClick={() => void load()} /></div></div> : null}
      {saved ? <div className="mb-4"><Notice>{saved}</Notice></div> : null}
      {!loading ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <form className="ft-card grid gap-4 p-5" onSubmit={(event) => void save(event)}>
            <h2 className="font-serif text-2xl">This device</h2>
            <label className="text-sm font-semibold">Email
              <input className="ft-input mt-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
            </label>
            <label className="text-sm font-semibold">Default region
              <input className="ft-input mt-1" value={region} onChange={(event) => setRegion(event.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={alerts} onChange={(event) => setAlerts(event.target.checked)} />
              Keep an email-alert preference on this profile
            </label>
            <p className="text-sm text-muted">The preference is stored. FoodTrace does not send email from this app.</p>
            <button className="w-fit rounded-full bg-pine px-5 py-3 font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Saving..." : "Save settings"}</button>
            {user?.walletAddress ? <p className="break-all text-sm text-muted">Profile wallet {user.walletAddress}</p> : <p className="text-sm text-muted">No wallet is saved on this profile yet.</p>}
          </form>
          <aside className="ft-card p-5 text-sm leading-6">
            <h2 className="font-serif text-2xl">Configuration</h2>
            <ul className="mt-3 grid gap-2 text-muted">
              <li>GenLayer mode: {config?.genlayerMode}</li>
              <li>Studio ready: {config?.studioConfigured ? "yes" : "no"}</li>
              <li>Network: {config?.networkName} ({config?.chainId})</li>
              <li>WalletConnect project: {config?.walletConnectConfigured ? "set" : "not set"}</li>
              <li>openFDA: {config?.openFdaEnabled ? "enabled" : "off"}</li>
              <li>Manufacturer endpoint: {config?.manufacturerConfigured ? "set" : "not set"}</li>
              <li>Retailer endpoint: {config?.retailerConfigured ? "set" : "not set"}</li>
            </ul>
            {config?.unavailableReason ? <p className="mt-3 text-amber">{config.unavailableReason}</p> : null}
            {config?.sessionSecretIsDefault ? <p className="mt-3">The session secret is the local default. Change FOODTRACE_SESSION_SECRET before any shared deployment.</p> : null}
          </aside>
        </div>
      ) : null}
    </PageFrame>
  );
}
