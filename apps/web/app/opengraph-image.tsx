import { ImageResponse } from "next/og";
import { site } from "@tando/copy";

export const alt = site.baseline;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#fbf9f4",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "#26714b",
              color: "#fbf9f4",
              fontSize: 44,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            T
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#1f5c3d" }}>Tando</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 60, fontWeight: 700, color: "#1c1a17", lineHeight: 1.15 }}>
          Recrutez un employé qui ne dort jamais.
        </div>
        <div style={{ marginTop: 24, fontSize: 30, color: "#3d3a34" }}>
          Votre employé virtuel, 24h/24, 7j/7.
        </div>
      </div>
    ),
    size,
  );
}
