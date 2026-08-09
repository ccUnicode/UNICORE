import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BRAND_LOGO,
  BRAND_LOGO_WIDTHS,
  expectedLogoHeight,
} from "./brand-logo.config";

describe("brand logo presentation", () => {
  it("uses the official horizontal asset with meaningful alternative text", () => {
    assert.equal(BRAND_LOGO.src, "/unicore-logo.png");
    assert.equal(BRAND_LOGO.alt, "UniCore");
    assert.equal(BRAND_LOGO.aspectRatio, "261 / 73");
    assert.equal(BRAND_LOGO.fit, "object-contain");
  });

  it("preserves the source aspect ratio at every supported width", () => {
    assert.deepEqual(
      Object.values(BRAND_LOGO_WIDTHS).map((width) =>
        Number(expectedLogoHeight(width).toFixed(3)),
      ),
      [50.065, 56.498, 40.276],
    );
  });
});
