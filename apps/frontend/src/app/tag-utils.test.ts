import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalizeTags,
  editingIndexAfterRemoval,
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

  it("validates tags against each field's configured length", () => {
    assert.match(validateTag("   ", 80) ?? "", /Escribe una etiqueta/);
    assert.equal(validateTag("x".repeat(80), 80), undefined);
    assert.match(validateTag("x".repeat(81), 80) ?? "", /80 caracteres/);
    assert.match(validateTag("x".repeat(51), 50) ?? "", /50 caracteres/);
    assert.equal(validateTag("Node.js", 80), undefined);
  });

  it("keeps the edited tag index in sync after removing a chip", () => {
    assert.equal(editingIndexAfterRemoval(3, 1), 2);
    assert.equal(editingIndexAfterRemoval(3, 3), null);
    assert.equal(editingIndexAfterRemoval(1, 3), 1);
    assert.equal(editingIndexAfterRemoval(null, 0), null);
  });
});
