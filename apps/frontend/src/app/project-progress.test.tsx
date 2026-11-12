import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { formatProjectProgress, ProgressBar } from "./project-progress";
import type { Project, ProjectPhase } from "./project-management";
import { ProjectCard, ProjectDetail } from "./project-management";

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

    // Project avance card shows 50 %
    const progressTexts = getAllByText("50 %");
    assert.ok(progressTexts.length >= 1, "Debe mostrar al menos un elemento con 50 %");

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
});
