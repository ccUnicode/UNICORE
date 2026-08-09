export const BRAND_LOGO = {
  src: "/unicore-logo.png",
  alt: "UniCore",
  intrinsicWidth: 261,
  intrinsicHeight: 73,
  aspectRatio: "261 / 73",
  fit: "object-contain" as const,
};

export const BRAND_LOGO_WIDTHS = {
  login: 179,
  sidebar: 202,
  compactSidebar: 144,
} as const;

export function expectedLogoHeight(width: number): number {
  return (width * BRAND_LOGO.intrinsicHeight) / BRAND_LOGO.intrinsicWidth;
}
