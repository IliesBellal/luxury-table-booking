// Applique les couleurs du marchand (design.primary_color) aux variables
// CSS du design system, pour que chaque restaurant retrouve son identité.

import type { MerchantDesign } from "@/lib/api";

/** #RRGGBB ou #RGB → triplet HSL "H S% L%" (format des variables shadcn) */
export function hexToHslTriple(hex: string): string | null {
  const value = hex.trim().replace(/^#/, "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;

  const n = parseInt(full, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyBranding(design?: MerchantDesign) {
  if (!design) return;
  const root = document.documentElement;

  const primary = hexToHslTriple(design.primary_color);
  if (primary) {
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--brand", primary);
    root.style.setProperty("--ring", primary);
  }

  const onPrimary = hexToHslTriple(design.text_color_on_primary_color);
  if (onPrimary) {
    root.style.setProperty("--primary-foreground", onPrimary);
    root.style.setProperty("--brand-foreground", onPrimary);
  }
}
