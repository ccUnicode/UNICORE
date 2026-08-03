import assert from "node:assert/strict";
import test from "node:test";
import {
  filterAndSortMembers,
  getProjectLabelsForMember,
  type MemberDirectoryFilters,
} from "./people-management-utils";

const members = [
  {
    id: 1,
    firstNames: "Ana",
    lastNames: "Torres",
    major: "Ingeniería de Sistemas",
    cycle: 8,
    activityStatus: "active",
    availabilityStatus: "available",
    skills: [{ name: "React" }, { name: "UX" }],
    memberships: [{ areaId: 10 }],
  },
  {
    id: 2,
    firstNames: "Bruno",
    lastNames: "Ramos",
    major: "Ingeniería Industrial",
    cycle: 6,
    activityStatus: "inactive",
    availabilityStatus: "disabled",
    skills: [{ name: "Data" }],
    memberships: [{ areaId: 20 }],
  },
  {
    id: 3,
    firstNames: "Carla",
    lastNames: "Vega",
    major: "Ingeniería de Sistemas",
    cycle: 8,
    activityStatus: "active",
    availabilityStatus: "not_available",
    skills: [{ name: "Node.js" }],
    memberships: [{ areaId: 10 }],
  },
];

const projects = [
  {
    labels: [{ name: "Web" }, { name: "Prioridad alta" }],
    memberships: [{ memberId: 1 }, { memberId: 3 }],
  },
  {
    labels: [{ name: "Datos" }, { name: "Web" }],
    memberships: [{ memberId: 2 }],
  },
];

const noFilters: MemberDirectoryFilters = {
  query: "",
  activity: "",
  availability: "",
  areaId: "",
  cycle: "",
  career: "",
  projectLabel: "",
};

test("returns inactive members last", () => {
  assert.deepEqual(
    filterAndSortMembers(members, projects, noFilters).map(
      (member) => member.id,
    ),
    [1, 3, 2],
  );
});

test("combines directory filters", () => {
  const result = filterAndSortMembers(members, projects, {
    ...noFilters,
    query: "node",
    activity: "active",
    availability: "not_available",
    areaId: "10",
    cycle: "8",
    career: "Ingeniería de Sistemas",
    projectLabel: "Web",
  });

  assert.deepEqual(
    result.map((member) => member.id),
    [3],
  );
});

test("collects unique project labels for a member", () => {
  assert.deepEqual(getProjectLabelsForMember(2, projects), ["Datos", "Web"]);
});
