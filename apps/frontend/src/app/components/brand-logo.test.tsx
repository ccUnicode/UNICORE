import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { JSDOM } from "jsdom";

describe("BrandLogo", () => {
  let dom: JSDOM;

  beforeEach(() => {
    dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost",
    });
    Object.defineProperties(globalThis, {
      window: { configurable: true, value: dom.window },
      document: { configurable: true, value: dom.window.document },
      navigator: { configurable: true, value: dom.window.navigator },
      HTMLElement: { configurable: true, value: dom.window.HTMLElement },
      MutationObserver: {
        configurable: true,
        value: dom.window.MutationObserver,
      },
    });
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    dom.window.close();
  });

  it("renders the horizontal asset with the reserved ratio and fit mode", async () => {
    const [{ cleanup, render }, { BrandLogo }] = await Promise.all([
      import("@testing-library/react"),
      import("./brand-logo"),
    ]);
    const view = render(<BrandLogo width={202} priority />);
    const image = view.getByRole("img", { name: "UniCore" });
    const container = image.parentElement;

    assert.ok(container);
    assert.equal(container.style.width, "202px");
    assert.equal(container.style.maxWidth, "100%");
    assert.equal(container.style.aspectRatio, "261 / 73");
    const source = new URL(image.getAttribute("src") ?? "", "http://localhost");
    assert.equal(source.searchParams.get("url"), "/unicore-logo.png");
    assert.equal(image.getAttribute("sizes"), "202px");
    assert.match(image.className, /object-contain/);
    assert.equal(image.getAttribute("data-nimg"), "fill");

    cleanup();
  });

  it("uses the transparent asset in the compact header", async () => {
    const [{ cleanup, render }, { BrandLogo }] = await Promise.all([
      import("@testing-library/react"),
      import("./brand-logo"),
    ]);
    const view = render(<BrandLogo width={144} transparent />);
    const image = view.getByRole("img", { name: "UniCore" });

    const source = new URL(image.getAttribute("src") ?? "", "http://localhost");
    assert.equal(source.searchParams.get("url"), "/unicore/unicore-logo.png");
    assert.equal(image.getAttribute("sizes"), "144px");
    assert.match(image.className, /object-cover/);
    assert.match(image.className, /object-center/);

    cleanup();
  });
});
