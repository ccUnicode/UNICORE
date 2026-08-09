import Image from "next/image";
import { BRAND_LOGO } from "./brand-logo.config";

export function BrandLogo({
  width,
  priority = false,
  transparent = false,
}: {
  width: number;
  priority?: boolean;
  transparent?: boolean;
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
        src={transparent ? BRAND_LOGO.transparentSrc : BRAND_LOGO.src}
        alt={BRAND_LOGO.alt}
        fill
        sizes={`${width}px`}
        className={
          transparent
            ? "object-cover object-center"
            : `${BRAND_LOGO.fit} object-left`
        }
        priority={priority}
      />
    </div>
  );
}
