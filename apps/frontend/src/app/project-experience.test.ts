import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  combineProjectExperience,
  getMemberProjectLabelNames,
  getPortfolioLabelNames,
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
});
