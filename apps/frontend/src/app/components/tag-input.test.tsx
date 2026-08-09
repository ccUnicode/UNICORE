import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { useState } from "react";
import { TagInput } from "./tag-input";

describe("TagInput form submission", () => {
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

  it("blocks save and keeps the error visible for an invalid draft", async () => {
    const { cleanup, fireEvent, render } = await import(
      "@testing-library/react"
    );
    let submissions = 0;

    function Form() {
      const [tags, setTags] = useState<string[]>([]);
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submissions += 1;
          }}
        >
          <TagInput
            label="Etiquetas"
            value={tags}
            suggestions={[]}
            maxLength={5}
            onChange={setTags}
          />
          <button type="submit">Guardar</button>
        </form>
      );
    }

    const view = render(<Form />);
    try {
      const input = view.getByRole("textbox") as HTMLInputElement;
      const save = view.getByRole("button", { name: "Guardar" });

      fireEvent.change(input, { target: { value: "demasiado largo" } });
      fireEvent.blur(input, { relatedTarget: save });
      fireEvent.click(save);

      assert.equal(submissions, 0);
      assert.equal(input.validity.customError, true);
      assert.match(view.container.textContent ?? "", /hasta 5 caracteres/);
    } finally {
      cleanup();
    }
  });

  it("commits a valid draft before saving", async () => {
    const { cleanup, fireEvent, render } = await import(
      "@testing-library/react"
    );
    let submittedTags: string[] | undefined;

    function Form() {
      const [tags, setTags] = useState<string[]>([]);
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submittedTags = tags;
          }}
        >
          <TagInput
            label="Etiquetas"
            value={tags}
            suggestions={[]}
            maxLength={50}
            onChange={setTags}
          />
          <button type="submit">Guardar</button>
        </form>
      );
    }

    const view = render(<Form />);
    try {
      const input = view.getByRole("textbox");
      const save = view.getByRole("button", { name: "Guardar" });

      fireEvent.change(input, { target: { value: "Frontend" } });
      fireEvent.blur(input, { relatedTarget: save });
      fireEvent.click(save);

      assert.deepEqual(submittedTags, ["Frontend"]);
    } finally {
      cleanup();
    }
  });
});
