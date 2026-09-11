import assert from "node:assert/strict";
import test from "node:test";
import { resolveAreaNavigation } from "./dashboard.model";
import type { Area } from "./dashboard.types";

const activeArea1: Area = {
  id: 1,
  name: "Desarrollo",
  description: "Área de software",
  isArchived: false,
};

const activeArea2: Area = {
  id: 2,
  name: "Diseño",
  description: "Área de UX/UI",
  isArchived: false,
};

const archivedArea: Area = {
  id: 3,
  name: "Marketing Antiguo",
  description: "Área archivada",
  isArchived: true,
};

test("Directiva with exactly one active area lands directly on area-detail", () => {
  const result = resolveAreaNavigation([activeArea1], "directiva_de_area");
  assert.equal(result.targetView, "area-detail");
  assert.equal(result.targetAreaId, 1);
});

test("Directiva with multiple active areas lands on areas selector list", () => {
  const result = resolveAreaNavigation(
    [activeArea1, activeArea2],
    "directiva_de_area",
  );
  assert.equal(result.targetView, "areas");
  assert.equal(result.targetAreaId, 1);
});

test("Archived areas are excluded when resolving active areas for Directiva", () => {
  // 1 active area + 1 archived area => 1 accessible active area => redirect to area-detail
  const result = resolveAreaNavigation(
    [activeArea1, archivedArea],
    "directiva_de_area",
  );
  assert.equal(result.targetView, "area-detail");
  assert.equal(result.targetAreaId, 1);
});

test("Directiva with no active areas receives empty targetView", () => {
  const result = resolveAreaNavigation([archivedArea], "directiva_de_area");
  assert.equal(result.targetView, "empty");
  assert.equal(result.targetAreaId, null);
});

test("Presidencia retains global areas view for any number of areas", () => {
  const singleAreaResult = resolveAreaNavigation([activeArea1], "presidencia");
  assert.equal(singleAreaResult.targetView, "areas");
  assert.equal(singleAreaResult.targetAreaId, 1);

  const multipleAreasResult = resolveAreaNavigation(
    [activeArea1, activeArea2, archivedArea],
    "presidencia",
  );
  assert.equal(multipleAreasResult.targetView, "areas");
  assert.equal(multipleAreasResult.targetAreaId, 1);
});

test("Presidencia respects valid preferredAreaId while maintaining global areas targetView", () => {
  const result = resolveAreaNavigation(
    [activeArea1, activeArea2],
    "presidencia",
    2,
  );
  assert.equal(result.targetView, "areas");
  assert.equal(result.targetAreaId, 2);
});
