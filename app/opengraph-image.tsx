import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", height: "100%", width: "100%", background: "#F4F1EB", padding: 72, flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#0E5C4A", fontSize: 32 }}>FoodTrace</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 68, lineHeight: 1.05, color: "#1C1915", maxWidth: 900 }}>Know what&apos;s happening with the food you buy.</div>
          <div style={{ fontSize: 28, color: "#5E584F", maxWidth: 820 }}>Checks product and batch information against configured recall sources and shows the evidence.</div>
        </div>
      </div>
    ),
    size,
  );
}
