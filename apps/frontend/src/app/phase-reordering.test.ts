import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { moveItemRelative } from "./phase-reordering";

describe("phase reordering", () => {
  const phases = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

  it("moves a phase before a drop target", () => {
    assert.deepEqual(
      moveItemRelative(phases, 4, 2, "before").map((phase) => phase.id),
      [1, 4, 2, 3],
    );
  });

  it("moves a phase after a drop target", () => {
    assert.deepEqual(
      moveItemRelative(phases, 1, 3, "after").map((phase) => phase.id),
      [2, 3, 1, 4],
    );
  });

  it("keeps the same reference for invalid or ineffective drops", () => {
    assert.equal(moveItemRelative(phases, 2, 2, "before"), phases);
    assert.equal(moveItemRelative(phases, 99, 2, "before"), phases);
    assert.equal(moveItemRelative(phases, 1, 2, "before"), phases);
  });
});
