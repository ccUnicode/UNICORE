import assert from "node:assert/strict";
import test from "node:test";
import { cleanText, normalizeText, uniqueDisplayValues } from "./text-normalization";

test("normalizes equivalent accented, cased and spaced text", () => {
  assert.equal(normalizeText("  INGENIERI\u0301A   "), "ingenieria");
  assert.equal(normalizeText("Ingeniería"), normalizeText("ingenieria"));
  assert.equal(cleanText("  Ingeniería   de Sistemas "), "Ingeniería de Sistemas");
});

test("keeps the first display value when normalized values repeat", () => {
  assert.deepEqual(
    uniqueDisplayValues(["Ingeniería", " ingenieria ", "INGENIERÍA"]),
    ["Ingeniería"],
  );
});
