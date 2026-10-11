"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HeroSearch() {
  const router = useRouter();
  const [barcode, setBarcode] = useState("0123456789012");
  const [productName, setProductName] = useState("North Orchard Organic Baby Spinach");
  const [brand, setBrand] = useState("North Orchard");
  const [lotNumber, setLotNumber] = useState("DEMO-SPIN-1001");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({ barcode, productName, brand, lotNumber, autorun: "1" });
    router.push(`/lookup?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="ft-card p-5 sm:p-6" aria-label="Sample product lookup">
      <p className="text-sm font-semibold text-pine">Try a fictional demo product</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Barcode<input className="ft-input mt-1" value={barcode} onChange={(event) => setBarcode(event.target.value)} inputMode="numeric" /></label>
        <label className="text-sm font-semibold">Lot / batch<input className="ft-input mt-1" value={lotNumber} onChange={(event) => setLotNumber(event.target.value)} /></label>
        <label className="text-sm font-semibold sm:col-span-2">Product name<input className="ft-input mt-1" value={productName} onChange={(event) => setProductName(event.target.value)} /></label>
        <label className="text-sm font-semibold sm:col-span-2">Brand<input className="ft-input mt-1" value={brand} onChange={(event) => setBrand(event.target.value)} /></label>
      </div>
      <button className="mt-4 w-full rounded-full bg-pine px-4 py-3 font-semibold text-white" type="submit">Check this product</button>
      <p className="mt-3 text-xs leading-5 text-muted">Demo records are fictional and labeled. A result is not a statement that food is safe.</p>
    </form>
  );
}
