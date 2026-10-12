import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame } from "@/components/shared/PageFrame";
import { STUDIO_NEXT } from "@/lib/genlayer/config";

export const metadata: Metadata = {
  title: "Documentation",
  description: "How FoodTrace submits evidence to GenLayer Studio Next and what each verification status means.",
};

export default function DocsPage() {
  return (
    <PageFrame kicker="Documentation" title="How FoodTrace works" lede="FoodTrace collects recall evidence and asks the GenLayer Intelligent Contract to evaluate it. It is not a food-safety authority.">
      <div className="grid gap-4">
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">Architecture</h2>
          <p className="mt-3 text-sm leading-7">User input → FoodTrace frontend → Evidence collection → GenLayer Intelligent Contract → Evidence evaluation → Finalized result → Evidence and transaction displayed to the user</p>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">Why GenLayer</h2>
          <p className="mt-2 text-sm leading-6">A private server can change a stored result later. GenLayer fetches the same public evidence URLs inside the Intelligent Contract and stores the verdict with the request id. FoodTrace shows a result as finalized only after that stored verdict is read back.</p>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">Network and contract</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold">Network</dt><dd>{STUDIO_NEXT.name}</dd></div>
            <div><dt className="font-semibold">Chain ID</dt><dd>{STUDIO_NEXT.chainId}</dd></div>
            <div><dt className="font-semibold">Contract</dt><dd className="break-all">0x3973d96145dBe83d61b36C86266D758dD3655a14</dd></div>
            <div><dt className="font-semibold">Explorer</dt><dd className="break-all">{STUDIO_NEXT.explorerUrl}</dd></div>
          </dl>
          <p className="mt-3 text-sm leading-6">The contract class is FoodTrace, policy foodtrace-v1. A check sends submit_verification_request with the product, lot, expiration, region, evidence hash, and one to six https evidence URLs.</p>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">How a check is evaluated</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
            <li>Enter the product at <Link className="font-semibold text-lake" href="/lookup">/lookup</Link>. A wallet is not required.</li>
            <li>FoodTrace reads the configured sources. The fictional demo catalog is labeled Fictional Demo Data.</li>
            <li>The server submits those public evidence URLs to the contract. The contract renders each page and compares barcode, lot, name, and brand.</li>
            <li>The server stores the transaction as SUBMITTED, then PENDING while consensus runs. Opening the result reads the explorer and get_verification_result. A transaction id alone is not a finalized result.</li>
            <li>The page then shows the classification, confidence, network, chain id, contract, transaction, evaluation id, explorer link, evidence hash, timestamp, and source excerpts.</li>
          </ol>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">Conflicting sources</h2>
          <p className="mt-2 text-sm leading-6">When a matched recall and a matched clearance are both present, FoodTrace keeps both excerpts and labels the check CONFLICTING_SOURCES. The contract returns CONFLICTING_INFORMATION when both sides match strongly and the clearance comes from an official-priority host. Pages on this site are not FDA, USDA, or CDC, so the contract can store RECALL_FOUND while the page still shows the disagreement. The contract verdict and the FoodTrace label are both shown.</p>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">Verification statuses</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6">
            <li><span className="font-semibold">SUBMITTED</span> — the contract call was sent and the transaction id is stored. The page still says Pending.</li>
            <li><span className="font-semibold">PENDING</span> — GenLayer verification: Pending. The evidence evaluation is still being processed.</li>
            <li><span className="font-semibold">FINALIZED</span> — GenLayer verification: Finalized. The explorer transaction succeeded and get_verification_result returned this request.</li>
            <li><span className="font-semibold">FAILED</span> — GenLayer verification: Failed. The evidence could not be finalized. The saved reason is shown, and the page can retry.</li>
            <li><span className="font-semibold">UNAVAILABLE</span> — the RPC, explorer, signer, or contract call could not be completed. The saved reason is shown. Retry later.</li>
          </ul>
          <p className="mt-3 text-sm leading-6">The result page polls every few seconds for up to 30 minutes from the latest submission and continues after a refresh. A retry stores a new evaluation and starts that window again. A transaction the explorer still shows as in progress stays Pending and becomes FAILED after 30 minutes, with the saved reason shown. A missing transaction id, or an explorer and RPC that cannot be reached, becomes UNAVAILABLE after 10 minutes. A temporary RPC or fee-simulation failure is retried. An older in-progress observation cannot replace a row that is already FINALIZED.</p>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">Demo data and live data</h2>
          <p className="mt-2 text-sm leading-6">Demo products are fictional. Their pages say Fictional Demo Data — not an official recall notice. If openFDA is off, the result says Live government source: Not configured. A demo source is never presented as a government authority.</p>
          <p className="mt-2 text-sm leading-6">Reviewer demos: Demo recall, exact lot; Demo, no matching recall; Demo conflicting sources; Demo expired date. Each button fills the form. Submit it, then wait on the result page until the status leaves Pending.</p>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">Environment variables</h2>
          <ul className="mt-3 grid gap-1 text-sm leading-6">
            <li>FOODTRACE_GENLAYER_MODE — studio in production. mock stays local and is not described as finalized.</li>
            <li>NEXT_PUBLIC_GENLAYER_NETWORK, NEXT_PUBLIC_GENLAYER_RPC_URL, NEXT_PUBLIC_FOODTRACE_CONTRACT_ADDRESS</li>
            <li>NEXT_PUBLIC_APP_URL — public https origin used for evidence links.</li>
            <li>TURSO_DATABASE_URL and TURSO_AUTH_TOKEN — production database. Local SQLite uses DATABASE_URL.</li>
            <li>FOODTRACE_GENLAYER_SIGNER_PRIVATE_KEY — server-only signer. Never NEXT_PUBLIC.</li>
            <li>FOODTRACE_SESSION_SECRET, FOODTRACE_OPENFDA_ENABLED, FOODTRACE_MANUFACTURER_API_URL, FOODTRACE_RETAILER_API_URL, FOODTRACE_ADMIN_TOKEN</li>
          </ul>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">Example finalized check</h2>
          <p className="mt-2 text-sm leading-6">This spinach demo was read back from the contract after the transaction finalized. It is fictional demo data, not a government recall.</p>
          <dl className="mt-3 grid gap-3 text-sm">
            <div><dt className="font-semibold">Result</dt><dd className="break-all">https://foodtrace-six.vercel.app/results/lk_f955826a00bb43188b3a129dd663847d</dd></div>
            <div><dt className="font-semibold">Classification</dt><dd>EXACT_RECALL_MATCH</dd></div>
            <div><dt className="font-semibold">Contract verdict</dt><dd>RECALL_FOUND</dd></div>
            <div><dt className="font-semibold">Evaluation ID</dt><dd className="break-all">ftv_f8a28a3d728f48b1973d3d509d985354</dd></div>
            <div><dt className="font-semibold">Transaction</dt><dd className="break-all">https://explorer-studio-dev.genlayer.com/tx/0xcec7487e75b3a4e6e8512ca48d2161ef4b4bf1e911ca5e3a43cbdb754d42c353</dd></div>
          </dl>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">Reproduce a verification</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
            <li>Open /lookup and choose a demo scenario.</li>
            <li>Submit the form. The server stores the lookup and submits submit_verification_request.</li>
            <li>Open the result. While it says Pending, the evaluation is still being processed.</li>
            <li>When it says Finalized, use the explorer link. The transaction id and evaluation id on the page are the ones stored for that request.</li>
          </ol>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">Known limitations</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6">
            <li>Live government, manufacturer, and retailer APIs are not enabled until their environment variables are set.</li>
            <li>The contract gives hosts other than FDA, USDA, and CDC priority 6. A fictional clearance on this site can therefore be stored as RECALL_FOUND.</li>
            <li>Studio Next can reset. A finalized result is proof of that transaction, not a permanent public registry.</li>
            <li>No finalized appeal transaction is recorded.</li>
            <li>FoodTrace does not guarantee that a product is safe to eat.</li>
          </ul>
        </article>
      </div>
    </PageFrame>
  );
}
