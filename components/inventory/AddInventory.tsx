"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { Notice, PageFrame } from "@/components/shared/PageFrame";
import { useSignedFetch } from "@/components/wallet/useSignedFetch";
import { cleanText } from "@/lib/security/sanitize";

const empty = { productName: "", brand: "", barcode: "", lotNumber: "", expirationDate: "", quantity: "1", supplier: "" };

export function AddInventory() {
  const router = useRouter();
  const signed = useSignedFetch();
  const { isConnected } = useAccount();
  const [businessName, setBusinessName] = useState("");
  const [region, setRegion] = useState("");
  const [needsBusiness, setNeedsBusiness] = useState(true);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function ensureBusiness(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await signed.json("/api/business", "business.create", {
        name: cleanText(businessName, 120),
        region: cleanText(region, 80),
      });
      setNeedsBusiness(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The business profile was not saved.");
    } finally {
      setPending(false);
    }
  }

  async function addItem(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const body = {
      productName: cleanText(form.productName, 160),
      brand: cleanText(form.brand, 120),
      barcode: cleanText(form.barcode, 32),
      lotNumber: cleanText(form.lotNumber, 64),
      expirationDate: cleanText(form.expirationDate, 32),
      quantity: Number(form.quantity),
      supplier: cleanText(form.supplier, 160),
    };
    try {
      await signed.json("/api/inventory", "inventory.create", body);
      router.push("/inventory");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The product was not added.";
      if (message.toLowerCase().includes("business")) setNeedsBusiness(true);
      setError(message);
      setPending(false);
    }
  }

  return (
    <PageFrame kicker="Add inventory" title="Add a lot" lede="A wallet signature ties the lot to your business. Supplier and quantity are not published on public reports.">
      {!isConnected ? <Notice>Connect a wallet before saving a business or a lot. You can still browse the labeled sample on the inventory page.</Notice> : null}
      {error ? <div className="mt-4"><Notice tone="error">{error}</Notice></div> : null}
      {needsBusiness ? (
        <form className="ft-card mt-4 grid gap-4 p-5" onSubmit={(event) => void ensureBusiness(event)}>
          <h2 className="font-serif text-2xl">Business profile</h2>
          <label className="text-sm font-semibold">Business name
            <input className="ft-input mt-1" value={businessName} onChange={(event) => setBusinessName(event.target.value)} required minLength={2} />
          </label>
          <label className="text-sm font-semibold">Region
            <input className="ft-input mt-1" value={region} onChange={(event) => setRegion(event.target.value)} required minLength={2} />
          </label>
          <button className="w-fit rounded-full bg-pine px-5 py-3 font-semibold text-white disabled:opacity-60" disabled={pending || !isConnected} type="submit">
            {pending ? "Saving..." : "Save business"}
          </button>
        </form>
      ) : (
        <form className="ft-card mt-4 grid gap-4 p-5" onSubmit={(event) => void addItem(event)}>
          {(["productName", "brand", "barcode", "lotNumber", "supplier"] as const).map((key) => (
            <label key={key} className="text-sm font-semibold capitalize">{key.replace(/([A-Z])/g, " $1")}
              <input className="ft-input mt-1" value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} required={key === "productName"} />
            </label>
          ))}
          <label className="text-sm font-semibold">Expiration date
            <input className="ft-input mt-1" type="date" value={form.expirationDate} onChange={(event) => setForm((current) => ({ ...current, expirationDate: event.target.value }))} />
          </label>
          <label className="text-sm font-semibold">Quantity
            <input className="ft-input mt-1" inputMode="numeric" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} required />
          </label>
          <button className="w-fit rounded-full bg-pine px-5 py-3 font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">
            {pending ? "Adding..." : "Add product"}
          </button>
        </form>
      )}
    </PageFrame>
  );
}
