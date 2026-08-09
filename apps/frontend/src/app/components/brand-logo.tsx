import Image from "next/image";
import { BRAND_LOGO } from "./brand-logo.config";

export function BrandLogo({
  width,
  priority = false,
}: {
  width: number;
  priority?: boolean;
}) {
  return (
    <div
      className="relative shrink-0"
      style={{
        width,
        maxWidth: "100%",
        aspectRatio: BRAND_LOGO.aspectRatio,
      }}
    >
      <Image
        src={BRAND_LOGO.src}
        alt={BRAND_LOGO.alt}
        fill
        sizes={`${width}px`}
        className={`${BRAND_LOGO.fit} object-left`}
        priority={priority}
      />
    </div>
  );
}
