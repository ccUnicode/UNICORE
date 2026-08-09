import Image from "next/image";
import { BRAND_LOGO, BRAND_MARK } from "./brand-logo.config";

export function BrandLogo({
  width,
  priority = false,
  compact = false,
}: {
  width: number;
  priority?: boolean;
  compact?: boolean;
}) {
  const asset = compact ? BRAND_MARK : BRAND_LOGO;

  return (
    <div
      className="relative shrink-0"
      style={{
        width,
        maxWidth: "100%",
        aspectRatio: asset.aspectRatio,
      }}
    >
      <Image
        src={asset.src}
        alt={BRAND_LOGO.alt}
        fill
        sizes={`${width}px`}
        className={`${asset.fit} object-left`}
        priority={priority}
      />
    </div>
  );
}
