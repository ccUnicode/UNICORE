import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { formatProjectProgress, ProgressBar } from "./project-progress";
import type { Project, ProjectPhase } from "./project-management";
import { ProjectCard, ProjectDetail } from "./project-management";
import {
  DashboardProjectList,
  DashboardView,
} from "./dashboard/dashboard.components";
import type {
  Member,
  Project as DashboardProject,
} from "./dashboard/dashboard.types";

describe("formatProjectProgress", () => {
  it("formats progress correctly when tasks are completed (e.g. 2 of 4 tasks = 50 %)", () => {
    assert.equal(formatProjectProgress(true, 50), "50 %");
    assert.equal(formatProjectProgress(true, 75), "75 %");
    assert.equal(formatProjectProgress(true, 100), "100 %");
    assert.equal(formatProjectProgress(true, 0), "0 %");
  });

  it("returns 'Sin tareas' when hasTasks is false or undefined, avoiding misleading 0 %", () => {
    assert.equal(formatProjectProgress(false, 0), "Sin tareas");
    assert.equal(formatProjectProgress(false), "Sin tareas");
    assert.equal(formatProjectProgress(undefined, 0), "Sin tareas");
    assert.equal(formatProjectProgress(undefined), "Sin tareas");
  });
});

describe("Project progress UI components", () => {
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

  it("renders ProgressBar with clamped values and proper accessibility attributes", async () => {
    const { render } = await import("@testing-library/react");
    const { container } = render(<ProgressBar progress={50} />);
    const bar = container.querySelector('[role="progressbar"]');
    assert.ok(bar);
    assert.equal(bar.getAttribute("aria-valuenow"), "50");
    assert.equal(bar.getAttribute("aria-valuemin"), "0");
    assert.equal(bar.getAttribute("aria-valuemax"), "100");
  });

  it("renders project progress in ProjectCard (50 % when tasks exist, 'Sin tareas' when none)", async () => {
    const { render } = await import("@testing-library/react");

    const projectWithProgress: Project = {
      id: 1,
      name: "Proyecto Alpha",
      description: "Proyecto con avance",
      startDate: null,
      endDate: null,
      status: "active",
      isArchived: false,
      hasTasks: true,
      totalTasks: 4,
      completedTasks: 2,
      progress: 50,
      phases: [],
      memberships: [],
    };

    const projectWithoutTasks: Project = {
      id: 2,
      name: "Proyecto Beta",
      description: "Proyecto sin tareas",
      startDate: null,
      endDate: null,
      status: "planned",
      isArchived: false,
      hasTasks: false,
      totalTasks: 0,
      completedTasks: 0,
      progress: 0,
      phases: [],
      memberships: [],
    };

    const { getByText: getCard1Text } = render(
      <ProjectCard project={projectWithProgress} onOpen={() => {}} />,
    );
    assert.ok(getCard1Text("50 %"));

    const { getByText: getCard2Text } = render(
      <ProjectCard project={projectWithoutTasks} onOpen={() => {}} />,
    );
    assert.ok(getCard2Text("Sin tareas"));
  });

  it("renders project advance and phase advance in ProjectDetail (50 % and 'Sin tareas' for phases without tasks)", async () => {
    const { render } = await import("@testing-library/react");

    const phase1: ProjectPhase = {
      id: 10,
      name: "Fase 1: Análisis",
      orderIndex: 1,
      hasTasks: true,
      totalTasks: 4,
      completedTasks: 2,
      progress: 50,
    };

    const phase2: ProjectPhase = {
      id: 20,
      name: "Fase 2: Implementación",
      orderIndex: 2,
      hasTasks: false,
      totalTasks: 0,
      completedTasks: 0,
      progress: 0,
    };

    const project: Project = {
      id: 1,
      name: "Plataforma UNICORE",
      description: "Proyecto principal",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "active",
      isArchived: false,
      hasTasks: true,
      totalTasks: 4,
      completedTasks: 2,
      progress: 50,
      phases: [phase1, phase2],
      memberships: [],
    };

    const { container, getAllByText, getByTestId } = render(
      <ProjectDetail
        project={project}
        portfolioProjects={[]}
        members={[]}
        canManage={false}
        loading={false}
        apiUrl="http://localhost:3000"
        accessToken="test-token"
        onEdit={() => {}}
        onArchive={async () => {}}
        onRefresh={async () => {}}
        onError={() => {}}
      />,
    );

    // Project avance card specifically displays 50 %
    const projectCard = getByTestId("project-progress-card");
    const projectCardValue = getByTestId("project-progress-card-value");
    assert.equal(projectCardValue.textContent, "50 %");
    assert.ok(
      projectCard.textContent?.includes("50 %"),
      "La tarjeta de avance debe contener 50 %",
    );

    // Exactly two occurrences of 50 % appear in the detail view (card and phase 1)
    const progressTexts = getAllByText("50 %");
    assert.equal(
      progressTexts.length,
      2,
      "Debe mostrar exactamente dos elementos con 50 % (tarjeta de proyecto y fase 1)",
    );

    // Phase 1 shows 50 %
    const phase1Progress = getByTestId("phase-progress-10");
    assert.equal(phase1Progress.textContent, "50 %");

    // Phase 2 shows 'Sin tareas', not '0 %'
    const phase2Progress = getByTestId("phase-progress-20");
    assert.equal(phase2Progress.textContent, "Sin tareas");

    // Ensure there is no misleading 0 % for phase 2
    assert.equal(
      container.querySelector('[data-testid="phase-progress-20"]')?.textContent?.includes("0 %"),
      false,
    );
  });

  it("renders 'Sin tareas' in project advance card when project has no tasks", async () => {
    const { render } = await import("@testing-library/react");
    const projectWithoutTasks: Project = {
      id: 2,
      name: "Proyecto Beta",
      description: "Proyecto sin tareas",
      startDate: null,
      endDate: null,
      status: "planned",
      isArchived: false,
      hasTasks: false,
      totalTasks: 0,
      completedTasks: 0,
      progress: 0,
      phases: [],
      memberships: [],
    };

    const { getByTestId } = render(
      <ProjectDetail
        project={projectWithoutTasks}
        portfolioProjects={[]}
        members={[]}
        canManage={false}
        loading={false}
        apiUrl="http://localhost:3000"
        accessToken="test-token"
        onEdit={() => {}}
        onArchive={async () => {}}
        onRefresh={async () => {}}
        onError={() => {}}
      />,
    );

    const projectCardValue = getByTestId("project-progress-card-value");
    assert.equal(projectCardValue.textContent, "Sin tareas");
  });

  it("renders 75 % progress and progress bar for active project with 3 of 4 tasks done in dashboard", async () => {
    const { render } = await import("@testing-library/react");
    const projectWith75Progress: DashboardProject = {
      id: 1,
      name: "Proyecto Alpha",
      description: "Proyecto con 75% de avance",
      startDate: null,
      endDate: null,
      status: "active",
      isArchived: false,
      hasTasks: true,
      totalTasks: 4,
      completedTasks: 3,
      progress: 75,
      phases: [],
      memberships: [],
    };

    const { getByTestId, container } = render(
      <DashboardProjectList projects={[projectWith75Progress]} />,
    );

    const progressBadge = getByTestId("dashboard-project-progress-1");
    assert.equal(progressBadge.textContent, "75 %");

    const progressBar = container.querySelector(
      '[data-testid="dashboard-project-bar-1"] [role="progressbar"]',
    );
    assert.ok(progressBar);
    assert.equal(progressBar.getAttribute("aria-valuenow"), "75");
  });

  it("renders 'Sin tareas' and no progress bar for project without tasks in dashboard", async () => {
    const { render } = await import("@testing-library/react");
    const projectWithoutTasks: DashboardProject = {
      id: 2,
      name: "Proyecto Beta",
      description: "Proyecto sin tareas",
      startDate: null,
      endDate: null,
      status: "planned",
      isArchived: false,
      hasTasks: false,
      totalTasks: 0,
      completedTasks: 0,
      progress: 0,
      phases: [],
      memberships: [],
    };

    const { getByTestId, container } = render(
      <DashboardProjectList projects={[projectWithoutTasks]} />,
    );

    const progressBadge = getByTestId("dashboard-project-progress-2");
    assert.equal(progressBadge.textContent, "Sin tareas");

    const progressBar = container.querySelector(
      '[data-testid="dashboard-project-bar-2"]',
    );
    assert.equal(progressBar, null);
    assert.equal(progressBadge.textContent.includes("0 %"), false);
  });

  it("does not render archived projects in dashboard and displays empty state when none active", async () => {
    const { render } = await import("@testing-library/react");
    const archivedProject: DashboardProject = {
      id: 3,
      name: "Proyecto Archivado",
      description: "Proyecto ya archivado",
      startDate: null,
      endDate: null,
      status: "completed",
      isArchived: true,
      hasTasks: true,
      totalTasks: 5,
      completedTasks: 5,
      progress: 100,
      phases: [],
      memberships: [],
    };

    const { container, getByText } = render(
      <DashboardProjectList projects={[archivedProject]} />,
    );

    const archivedItem = container.querySelector(
      '[data-testid="dashboard-project-3"]',
    );
    assert.equal(archivedItem, null);
    assert.ok(getByText("No hay proyectos para mostrar."));
  });

  it("renders role-scoped projects in DashboardView for Directiva", async () => {
    const { render } = await import("@testing-library/react");
    const directivaMember: Member = {
      id: 5,
      firstNames: "Directiva",
      lastNames: "User",
      major: "Ingeniería",
      role: "directiva_de_area",
      areaId: 1,
      memberships: [{ areaId: 1, role: "directiva_de_area" }],
    };

    const projectArea1: DashboardProject = {
      id: 10,
      name: "Proyecto Área 1",
      description: "Área 1",
      startDate: null,
      endDate: null,
      status: "active",
      isArchived: false,
      hasTasks: true,
      totalTasks: 4,
      completedTasks: 3,
      progress: 75,
      areaId: 1,
      area: { id: 1, name: "Desarrollo", description: null },
      phases: [],
      memberships: [],
    };

    const projectArea2: DashboardProject = {
      id: 20,
      name: "Proyecto Área 2",
      description: "Área 2",
      startDate: null,
      endDate: null,
      status: "active",
      isArchived: false,
      hasTasks: false,
      totalTasks: 0,
      completedTasks: 0,
      progress: 0,
      areaId: 2,
      area: { id: 2, name: "Diseño", description: null },
      phases: [],
      memberships: [],
    };

    const { getByTestId, queryByTestId } = render(
      <DashboardView
        areaCount={2}
        memberCount={10}
        activeMembers={8}
        availableMembers={5}
        projects={[projectArea1, projectArea2]}
        loading={false}
        authRole={directivaMember.role}
        currentMember={directivaMember}
      />,
    );

    // Area 1 project is visible with 75 % progress
    const project1Badge = getByTestId("dashboard-project-progress-10");
    assert.equal(project1Badge.textContent, "75 %");

    // Area 2 project is not visible for Directiva of Area 1
    const project2Item = queryByTestId("dashboard-project-20");
    assert.equal(project2Item, null);
  });

  it("renders role-scoped projects in DashboardView for Miembro (only participating projects)", async () => {
    const { render } = await import("@testing-library/react");
    const memberUser: Member = {
      id: 42,
      firstNames: "Miembro",
      lastNames: "Participante",
      major: "Informática",
      role: "miembro",
      areaId: 1,
      memberships: [{ areaId: 1, role: "miembro" }],
    };

    const participatingProject: DashboardProject = {
      id: 101,
      name: "Proyecto Participado",
      description: "Proyecto con asignación",
      startDate: null,
      endDate: null,
      status: "active",
      isArchived: false,
      hasTasks: true,
      totalTasks: 4,
      completedTasks: 3,
      progress: 75,
      areaId: 1,
      area: { id: 1, name: "Desarrollo", description: null },
      phases: [],
      memberships: [{ id: 1, role: "member", memberId: 42 }],
    };

    const otherProject: DashboardProject = {
      id: 102,
      name: "Proyecto Ajeno",
      description: "Proyecto en el que no participa",
      startDate: null,
      endDate: null,
      status: "active",
      isArchived: false,
      hasTasks: false,
      totalTasks: 0,
      completedTasks: 0,
      progress: 0,
      areaId: 1,
      area: { id: 1, name: "Desarrollo", description: null },
      phases: [],
      memberships: [{ id: 2, role: "member", memberId: 99 }],
    };

    const { getByTestId, queryByTestId } = render(
      <DashboardView
        areaCount={1}
        memberCount={5}
        activeMembers={4}
        availableMembers={3}
        projects={[participatingProject, otherProject]}
        loading={false}
        authRole={memberUser.role}
        currentMember={memberUser}
      />,
    );

    // Participating project is displayed with 75 % progress
    const project1Badge = getByTestId("dashboard-project-progress-101");
    assert.equal(project1Badge.textContent, "75 %");

    // Other project where member is not participant is omitted
    const otherProjectItem = queryByTestId("dashboard-project-102");
    assert.equal(otherProjectItem, null);
  });

  it("renders all active projects and excludes archived for Presidencia in DashboardView", async () => {
    const { render } = await import("@testing-library/react");
    const presidenciaMember: Member = {
      id: 1,
      firstNames: "Presidente",
      lastNames: "Global",
      major: "Sistemas",
      role: "presidencia",
      areaId: null,
      memberships: [],
    };

    const projectArea1: DashboardProject = {
      id: 201,
      name: "Proyecto Global 1",
      description: "Área 1",
      startDate: null,
      endDate: null,
      status: "active",
      isArchived: false,
      hasTasks: true,
      totalTasks: 4,
      completedTasks: 3,
      progress: 75,
      areaId: 1,
      area: { id: 1, name: "Desarrollo", description: null },
      phases: [],
      memberships: [],
    };

    const projectArea2: DashboardProject = {
      id: 202,
      name: "Proyecto Global 2",
      description: "Área 2",
      startDate: null,
      endDate: null,
      status: "active",
      isArchived: false,
      hasTasks: false,
      totalTasks: 0,
      completedTasks: 0,
      progress: 0,
      areaId: 2,
      area: { id: 2, name: "Diseño", description: null },
      phases: [],
      memberships: [],
    };

    const projectArchived: DashboardProject = {
      id: 203,
      name: "Proyecto Archivado",
      description: "Proyecto pasado",
      startDate: null,
      endDate: null,
      status: "completed",
      isArchived: true,
      hasTasks: true,
      totalTasks: 2,
      completedTasks: 2,
      progress: 100,
      areaId: 1,
      phases: [],
      memberships: [],
    };

    const { getByTestId, queryByTestId } = render(
      <DashboardView
        areaCount={2}
        memberCount={20}
        activeMembers={15}
        availableMembers={10}
        projects={[projectArea1, projectArea2, projectArchived]}
        loading={false}
        authRole={presidenciaMember.role}
        currentMember={presidenciaMember}
      />,
    );

    // Presidencia sees Project 1 (75 %) and Project 2 (Sin tareas)
    const project1Badge = getByTestId("dashboard-project-progress-201");
    assert.equal(project1Badge.textContent, "75 %");

    const project2Badge = getByTestId("dashboard-project-progress-202");
    assert.equal(project2Badge.textContent, "Sin tareas");

    // Archived project is not displayed
    const archivedItem = queryByTestId("dashboard-project-203");
    assert.equal(archivedItem, null);
  });
});
