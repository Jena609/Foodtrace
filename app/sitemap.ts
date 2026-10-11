import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3460";
  return ["", "/lookup", "/history", "/alerts", "/inventory", "/inventory/add", "/settings", "/product", "/how-it-works", "/for-businesses", "/trust-evidence", "/docs", "/privacy", "/terms"].map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: new Date("2026-10-11"),
  }));
}
