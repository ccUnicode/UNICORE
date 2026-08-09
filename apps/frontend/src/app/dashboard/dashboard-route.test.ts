import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessDashboardRoute,
  getDashboardPath,
  getRouteNavView,
  parseDashboardPath,
} from "./dashboard-route";

describe("dashboard canonical routes", () => {
  it("maps list and detail paths to their views", () => {
    assert.deepEqual(parseDashboardPath("/dashboard/areas"), { view: "areas" });
    assert.deepEqual(parseDashboardPath("/dashboard/areas/42"), {
      view: "area-detail",
      resourceId: 42,
    });
    assert.deepEqual(parseDashboardPath("/dashboard/members/7/"), {
      view: "member-profile",
      resourceId: 7,
    });
  });

  it("rejects invalid, duplicate, and incomplete paths", () => {
    assert.deepEqual(parseDashboardPath("/dashboard/area/4"), {
      view: "not-found",
    });
    assert.deepEqual(parseDashboardPath("/dashboard/members/0"), {
      view: "not-found",
    });
    assert.deepEqual(parseDashboardPath("/dashboard/projects/3"), {
      view: "not-found",
    });
  });

  it("builds canonical paths for navigation", () => {
    assert.equal(getDashboardPath("dashboard"), "/dashboard");
    assert.equal(getDashboardPath("projects"), "/dashboard/projects");
    assert.equal(getDashboardPath("area-detail", 12), "/dashboard/areas/12");
    assert.equal(
      getDashboardPath("member-profile", 15),
      "/dashboard/members/15",
    );
  });

  it("keeps detail routes active under their parent navigation item", () => {
    assert.equal(
      getRouteNavView({ view: "area-detail", resourceId: 2 }),
      "areas",
    );
    assert.equal(
      getRouteNavView({ view: "member-profile", resourceId: 9 }),
      "members",
    );
  });

  it("preserves people and audit authorization on direct navigation", () => {
    const areaRoute = parseDashboardPath("/dashboard/areas/2");
    assert.equal(canAccessDashboardRoute(areaRoute, "miembro"), false);
    assert.equal(
      canAccessDashboardRoute(areaRoute, "directiva_de_area"),
      true,
    );
    assert.equal(
      canAccessDashboardRoute(parseDashboardPath("/dashboard/tasks"), "miembro"),
      true,
    );
  });
});
