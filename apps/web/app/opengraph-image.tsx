import { ImageResponse } from "next/og";
import { site } from "@velekya/copy";

export const alt = site.baseline;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Symbole (charte v2.0, `brand/velekya-symbole-bordeaux.svg`), en image pour
// le moteur de rendu de Next.
const SYMBOL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="120" fill="#0F1F2E"/><polygon points="118,150 162,150 256,318 350,150 394,150 256,392" fill="#FFFFFF"/><circle cx="394" cy="130" r="52" fill="none" stroke="#9E1F3F" stroke-width="5" stroke-linecap="round" stroke-dasharray="262 64" transform="rotate(-90 394 130)"/><circle cx="394" cy="130" r="20" fill="#9E1F3F"/></svg>`;
const SYMBOL_SRC = `data:image/svg+xml;base64,${Buffer.from(SYMBOL).toString("base64")}`;

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
          background: "#F4F8F8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SYMBOL_SRC} width={88} height={88} alt="" />
          <div style={{ fontSize: 44, fontWeight: 600, color: "#0F1F2E", letterSpacing: -1 }}>velekya</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 60, fontWeight: 700, color: "#0F1F2E", lineHeight: 1.15 }}>
          Recrutez un employé qui ne dort jamais.
        </div>
        <div style={{ marginTop: 24, fontSize: 30, color: "#1B2A38" }}>
          {site.baseline}
        </div>
        <div style={{ marginTop: 40, width: 120, height: 8, borderRadius: 4, background: "#9E1F3F" }} />
      </div>
    ),
    size,
  );
}
