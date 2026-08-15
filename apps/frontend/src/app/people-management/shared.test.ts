import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../../lib/auth-client";
import { messageFrom } from "./shared";

test("explains how to remove an area membership used by active projects", () => {
  const error = new ApiError(
    "Remove the member from active project teams in this area",
    400,
    "AREA_MEMBERSHIP_HAS_ACTIVE_PROJECTS",
  );

  assert.equal(
    messageFrom(error),
    "Primero retira al miembro de los proyectos activos de esta área y luego vuelve a intentar cambiar o quitar su pertenencia.",
  );
  assert.equal(messageFrom(error).includes("Remove the member"), false);
});
