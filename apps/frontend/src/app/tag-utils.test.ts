import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalizeTags,
  matchingTagSuggestions,
  normalizeTag,
  validateTag,
} from "./tag-utils";

describe("tag utilities", () => {
  it("normalizes casing, accents, and repeated spaces", () => {
    assert.equal(normalizeTag("  Gestión   Ágil "), "gestion agil");
  });

  it("deduplicates equivalent values and preserves a canonical suggestion", () => {
    assert.deepEqual(
      canonicalizeTags(
        ["js", " JS ", "gestion agil", "Gestión   Ágil"],
        ["JavaScript", "JS", "Gestión Ágil"],
      ),
      ["JS", "Gestión Ágil"],
    );
  });

  it("filters suggestions and excludes selected tags", () => {
    assert.deepEqual(
      matchingTagSuggestions(
        "re",
        ["React", "Research", "Node.js", "réact"],
        ["REACT"],
      ),
      ["Research"],
    );
  });

  it("returns clear validation errors for empty and oversized tags", () => {
    assert.match(validateTag("   ") ?? "", /Escribe una etiqueta/);
    assert.match(validateTag("x".repeat(61)) ?? "", /60 caracteres/);
    assert.equal(validateTag("Node.js"), undefined);
  });
});
