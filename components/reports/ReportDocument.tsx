import { Disclaimer } from "@/components/shared/Disclaimer";
import { StatusMark } from "@/components/shared/StatusMark";
import { FINALIZATION_COPY } from "@/lib/copy";
import type { PublicReport } from "@/lib/reports/public-report";
import { ReportActions } from "@/components/reports/ReportActions";

function row(label: string, value: string) {
  return (
    <div className="grid gap-1 border-b border-line py-3 sm:grid-cols-[12rem_1fr]">
      <dt className="text-sm font-semibold text-muted">{label}</dt>
      <dd className="break-words">{value || "Not provided"}</dd>
    </div>
  );
}

export function ReportDocument({ report }: { report: PublicReport }) {
  return (
    <main id="main" className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-pine">Evidence report</p>
      <h1 className="mt-2 font-serif text-4xl">FoodTrace report {report.reportId}</h1>
      <p className="mt-3 text-muted">Public evidence for this check. Business quantity, supplier, email, and wallet address are not included.</p>
      <div className="no-print mt-4"><ReportActions reportId={report.reportId} /></div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <StatusMark status={report.status} pending={!(report.finalizationStatus === "finalized" && !report.isMock)} />
        {report.isMock ? <span className="rounded-full bg-amber-soft px-3 py-1 text-sm font-semibold text-amber">MOCK RESULT</span> : null}
        {report.finalizationStatus === "finalized" && !report.isMock ? <span className="text-sm text-muted">Confidence: {report.confidence}</span> : null}
      </div>
      {report.finalizationStatus === "finalized" && !report.isMock ? <p className="mt-4 text-lg leading-8">{report.reasoningSummary}</p> : null}
      <p className="mt-2 text-sm text-muted">{FINALIZATION_COPY[report.finalizationStatus]}</p>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Product and search</h2>
        <dl>
          {row("Product", report.product.productName)}
          {row("Brand", report.product.brand)}
          {row("Barcode", report.searchParameters.barcode)}
          {row("Lot / batch", report.searchParameters.lotNumber)}
          {row("Expiration", report.searchParameters.expirationDate)}
          {row("Region", report.searchParameters.region)}
          {row("Report created", report.createdAt)}
          {row("Evaluated", report.evaluatedAt)}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Matching criteria</h2>
        <p className="mt-2">{report.matchedCriteria.length ? report.matchedCriteria.join(", ") : "None"}</p>
        <p className="mt-3 break-all font-mono text-xs">Evidence hash {report.evidenceHash}</p>
        <p className="mt-2 break-all font-mono text-xs">GenLayer transaction {report.genlayerTransactionId || "None"}</p>
        <p className="mt-2 break-all font-mono text-xs">GenLayer evaluation {report.genlayerEvaluationId || "None"}</p>
      </section>

      <section className="mt-8 grid gap-4">
        <h2 className="font-serif text-2xl">Evidence</h2>
        {report.sources.length === 0 ? <p>No source record was stored for this check.</p> : null}
        {report.sources.map((source) => (
          <article key={source.evidenceHash + source.sourceUrl} className="ft-card p-5">
            <h3 className="font-semibold">{source.sourceName}</h3>
            <p className="mt-1 text-sm text-muted">Priority {source.sourcePriority} · retrieved {source.retrievedAt} · {source.matched ? "matched" : "not the deciding match"}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{source.evidenceText}</p>
            <p className="mt-2 break-all text-sm">{source.sourceUrl}</p>
          </article>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Appeal history</h2>
        {report.appeals.length === 0 ? <p className="mt-2 text-sm text-muted">No appeals are attached. An appeal would be listed here without replacing this report.</p> : null}
        <ul className="mt-3 grid gap-3">
          {report.appeals.map((appeal) => (
            <li key={appeal.id} className="ft-card p-4 text-sm">
              <p className="font-semibold">{appeal.reason.replaceAll("_", " ")} · {appeal.status}{appeal.isMock ? " · MOCK RESULT" : ""}</p>
              <p className="mt-1">{appeal.explanation}</p>
              <p className="mt-1 text-muted">{appeal.outcomeSummary}</p>
              {appeal.newEvidence ? <p className="mt-1 break-all">{appeal.newEvidence}</p> : null}
              {appeal.genlayerTransactionId ? <p className="mt-1 break-all font-mono text-xs">{appeal.genlayerTransactionId}</p> : null}
            </li>
          ))}
        </ul>
      </section>
      <div className="mt-8" id="disclaimer"><Disclaimer /></div>
    </main>
  );
}
