import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  combineProjectExperience,
  filterAndSortProjectCandidates,
  getMemberProjectLabelNames,
  getPortfolioLabelNames,
  normalizeCandidateFilter,
} from "./project-experience";

describe("project experience filters", () => {
  const activeProjects = [
    {
      id: 1,
      labels: [{ name: "Frontend" }],
      memberships: [{ memberId: 10 }],
    },
  ];
  const archivedProjects = [
    {
      id: 2,
      labels: [{ name: "Backend" }],
      memberships: [{ memberId: 10 }],
    },
  ];

  it("includes archived projects when calculating previous experience", () => {
    const experienceProjects = combineProjectExperience(
      activeProjects,
      archivedProjects,
    );

    assert.deepEqual(getPortfolioLabelNames(experienceProjects), [
      "Backend",
      "Frontend",
    ]);
    assert.deepEqual(
      getMemberProjectLabelNames(experienceProjects, 10).sort(),
      ["Backend", "Frontend"],
    );
  });

  it("does not add archived projects to the active collection", () => {
    combineProjectExperience(activeProjects, archivedProjects);

    assert.deepEqual(activeProjects.map((project) => project.id), [1]);
  });

  it("normalizes accents, casing, and repeated whitespace in candidate filters", () => {
    assert.equal(
      normalizeCandidateFilter("  Ingeniería   de Sistemas "),
      normalizeCandidateFilter("ingenieria de sistemas"),
    );
    assert.equal(
      normalizeCandidateFilter("Gestión Ágil"),
      normalizeCandidateFilter("gestion agil"),
    );
  });

  it("combines every candidate filter and keeps inactive matches last", () => {
    const projects = [
      {
        labels: [{ name: "Gestión Ágil" }],
        memberships: [{ memberId: 10 }, { memberId: 11 }],
      },
    ];
    const members = [
      {
        id: 11,
        firstNames: "Álvaro",
        lastNames: "Zapata",
        major: "Ingeniería de Sistemas",
        cycle: 8,
        activityStatus: "inactive",
        skills: [{ name: "Análisis de datos" }],
      },
      {
        id: 10,
        firstNames: "Beatriz",
        lastNames: "Alva",
        major: "Ingeniería de Sistemas",
        cycle: 8,
        activityStatus: "active",
        skills: [{ name: "Análisis de datos" }],
      },
      {
        id: 12,
        firstNames: "Carlos",
        lastNames: "Ramos",
        major: "Ingeniería Industrial",
        cycle: 8,
        activityStatus: "active",
        skills: [{ name: "Análisis de datos" }],
      },
    ];

    const result = filterAndSortProjectCandidates(members, projects, {
      query: "ingenieria",
      skill: "analisis de datos",
      projectLabel: "gestion agil",
      cycle: "8",
      major: "ingenieria de sistemas",
    });

    assert.deepEqual(result.map(({ id }) => id), [10, 11]);
  });

  it("returns no candidates when one combined filter does not match", () => {
    const members = [
      {
        id: 10,
        firstNames: "Beatriz",
        lastNames: "Alva",
        major: "Ingeniería de Sistemas",
        cycle: 8,
        activityStatus: "active",
        skills: [{ name: "Backend" }],
      },
    ];

    const result = filterAndSortProjectCandidates(members, [], {
      query: "beatriz",
      skill: "frontend",
      projectLabel: "",
      cycle: "8",
      major: "ingenieria de sistemas",
    });

    assert.deepEqual(result, []);
  });
});
