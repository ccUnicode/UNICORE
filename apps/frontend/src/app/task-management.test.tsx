import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { JSDOM } from "jsdom";
import type { Task } from "./task-management";
import { haveSameMemberIds } from "./task-management";

type FetchCall = {
  method: string;
  pathname: string;
  body?: unknown;
};

it("detects unchanged assignee sets regardless of order", () => {
  assert.equal(haveSameMemberIds([2, 1], [1, 2]), true);
  assert.equal(haveSameMemberIds([1], [1, 2]), false);
});

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("TaskManagement collaboration flow", () => {
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

  it("loads collaboration, posts a comment, and refreshes history after a status change", async () => {
    const [{ cleanup, fireEvent, render, waitFor }, { default: TaskManagement }] =
      await Promise.all([
        import("@testing-library/react"),
        import("./task-management"),
      ]);
    const calls: FetchCall[] = [];
    const member = {
      id: 1,
      firstNames: "Ana",
      lastNames: "Torres",
      major: "Ingeniería de Sistemas",
      role: "presidencia",
    };
    const project = {
      id: 1,
      name: "Portal de miembros",
      description: null,
      startDate: null,
      endDate: null,
      status: "active" as const,
      isArchived: false,
      phases: [],
      memberships: [
        { id: 1, memberId: member.id, role: "representative" as const, member },
      ],
    };
    const baseTask = {
      id: 10,
      title: "Implementar colaboración",
      description: "Detalle de la tarea",
      status: "in_progress" as const,
      priority: "high" as const,
      dueDate: null,
      projectId: project.id,
      phaseId: null,
      assignees: [],
      createdAt: "2026-08-03T10:00:00.000Z",
    };
    let detail: Task = {
      ...baseTask,
      comments: [
        {
          id: 1,
          taskId: baseTask.id,
          authorId: member.id,
          author: member,
          content: "Primer comentario",
          createdAt: "2026-08-03T10:01:00.000Z",
        },
      ],
      statusHistory: [
        {
          id: 1,
          taskId: baseTask.id,
          previousStatus: "todo" as const,
          newStatus: "in_progress" as const,
          actorId: member.id,
          actor: member,
          createdAt: "2026-08-03T10:02:00.000Z",
        },
      ],
    };

    globalThis.fetch = async (input, init) => {
      const requestUrl = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      const method = init?.method ?? "GET";
      const body =
        typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      calls.push({ method, pathname: requestUrl.pathname, body });

      if (requestUrl.pathname === "/projects/1") {
        return jsonResponse(project);
      }
      if (requestUrl.pathname === "/tasks" && method === "GET") {
        return jsonResponse({
          data: [{ ...baseTask, status: detail.status }],
          meta: { total: 1, page: 1, limit: 10, lastPage: 1 },
        });
      }
      if (requestUrl.pathname === "/tasks/10/comments" && method === "POST") {
        return jsonResponse(
          {
            id: 2,
            taskId: baseTask.id,
            authorId: member.id,
            author: member,
            content: (body as { content: string }).content,
            createdAt: "2026-08-03T10:03:00.000Z",
          },
          201,
        );
      }
      if (requestUrl.pathname === "/tasks/10/status" && method === "PATCH") {
        detail = {
          ...detail,
          status: "in_review",
          statusHistory: [
            {
              id: 2,
              taskId: baseTask.id,
              previousStatus: "in_progress",
              newStatus: "in_review",
              actorId: member.id,
              actor: member,
              createdAt: "2026-08-03T10:04:00.000Z",
            },
            ...(detail.statusHistory ?? []),
          ],
        };
        return jsonResponse(detail);
      }
      if (requestUrl.pathname === "/tasks/10") {
        return jsonResponse(detail);
      }

      return jsonResponse({ message: "Unexpected request" }, 500);
    };

    const view = render(
      <TaskManagement
        projects={[project]}
        accessToken="mock-token"
        apiUrl="http://api.test"
        currentMember={member}
      />,
    );

    try {
      fireEvent.click(
        await view.findByRole("button", { name: "Implementar colaboración" }),
      );
      await view.findByText("Primer comentario");
      await waitFor(() =>
        assert.match(
          view.container.textContent ?? "",
          /cambió de Por hacer a En progreso/,
        ),
      );

      fireEvent.change(
        view.getByPlaceholderText("Escribe una actualización o pregunta..."),
        { target: { value: "Listo para revisar" } },
      );
      fireEvent.click(
        view.getByRole("button", { name: "Agregar comentario" }),
      );

      await view.findByText("Listo para revisar");
      assert.equal(
        calls.some(
          ({ method, pathname, body }) =>
            method === "POST" &&
            pathname === "/tasks/10/comments" &&
            (body as { content?: string })?.content === "Listo para revisar",
        ),
        true,
      );

      fireEvent.click(view.getByRole("button", { name: "En revisión" }));
      await waitFor(() =>
        assert.match(
          view.container.textContent ?? "",
          /cambió de En progreso a En revisión/,
        ),
      );
      assert.equal(
        calls.some(
          ({ method, pathname }) =>
            method === "PATCH" && pathname === "/tasks/10/status",
        ),
        true,
      );
    } finally {
      cleanup();
    }
  });

  it("allows unavailable members and excludes disabled members when assigning tasks per FR-55", async () => {
    const [{ cleanup, fireEvent, render }, { default: TaskManagement }] =
      await Promise.all([
        import("@testing-library/react"),
        import("./task-management"),
      ]);
    const calls: FetchCall[] = [];
    const repMember = {
      id: 1,
      firstNames: "Ana",
      lastNames: "Torres",
      major: "Ingeniería de Sistemas",
      role: "presidencia",
      availabilityStatus: "available",
    };
    const unavailableMember = {
      id: 2,
      firstNames: "Luis",
      lastNames: "García",
      major: "Ingeniería de Software",
      role: "miembro",
      availabilityStatus: "not_available",
    };
    const disabledMember = {
      id: 3,
      firstNames: "Carlos",
      lastNames: "Mendoza",
      major: "Ciencias de la Computación",
      role: "miembro",
      availabilityStatus: "disabled",
    };
    const project = {
      id: 1,
      name: "Proyecto Feria",
      description: null,
      startDate: null,
      endDate: null,
      status: "active" as const,
      isArchived: false,
      phases: [],
      memberships: [
        {
          id: 1,
          memberId: repMember.id,
          role: "representative" as const,
          member: repMember,
        },
        {
          id: 2,
          memberId: unavailableMember.id,
          role: "member" as const,
          member: unavailableMember,
        },
        {
          id: 3,
          memberId: disabledMember.id,
          role: "member" as const,
          member: disabledMember,
        },
      ],
    };

    globalThis.fetch = async (input, init) => {
      const requestUrl = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      const method = init?.method ?? "GET";
      const body =
        typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      calls.push({ method, pathname: requestUrl.pathname, body });

      if (requestUrl.pathname === "/projects/1") {
        return jsonResponse(project);
      }
      if (requestUrl.pathname === "/tasks" && method === "GET") {
        return jsonResponse({
          data: [],
          meta: { total: 0, page: 1, limit: 10, lastPage: 0 },
        });
      }

      return jsonResponse({ message: "Unexpected request" }, 500);
    };

    const view = render(
      <TaskManagement
        projects={[project]}
        accessToken="mock-token"
        apiUrl="http://api.test"
        currentMember={repMember}
      />,
    );

    try {
      fireEvent.click(
        await view.findByRole("button", { name: "+ Nueva Tarea" }),
      );
      await view.findByText("Crear Nueva Tarea");

      // Verify unavailable member (Luis) is present and visible as selectable option with badge
      assert.match(view.container.textContent ?? "", /Luis García/);
      assert.match(view.container.textContent ?? "", /No disponible/);

      // Verify disabled member (Carlos) is NOT present in the candidate assignees list
      assert.doesNotMatch(view.container.textContent ?? "", /Carlos Mendoza/);
    } finally {
      cleanup();
    }
  });

  it("keeps currently assigned disabled members visible when editing so they can be deselected", async () => {
    const [{ cleanup, fireEvent, render }, { default: TaskManagement }] =
      await Promise.all([
        import("@testing-library/react"),
        import("./task-management"),
      ]);
    const calls: FetchCall[] = [];
    const repMember = {
      id: 1,
      firstNames: "Ana",
      lastNames: "Torres",
      major: "Ingeniería de Sistemas",
      role: "presidencia",
      availabilityStatus: "available",
    };
    const disabledAssignee = {
      id: 2,
      firstNames: "Luis",
      lastNames: "García",
      major: "Ingeniería de Software",
      role: "miembro",
      availabilityStatus: "disabled",
    };
    const unassignedDisabledMember = {
      id: 3,
      firstNames: "Carlos",
      lastNames: "Mendoza",
      major: "Ciencias de la Computación",
      role: "miembro",
      availabilityStatus: "disabled",
    };
    const project = {
      id: 1,
      name: "Proyecto Feria",
      description: null,
      startDate: null,
      endDate: null,
      status: "active" as const,
      isArchived: false,
      phases: [],
      memberships: [
        {
          id: 1,
          memberId: repMember.id,
          role: "representative" as const,
          member: repMember,
        },
        {
          id: 2,
          memberId: disabledAssignee.id,
          role: "member" as const,
          member: disabledAssignee,
        },
        {
          id: 3,
          memberId: unassignedDisabledMember.id,
          role: "member" as const,
          member: unassignedDisabledMember,
        },
      ],
    };

    const taskWithDisabledAssignee: Task = {
      id: 10,
      title: "Tarea con asignado inhabilitado",
      description: "Detalle",
      status: "todo",
      priority: "medium",
      dueDate: null,
      projectId: 1,
      phaseId: null,
      assignees: [
        {
          id: 1,
          taskId: 10,
          memberId: disabledAssignee.id,
          member: disabledAssignee,
        },
      ],
      createdAt: "2026-08-03T10:00:00.000Z",
    };

    globalThis.fetch = async (input, init) => {
      const requestUrl = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      const method = init?.method ?? "GET";
      const body =
        typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      calls.push({ method, pathname: requestUrl.pathname, body });

      if (requestUrl.pathname === "/projects/1") {
        return jsonResponse(project);
      }
      if (requestUrl.pathname === "/tasks" && method === "GET") {
        return jsonResponse({
          data: [taskWithDisabledAssignee],
          meta: { total: 1, page: 1, limit: 10, lastPage: 1 },
        });
      }
      if (requestUrl.pathname === "/tasks/10") {
        return jsonResponse(taskWithDisabledAssignee);
      }

      return jsonResponse({ message: "Unexpected request" }, 500);
    };

    const view = render(
      <TaskManagement
        projects={[project]}
        accessToken="mock-token"
        apiUrl="http://api.test"
        currentMember={repMember}
      />,
    );

    try {
      fireEvent.click(
        await view.findByRole("button", {
          name: "Tarea con asignado inhabilitado",
        }),
      );
      fireEvent.click(await view.findByRole("button", { name: "Editar" }));
      await view.findByText("Modificar Tarea");

      // Currently assigned disabled member Luis García is rendered with Inhabilitado label so user can uncheck him
      assert.match(view.container.textContent ?? "", /Luis García/);
      assert.match(view.container.textContent ?? "", /Inhabilitado/);

      // Unassigned disabled member Carlos Mendoza is NOT offered as a selectable assignee
      assert.doesNotMatch(view.container.textContent ?? "", /Carlos Mendoza/);
    } finally {
      cleanup();
    }
  });
});
