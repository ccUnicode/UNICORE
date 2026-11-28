import assert from "node:assert/strict";
import test from "node:test";
import {
  canSeeNavItem,
  filterVisibleProjectsForRole,
  navItems,
  resolveAreaNavigation,
} from "./dashboard.model";
import type { Area, Project } from "./dashboard.types";

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

const projectArea1Active: Project = {
  id: 101,
  name: "Plataforma Web",
  description: "Proyecto en Área 1",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  areaId: 1,
  status: "active",
  isArchived: false,
  hasTasks: true,
  totalTasks: 4,
  completedTasks: 3,
  progress: 75,
  memberships: [{ id: 1, role: "member", memberId: 10 }],
};

const projectArea2Active: Project = {
  id: 102,
  name: "Diseño UI",
  description: "Proyecto en Área 2",
  startDate: "2026-02-01",
  endDate: "2026-10-31",
  areaId: 2,
  status: "active",
  isArchived: false,
  hasTasks: false,
  totalTasks: 0,
  completedTasks: 0,
  progress: 0,
  memberships: [{ id: 2, role: "member", memberId: 20 }],
};

const projectArchived: Project = {
  id: 103,
  name: "Proyecto Archivado",
  description: "Proyecto antiguo archivado",
  startDate: "2025-01-01",
  endDate: "2025-06-30",
  areaId: 1,
  status: "completed",
  isArchived: true,
  hasTasks: true,
  totalTasks: 2,
  completedTasks: 2,
  progress: 100,
  memberships: [{ id: 3, role: "member", memberId: 10 }],
};

const projectPlanned: Project = {
  id: 104,
  name: "Proyecto Planificado",
  description: "Proyecto no activo",
  startDate: "2026-06-01",
  endDate: "2026-12-31",
  areaId: 1,
  status: "planned",
  isArchived: false,
  hasTasks: false,
  totalTasks: 0,
  completedTasks: 0,
  progress: 0,
  memberships: [{ id: 4, role: "member", memberId: 10 }],
};

const projectCompletedUnarchived: Project = {
  id: 105,
  name: "Proyecto Terminado No Archivado",
  description: "Proyecto completado",
  startDate: "2025-01-01",
  endDate: "2025-06-30",
  areaId: 1,
  status: "completed",
  isArchived: false,
  hasTasks: true,
  totalTasks: 4,
  completedTasks: 4,
  progress: 100,
  memberships: [{ id: 5, role: "member", memberId: 10 }],
};

const sampleProjects = [
  projectArea1Active,
  projectArea2Active,
  projectArchived,
  projectPlanned,
  projectCompletedUnarchived,
];

test("filterVisibleProjectsForRole: Presidencia sees all active projects and excludes archived and non-active", () => {
  const result = filterVisibleProjectsForRole(sampleProjects, "presidencia");
  assert.equal(result.length, 2);
  assert.ok(result.some((p) => p.id === 101));
  assert.ok(result.some((p) => p.id === 102));
  assert.ok(!result.some((p) => p.id === 103));
  assert.ok(!result.some((p) => p.id === 104));
  assert.ok(!result.some((p) => p.id === 105));
});

test("filterVisibleProjectsForRole: Directiva sees only active projects of their area", () => {
  const resultArea1 = filterVisibleProjectsForRole(
    sampleProjects,
    "directiva_de_area",
    [1],
  );
  assert.equal(resultArea1.length, 1);
  assert.equal(resultArea1[0].id, 101);

  const resultArea2 = filterVisibleProjectsForRole(
    sampleProjects,
    "directiva_de_area",
    [2],
  );
  assert.equal(resultArea2.length, 1);
  assert.equal(resultArea2[0].id, 102);

  const resultNoAreas = filterVisibleProjectsForRole(
    sampleProjects,
    "directiva_de_area",
    [],
  );
  assert.equal(resultNoAreas.length, 0);
});

test("filterVisibleProjectsForRole: Miembro sees only active projects where they participate", () => {
  const resultMember10 = filterVisibleProjectsForRole(
    sampleProjects,
    "miembro",
    [1],
    10,
  );
  assert.equal(resultMember10.length, 1);
  assert.equal(resultMember10[0].id, 101);

  const resultMember20 = filterVisibleProjectsForRole(
    sampleProjects,
    "miembro",
    [2],
    20,
  );
  assert.equal(resultMember20.length, 1);
  assert.equal(resultMember20[0].id, 102);

  const resultNonParticipating = filterVisibleProjectsForRole(
    sampleProjects,
    "miembro",
    [1],
    99,
  );
  assert.equal(resultNonParticipating.length, 0);
});

test("filterVisibleProjectsForRole: resolves project area from relation object when areaId is undefined", () => {
  const projectWithAreaObject: Project = {
    id: 104,
    name: "Proyecto con relation area",
    description: null,
    startDate: null,
    endDate: null,
    status: "active",
    isArchived: false,
    area: { id: 1, name: "Desarrollo", description: null },
    phases: [],
    memberships: [],
  };
  const result = filterVisibleProjectsForRole(
    [projectWithAreaObject],
    "directiva_de_area",
    [1],
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 104);
});

test("filterVisibleProjectsForRole: resolves member participation from nested member relation", () => {
  const projectWithNestedMember: Project = {
    id: 105,
    name: "Proyecto con nested member",
    description: null,
    startDate: null,
    endDate: null,
    status: "active",
    isArchived: false,
    phases: [],
    memberships: [
      {
        id: 1,
        role: "member",
        memberId: 0,
        member: {
          id: 50,
          firstNames: "Juan",
          lastNames: "Pérez",
          major: "Ing",
          role: "miembro",
        },
      },
    ],
  };
  const result = filterVisibleProjectsForRole(
    [projectWithNestedMember],
    "miembro",
    [],
    50,
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 105);
});

test("navItems includes 'Mi perfil' visible for all roles", () => {
  const profileItem = navItems.find((item) => item.id === "profile");
  assert.ok(profileItem);
  assert.equal(profileItem.label, "Mi perfil");
  assert.equal(canSeeNavItem("profile", "miembro"), true);
  assert.equal(canSeeNavItem("profile", "directiva_de_area"), true);
  assert.equal(canSeeNavItem("profile", "presidencia"), true);
});
