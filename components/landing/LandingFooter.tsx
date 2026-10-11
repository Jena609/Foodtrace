import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: [
      ["Product", "/product"],
      ["How it works", "/how-it-works"],
      ["Check a product", "/lookup"],
    ],
  },
  {
    title: "Company",
    links: [
      ["For businesses", "/for-businesses"],
      ["Trust & Evidence", "/trust-evidence"],
    ],
  },
  {
    title: "Policies",
    links: [
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
      ["Safety disclaimer", "/terms#disclaimer"],
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-serif text-xl">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-pine text-sm text-white" aria-hidden="true">FT</span>
            FoodTrace
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted">Product and batch checks with the evidence left visible.</p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-semibold">{column.title}</p>
            <ul className="mt-3 grid gap-2 text-sm text-muted">
              {column.links.map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:text-ink">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
