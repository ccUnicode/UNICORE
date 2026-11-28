import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { JSDOM } from "jsdom";
import type { Member, Project } from "./dashboard.types";

describe("ProfileView (Mi perfil - FR-15)", () => {
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

  const memberUser: Member = {
    id: 10,
    firstNames: "Carlos",
    lastNames: "Perez",
    major: "Ciencia de la Computación",
    cycle: 7,
    role: "miembro",
    studentCode: "20231234",
    institution: "UNI",
    activityStatus: "active",
    availabilityStatus: "available",
    skills: [{ id: 1, name: "React" }, { id: 2, name: "Node.js" }],
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-02T12:00:00.000Z",
    memberships: [
      {
        id: 1,
        areaId: 2,
        role: "miembro",
        area: { id: 2, name: "Desarrollo", description: null },
      },
    ],
  };

  const directivaUser: Member = {
    id: 5,
    firstNames: "Elena",
    lastNames: "Gomez",
    major: "Ingeniería de Sistemas",
    cycle: 9,
    role: "directiva_de_area",
    studentCode: "20215678",
    institution: "UNI",
    activityStatus: "active",
    availabilityStatus: "available",
    skills: [{ id: 1, name: "TypeScript" }],
    createdAt: "2026-01-15T08:00:00.000Z",
    updatedAt: "2026-02-10T14:30:00.000Z",
    memberships: [
      {
        id: 2,
        areaId: 2,
        role: "directiva_de_area",
        area: { id: 2, name: "Desarrollo", description: null },
      },
      {
        id: 3,
        areaId: 3,
        role: "miembro",
        area: { id: 3, name: "Investigación", description: null },
      },
    ],
  };

  const sampleProjects: Project[] = [
    {
      id: 101,
      name: "Portal Web UNICORE",
      description: "Frontend y backend",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "active",
      isArchived: false,
      areaId: 2,
      area: { id: 2, name: "Desarrollo", description: null },
      memberships: [
        { id: 1, memberId: 10, role: "member" },
        { id: 2, memberId: 5, role: "representative" },
      ],
    },
    {
      id: 102,
      name: "App Móvil de Asistencia",
      description: "Solo diseño",
      startDate: "2026-02-01",
      endDate: "2026-06-30",
      status: "planned",
      isArchived: false,
      areaId: 2,
      area: { id: 2, name: "Desarrollo", description: null },
      memberships: [
        { id: 3, memberId: 99, role: "member" },
      ],
    },
  ];

  it("renders member profile and respects FR-25 by hiding internal fields for role miembro", async () => {
    const [{ render }, { ProfileView }] = await Promise.all([
      import("@testing-library/react"),
      import("./dashboard.components"),
    ]);

    const view = render(
      <ProfileView
        member={memberUser}
        projects={sampleProjects}
        onLogout={() => {}}
      />,
    );

    // Title and basic details
    assert.ok(view.getByText("Mi perfil"));
    assert.ok(view.getByText("Carlos Perez"));
    assert.ok(view.getByText(/Ciencia de la Computación/));
    assert.ok(view.getByText(/7vo/));

    // FR-25: Miembro should not see internal fields
    assert.equal(view.queryByText("Código UNI"), null);
    assert.equal(view.queryByText("20231234"), null);
    assert.equal(view.queryByText("Institución"), null);
    assert.equal(view.queryByText("Competencias"), null);
    assert.equal(view.queryByText("React"), null);

    // Áreas y roles
    assert.ok(view.getAllByText("Desarrollo").length >= 1);

    // Projects: should only include projects where the member is assigned
    assert.ok(view.getByText("Portal Web UNICORE"));
    assert.equal(view.queryByText("App Móvil de Asistencia"), null);
  });

  it("renders internal fields and status pills for directiva_de_area or presidencia", async () => {
    const [{ render }, { ProfileView }] = await Promise.all([
      import("@testing-library/react"),
      import("./dashboard.components"),
    ]);

    const view = render(
      <ProfileView
        member={directivaUser}
        projects={sampleProjects}
        onLogout={() => {}}
      />,
    );

    // Identity and role
    assert.ok(view.getByText("Elena Gomez"));
    assert.ok(view.getAllByText("Directiva").length >= 1);

    // Internal fields visible
    assert.ok(view.getByText("Código UNI"));
    assert.ok(view.getByText("20215678"));
    assert.ok(view.getByText("Institución"));
    assert.ok(view.getByText("Competencias"));
    assert.ok(view.getByText("TypeScript"));

    // Areas
    assert.ok(view.getAllByText("Desarrollo").length >= 1);
    assert.ok(view.getByText("Investigación"));

    // Projects
    assert.ok(view.getByText("Portal Web UNICORE"));
    assert.ok(view.getByText("Representante"));
  });

  it("handles empty areas and empty projects gracefully", async () => {
    const [{ render }, { ProfileView }] = await Promise.all([
      import("@testing-library/react"),
      import("./dashboard.components"),
    ]);

    const lonelyMember: Member = {
      id: 20,
      firstNames: "Solo",
      lastNames: "Miembro",
      major: "Ingeniería Industrial",
      role: "miembro",
      memberships: [],
    };

    const view = render(
      <ProfileView
        member={lonelyMember}
        projects={[]}
        onLogout={() => {}}
      />,
    );

    assert.ok(view.getByText("Sin pertenencias de área registradas."));
    assert.ok(view.getByText("No participas en ningún proyecto actualmente."));
  });

  it("calls onLogout when the logout button is clicked", async () => {
    let loggedOut = false;
    const [{ fireEvent, render }, { ProfileView }] = await Promise.all([
      import("@testing-library/react"),
      import("./dashboard.components"),
    ]);

    const view = render(
      <ProfileView
        member={memberUser}
        projects={[]}
        onLogout={() => {
          loggedOut = true;
        }}
      />,
    );

    const logoutButton = view.getByRole("button", { name: "Cerrar sesión" });
    fireEvent.click(logoutButton);
    assert.equal(loggedOut, true);
  });
});
