"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EXAMPLE_SEARCHES } from "@/lib/sources/demo-data";
import type { ProductSearchInput } from "@/lib/types";

export function LookupExperience({ initial, autorun }: { initial: ProductSearchInput; autorun: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<ProductSearchInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [demoLabel, setDemoLabel] = useState<string | null>(null);
  const started = useRef(false);

  async function run(values: ProductSearchInput) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error || "The lookup failed.");
      router.push(`/results/${payload.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The lookup failed.");
      setPending(false);
    }
  }

  useEffect(() => {
    if (!autorun || started.current) return;
    if (!initial.barcode && !initial.productName && !initial.lotNumber) return;
    started.current = true;
    void run(initial);
    // The initial search is intentional and should not restart when form state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autorun]);

  function update(key: keyof ProductSearchInput, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-pine">Consumer lookup</p>
      <h1 className="mt-2 font-serif text-4xl">Check a product</h1>
      <p className="mt-3 text-muted">Enter what is printed on the package. A wallet is not required for this check.</p>
      {demoLabel ? <p className="mt-4 inline-flex rounded-full bg-amber-soft px-3 py-1 text-sm font-semibold text-amber" role="status">Demo Mode · {demoLabel} · Fictional Demo Data</p> : null}
      <form
        id="product-check"
        className="ft-card mt-8 grid scroll-mt-24 gap-4 p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void run(form);
        }}
      >
        <Field label="Barcode" value={form.barcode} onChange={(value) => update("barcode", value)} inputMode="numeric" />
        <Field label="Product name" value={form.productName} onChange={(value) => update("productName", value)} />
        <Field label="Brand" value={form.brand} onChange={(value) => update("brand", value)} />
        <Field label="Lot / batch number" value={form.lotNumber} onChange={(value) => update("lotNumber", value)} />
        <Field label="Expiration date" value={form.expirationDate} onChange={(value) => update("expirationDate", value)} type="date" />
        <label className="text-sm font-semibold">Country / region
          <select className="ft-select mt-1" value={form.region} onChange={(event) => update("region", event.target.value)}>
            <option value="">Select a region</option>
            {["United States", "Canada", "United Kingdom", "European Union", "Other"].map((region) => <option key={region}>{region}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-full bg-pine px-5 py-3 font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">
            {pending ? "Submitting the evaluation..." : "Check product"}
          </button>
          <button className="rounded-full border border-line bg-white px-5 py-3 font-semibold" type="button" onClick={() => setScanning((value) => !value)}>
            {scanning ? "Close scanner" : "Scan barcode"}
          </button>
          {error ? <button className="rounded-full border border-recall px-5 py-3 font-semibold text-recall" type="button" onClick={() => void run(form)}>Retry</button> : null}
        </div>
        {pending ? <p role="status" className="text-sm text-muted">Checking configured sources, normalizing evidence, and applying the match rules.</p> : null}
        {error ? <p role="alert" className="rounded-2xl bg-recall-soft px-4 py-3 text-sm text-recall">{error}</p> : null}
        {scanning ? <BarcodeScanner onDetect={(barcode) => { update("barcode", barcode); setScanning(false); }} /> : null}
      </form>
      <section id="demo-scenarios" className="mt-8 scroll-mt-24">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Try Demo</h2>
          <span className="rounded-full bg-amber-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber">Demo Mode</span>
        </div>
        <p className="mt-1 text-sm text-muted">Choose a scenario, then click Check Product. These records are Fictional Demo Data and are not official recalls.</p>
        <div className="mt-3 grid gap-2">
          {EXAMPLE_SEARCHES.map((example) => (
            <button
              key={example.id}
              className="ft-card p-4 text-left"
              type="button"
              onClick={() => {
                setForm(example.input);
                setDemoLabel(example.label);
                setError(null);
                document.getElementById("product-check")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <span className="font-semibold">{example.label}</span>
              <span className="mt-1 block text-sm text-muted">{example.description}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", inputMode }: { label: string; value: string; onChange: (value: string) => void; type?: string; inputMode?: "numeric" | "text" }) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <label className="text-sm font-semibold" htmlFor={id}>{label}
      <input id={id} className="ft-input mt-1" value={value} type={type} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function BarcodeScanner({ onDetect }: { onDetect: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const callback = useRef(onDetect);
  const [message, setMessage] = useState("Point the camera at a barcode.");
  useEffect(() => { callback.current = onDetect; }, [onDetect]);
  useEffect(() => {
    const Detector = (window as Window & { BarcodeDetector?: new (options: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setMessage("This browser has no barcode detector. Enter the number instead.");
      return;
    }
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(async (media) => {
      stream = media;
      if (!videoRef.current) return;
      videoRef.current.srcObject = media;
      await videoRef.current.play();
      const scan = async () => {
        if (stopped || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes[0]?.rawValue?.replace(/\D/g, "") ?? "";
          if (value.length >= 8) {
            callback.current(value);
            stopped = true;
            return;
          }
        } catch {
          setMessage("The scanner could not read that frame.");
        }
        frame = window.requestAnimationFrame(() => void scan());
      };
      void scan();
    }).catch(() => setMessage("Camera permission was denied. Enter the barcode instead."));
    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  return (
    <div className="rounded-2xl border border-line bg-white p-3">
      <video ref={videoRef} className="aspect-video w-full rounded-xl bg-ink" muted playsInline />
      <p className="mt-2 text-sm text-muted" role="status">{message}</p>
    </div>
  );
}
