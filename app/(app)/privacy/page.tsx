import type { Metadata } from "next";
import { PageFrame } from "@/components/shared/PageFrame";

export const metadata: Metadata = { title: "Privacy", description: "What FoodTrace stores, what stays off public reports, and what is never collected." };

export default function PrivacyPage() {
  return (
    <PageFrame kicker="Privacy" title="What FoodTrace keeps" lede="FoodTrace stores the product details you submit, the evidence returned by configured sources, and optional profile or business records.">
      <div className="grid gap-4 text-sm leading-6">
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">On this device</h2>
          <p className="mt-2">A signed cookie links later checks to a local profile. Email is optional. The app does not ask for a private key or a seed phrase.</p>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">Public reports</h2>
          <p className="mt-2">A shared report includes the product search, source excerpts, match criteria, status, evidence hash, and any GenLayer transaction id. It does not include email, wallet address, supplier, or quantity.</p>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">On-chain</h2>
          <p className="mt-2">A studio verification sends product identifiers, public evidence URLs, and an evidence hash. It does not send medical information or private documents. Demo and localhost URLs are not submitted.</p>
        </article>
      </div>
    </PageFrame>
  );
}
