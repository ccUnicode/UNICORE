import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { JSDOM } from "jsdom";
import type { Member, Project, ProjectPhase } from "./project-management";
import { ProjectDetail } from "./project-management";
import type { KanbanTask } from "./project-kanban";
import {
  canMemberMoveTask,
  KANBAN_COLUMNS,
  KANBAN_TRANSITIONS,
  ProjectKanbanBoard,
} from "./project-kanban";

describe("ProjectKanban unit helpers and permissions", () => {
  const sampleProject: Project = {
    id: 10,
    name: "Sistema de Becas",
    description: "Proyecto activo con tablero",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    areaId: 2,
    status: "active",
    isArchived: false,
    memberships: [
      { id: 1, memberId: 101, role: "representative" },
      { id: 2, memberId: 102, role: "subrepresentative" },
      { id: 3, memberId: 103, role: "member" },
      { id: 4, memberId: 104, role: "member" },
    ],
    phases: [
      { id: 1, name: "Planificación", orderIndex: 0 },
      { id: 2, name: "Desarrollo", orderIndex: 1 },
    ],
  };

  const taskAssignedTo103: KanbanTask = {
    id: 1,
    title: "Diseñar wireframes",
    status: "todo",
    projectId: 10,
    phaseId: 1,
    assignees: [
      {
        id: 1,
        taskId: 1,
        memberId: 103,
        member: { id: 103, firstNames: "Carlos", lastNames: "Mendoza" },
      },
    ],
  };

  const taskAssignedTo104: KanbanTask = {
    id: 2,
    title: "Implementar backend API",
    status: "in_progress",
    projectId: 10,
    phaseId: 2,
    assignees: [
      {
        id: 2,
        taskId: 2,
        memberId: 104,
        member: { id: 104, firstNames: "Daniela", lastNames: "Ríos" },
      },
    ],
  };

  it("defines the 4 required Kanban columns in correct order", () => {
    assert.deepEqual(
      KANBAN_COLUMNS.map((c) => c.id),
      ["todo", "in_progress", "in_review", "done"],
    );
  });

  it("defines valid status transitions according to workflow", () => {
    assert.deepEqual(KANBAN_TRANSITIONS.todo, ["in_progress"]);
    assert.deepEqual(KANBAN_TRANSITIONS.in_progress, ["todo", "in_review"]);
    assert.deepEqual(KANBAN_TRANSITIONS.in_review, ["in_progress", "done"]);
    assert.deepEqual(KANBAN_TRANSITIONS.done, ["in_review"]);
  });

  it("permits Presidencia to move any task", () => {
    const presidenciaMember: Member = {
      id: 999,
      firstNames: "Admin",
      lastNames: "Presidencia",
      major: "Sistemas",
      role: "presidencia",
    };

    assert.equal(
      canMemberMoveTask(taskAssignedTo103, sampleProject, presidenciaMember),
      true,
    );
    assert.equal(
      canMemberMoveTask(taskAssignedTo104, sampleProject, presidenciaMember),
      true,
    );
  });

  it("permits Directiva de área to move any task within their area", () => {
    const directivaMember: Member = {
      id: 888,
      firstNames: "Directora",
      lastNames: "Área 2",
      major: "Sistemas",
      role: "directiva_de_area",
      areaId: 2,
    };
    const directivaOtherArea: Member = {
      id: 889,
      firstNames: "Director",
      lastNames: "Área 99",
      major: "Industrial",
      role: "directiva_de_area",
      areaId: 99,
    };

    assert.equal(
      canMemberMoveTask(taskAssignedTo103, sampleProject, directivaMember),
      true,
    );
    assert.equal(
      canMemberMoveTask(taskAssignedTo103, sampleProject, directivaOtherArea),
      false,
    );
  });

  it("permits Project Representative and Subrepresentative to move any task in the project", () => {
    const repMember: Member = {
      id: 101,
      firstNames: "Líder",
      lastNames: "Proyecto",
      major: "Sistemas",
      role: "miembro",
    };
    const subrepMember: Member = {
      id: 102,
      firstNames: "Sublíder",
      lastNames: "Proyecto",
      major: "Sistemas",
      role: "miembro",
    };

    assert.equal(
      canMemberMoveTask(taskAssignedTo103, sampleProject, repMember),
      true,
    );
    assert.equal(
      canMemberMoveTask(taskAssignedTo104, sampleProject, subrepMember),
      true,
    );
  });

  it("allows regular Member to move only their assigned tasks and blocks moving tareas ajenas", () => {
    const regularMember103: Member = {
      id: 103,
      firstNames: "Carlos",
      lastNames: "Mendoza",
      major: "Sistemas",
      role: "miembro",
    };

    // Member 103 can move task 1 (assigned to them)
    assert.equal(
      canMemberMoveTask(taskAssignedTo103, sampleProject, regularMember103),
      true,
    );
    // Member 103 CANNOT move task 2 (assigned to Daniela 104)
    assert.equal(
      canMemberMoveTask(taskAssignedTo104, sampleProject, regularMember103),
      false,
    );
  });

  it("blocks any move if project is archived", () => {
    const archivedProject: Project = {
      ...sampleProject,
      isArchived: true,
    };
    const presidenciaMember: Member = {
      id: 999,
      firstNames: "Admin",
      lastNames: "Presidencia",
      major: "Sistemas",
      role: "presidencia",
    };

    assert.equal(
      canMemberMoveTask(taskAssignedTo103, archivedProject, presidenciaMember),
      false,
    );
  });
});

describe("ProjectKanban UI and ProjectDetail Tab integration", () => {
  let dom: JSDOM;
  const originalFetch = globalThis.fetch;

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
    globalThis.fetch = originalFetch;
    dom.window.close();
  });

  const samplePhases: ProjectPhase[] = [
    {
      id: 10,
      name: "Fase 1: Diseño",
      orderIndex: 0,
      totalTasks: 2,
      completedTasks: 1,
      progress: 50,
      hasTasks: true,
    },
    {
      id: 20,
      name: "Fase 2: Construcción",
      orderIndex: 1,
      totalTasks: 2,
      completedTasks: 0,
      progress: 0,
      hasTasks: true,
    },
  ];

  const sampleProject: Project = {
    id: 50,
    name: "Plataforma UNICORE",
    description: "Detalle con Kanban",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    status: "active",
    isArchived: false,
    areaId: 1,
    phases: samplePhases,
    hasTasks: true,
    totalTasks: 4,
    completedTasks: 1,
    progress: 25,
    memberships: [
      { id: 1, memberId: 100, role: "representative" },
      { id: 2, memberId: 200, role: "member" },
      { id: 3, memberId: 300, role: "member" },
    ],
  };

  const sampleTasks: KanbanTask[] = [
    {
      id: 1,
      title: "Diseño de base de datos",
      status: "todo",
      projectId: 50,
      phaseId: 10,
      assignees: [
        {
          id: 1,
          taskId: 1,
          memberId: 200,
          member: { id: 200, firstNames: "Mario", lastNames: "Pérez" },
        },
      ],
    },
    {
      id: 2,
      title: "Construcción de componentes",
      status: "in_progress",
      projectId: 50,
      phaseId: 20,
      assignees: [
        {
          id: 2,
          taskId: 2,
          memberId: 300,
          member: { id: 300, firstNames: "Lucía", lastNames: "Gómez" },
        },
      ],
    },
    {
      id: 3,
      title: "Pruebas de integración",
      status: "in_review",
      projectId: 50,
      phaseId: 10,
      assignees: [
        {
          id: 3,
          taskId: 3,
          memberId: 200,
          member: { id: 200, firstNames: "Mario", lastNames: "Pérez" },
        },
      ],
    },
    {
      id: 4,
      title: "Setup inicial de entorno",
      status: "done",
      projectId: 50,
      phaseId: 10,
      assignees: [],
    },
  ];

  it("switches from «General» to «Tablero» tab and renders the 4 Kanban columns", async () => {
    const { render, fireEvent } = await import("@testing-library/react");

    const { getByTestId, queryByTestId } = render(
      <ProjectDetail
        project={sampleProject}
        portfolioProjects={[]}
        members={[]}
        canManage={true}
        loading={false}
        apiUrl="http://localhost:3000/api"
        accessToken="dummy-token"
        onEdit={() => {}}
        onArchive={async () => {}}
        onRefresh={async () => {}}
        onError={() => {}}
        initialTasks={sampleTasks}
      />,
    );

    // Initial tab is General: Kanban board is not rendered yet
    assert.equal(queryByTestId("project-kanban-board"), null);
    const tabGeneral = getByTestId("project-tab-general");
    const tabKanban = getByTestId("project-tab-kanban");
    assert.ok(tabGeneral);
    assert.ok(tabKanban);

    // Click Tablero tab
    fireEvent.click(tabKanban);

    // Kanban board and 4 columns are now rendered
    assert.ok(getByTestId("project-kanban-board"));
    assert.ok(getByTestId("kanban-column-todo"));
    assert.ok(getByTestId("kanban-column-in_progress"));
    assert.ok(getByTestId("kanban-column-in_review"));
    assert.ok(getByTestId("kanban-column-done"));

    // Check counts
    assert.equal(getByTestId("kanban-count-todo").textContent?.trim(), "1");
    assert.equal(
      getByTestId("kanban-count-in_progress").textContent?.trim(),
      "1",
    );
    assert.equal(
      getByTestId("kanban-count-in_review").textContent?.trim(),
      "1",
    );
    assert.equal(getByTestId("kanban-count-done").textContent?.trim(), "1");
  });

  it("displays task title, assigned members, and phase name on each card", async () => {
    const { render } = await import("@testing-library/react");

    const { getByTestId } = render(
      <ProjectKanbanBoard
        project={sampleProject}
        apiUrl="http://localhost:3000/api"
        accessToken="dummy-token"
        onRefresh={async () => {}}
        initialTasks={sampleTasks}
      />,
    );

    // Check card 1: assigned to Mario Pérez in Fase 1: Diseño
    assert.equal(
      getByTestId("kanban-task-title-1").textContent?.trim(),
      "Diseño de base de datos",
    );
    assert.equal(
      getByTestId("kanban-task-phase-1").textContent?.trim(),
      "Fase 1: Diseño",
    );
    assert.ok(
      getByTestId("kanban-task-assignees-1").textContent?.includes(
        "Mario Pérez",
      ),
    );

    // Check card 4: unassigned task in Fase 1
    assert.equal(
      getByTestId("kanban-task-title-4").textContent?.trim(),
      "Setup inicial de entorno",
    );
    assert.ok(
      getByTestId("kanban-task-assignees-4").textContent?.includes(
        "Sin asignar",
      ),
    );
  });

  it("includes horizontal scroll container with min-w-[960px] for mobile responsiveness", async () => {
    const { render } = await import("@testing-library/react");

    const { getByTestId } = render(
      <ProjectKanbanBoard
        project={sampleProject}
        apiUrl="http://localhost:3000/api"
        accessToken="dummy-token"
        onRefresh={async () => {}}
        initialTasks={sampleTasks}
      />,
    );

    const scrollContainer = getByTestId("kanban-scroll-container");
    assert.ok(scrollContainer);
    assert.ok(
      scrollContainer.className.includes("overflow-x-auto"),
      "Container must have overflow-x-auto for mobile scrolling",
    );

    const grid = scrollContainer.firstElementChild as HTMLElement;
    assert.ok(grid);
    assert.ok(
      grid.className.includes("min-w-[960px]"),
      "Grid must enforce min-w-[960px] to preserve columns layout",
    );
  });

  it("moving a task to «Hecho» triggers PATCH /tasks/:id/status and onRefresh updating progress", async () => {
    const { render, fireEvent, waitFor } = await import(
      "@testing-library/react"
    );

    const representativeMember: Member = {
      id: 100,
      firstNames: "Líder",
      lastNames: "UNICORE",
      major: "Sistemas",
      role: "miembro",
    };

    let patchCalledWith: { id: number; status: string } | null = null;
    let refreshCalled = false;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/tasks/3/status") && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body)) as { status: string };
        patchCalledWith = { id: 3, status: body.status };
        return new Response(JSON.stringify({ id: 3, status: "done" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("Not found", { status: 404 });
    };

    const { getByTestId } = render(
      <ProjectKanbanBoard
        project={sampleProject}
        currentMember={representativeMember}
        apiUrl="http://localhost:3000/api"
        accessToken="token-123"
        onRefresh={async () => {
          refreshCalled = true;
        }}
        initialTasks={sampleTasks}
      />,
    );

    // Task 3 is in 'in_review'; allowed next is 'done' or 'in_progress'
    const moveDoneBtn = getByTestId("kanban-move-btn-3-done");
    assert.ok(moveDoneBtn);

    fireEvent.click(moveDoneBtn);

    await waitFor(() => {
      assert.deepEqual(patchCalledWith, { id: 3, status: "done" });
      assert.equal(refreshCalled, true);
    });
  });

  it("blocks a regular Member from moving tareas ajenas and shows disabled status", async () => {
    const { render } = await import("@testing-library/react");

    const regularMember200: Member = {
      id: 200,
      firstNames: "Mario",
      lastNames: "Pérez",
      major: "Sistemas",
      role: "miembro",
    };

    const { getByTestId, queryByTestId } = render(
      <ProjectKanbanBoard
        project={sampleProject}
        currentMember={regularMember200}
        apiUrl="http://localhost:3000/api"
        accessToken="dummy-token"
        onRefresh={async () => {}}
        initialTasks={sampleTasks}
      />,
    );

    // Task 1 is assigned to Mario (member 200) -> can move to 'in_progress'
    assert.ok(getByTestId("kanban-move-btn-1-in_progress"));

    // Task 2 is assigned to Lucía (member 300) -> Mario CANNOT move it
    assert.equal(queryByTestId("kanban-move-btn-2-todo"), null);
    assert.equal(queryByTestId("kanban-move-btn-2-in_review"), null);
    assert.ok(getByTestId("kanban-move-disabled-2"));
  });

  it("rolls back card and displays clear error banner when status update fails", async () => {
    const { render, fireEvent, waitFor } = await import(
      "@testing-library/react"
    );

    const representativeMember: Member = {
      id: 100,
      firstNames: "Líder",
      lastNames: "UNICORE",
      major: "Sistemas",
      role: "miembro",
    };

    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({ message: "No se pudo conectar con el servidor" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    };

    const { getByTestId } = render(
      <ProjectKanbanBoard
        project={sampleProject}
        currentMember={representativeMember}
        apiUrl="http://localhost:3000/api"
        accessToken="dummy-token"
        onRefresh={async () => {}}
        initialTasks={sampleTasks}
      />,
    );

    // Move task 1 from 'todo' to 'in_progress'
    const moveBtn = getByTestId("kanban-move-btn-1-in_progress");
    fireEvent.click(moveBtn);

    await waitFor(() => {
      // Error banner must be rendered with error message
      const errorBanner = getByTestId("kanban-error-banner");
      assert.ok(errorBanner);
      assert.ok(
        errorBanner.textContent?.includes(
          "No se pudo conectar con el servidor",
        ),
      );

      // Card 1 must be rolled back to column 'todo'
      const todoColumn = getByTestId("kanban-column-todo");
      assert.ok(todoColumn.querySelector('[data-testid="kanban-card-1"]'));
    });
  });
});
