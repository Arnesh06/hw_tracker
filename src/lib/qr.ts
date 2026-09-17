import "server-only";
import QRCode from "qrcode";
import { env } from "@/lib/env";

/** The permanent URL a component's QR label points to. */
export function qrTarget(hwId: string) {
  return `${env.appUrl()}/c/${encodeURIComponent(hwId)}`;
}

/** Inline SVG markup for a component QR code (generated server-side, no user HTML). */
export async function qrSvg(hwId: string, margin = 1) {
  return QRCode.toString(qrTarget(hwId), { type: "svg", margin, errorCorrectionLevel: "M" });
}
