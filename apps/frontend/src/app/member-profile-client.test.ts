import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../lib/auth-client";
import {
  MEMBER_PROFILE_MESSAGES,
  loadMemberProfile,
  normalizeMemberProfile,
} from "./member-profile-client";

const rawMember = {
  id: 7,
  firstNames: "Ada",
  lastNames: "Lovelace",
  institution: "UNI",
  studentCode: "20260007",
  major: "Ingeniería de Software",
  birthDate: "2004-12-10",
  cycle: 6,
  role: "miembro",
  activityStatus: "active",
  availabilityStatus: "available",
  createdAt: "2026-01-02T10:00:00.000Z",
  updatedAt: "2026-08-03T10:00:00.000Z",
  skills: [{ id: 2, name: " TypeScript " }, null, { name: "" }],
  memberships: [
    {
      id: 4,
      areaId: 3,
      role: "miembro",
      area: { id: 3, name: "Desarrollo", description: null },
    },
  ],
};

test("loads and normalizes a successful member profile", async () => {
  const result = await loadMemberProfile(
    7,
    "secret-token",
    "presidencia",
    async <T>(path: string) => {
      assert.equal(path, "/members");
      return [rawMember] as T;
    },
  );

  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.member.firstNames, "Ada");
  assert.deepEqual(result.member.skills, [{ id: 2, name: "TypeScript" }]);
  assert.equal(result.member.memberships?.[0].area?.name, "Desarrollo");
  assert.equal(result.member.activityStatus, "active");
  assert.equal(result.member.createdAt, rawMember.createdAt);
});

test("returns a localized unauthorized state without making a request", async () => {
  let requested = false;
  const result = await loadMemberProfile(
    7,
    "secret-token",
    "miembro",
    async <T>() => {
      requested = true;
      return [] as T;
    },
  );

  assert.equal(requested, false);
  assert.deepEqual(result, {
    status: "unauthorized",
    ...MEMBER_PROFILE_MESSAGES.unauthorized,
  });
});

test("returns a localized not-found state for an absent profile", async () => {
  const result = await loadMemberProfile(
    99,
    "secret-token",
    "directiva_de_area",
    async <T>() => [rawMember] as T,
  );

  assert.deepEqual(result, {
    status: "not-found",
    ...MEMBER_PROFILE_MESSAGES.notFound,
  });
});

test("hides technical API errors behind a localized state", async () => {
  const technicalMessage =
    "GET http://localhost:3001/members failed: invalid bearer token";
  const result = await loadMemberProfile(
    7,
    "secret-token",
    "presidencia",
    async () => {
      throw new ApiError(technicalMessage, 500);
    },
  );

  assert.deepEqual(result, {
    status: "error",
    ...MEMBER_PROFILE_MESSAGES.error,
  });
  assert.equal(JSON.stringify(result).includes(technicalMessage), false);
  assert.equal(JSON.stringify(result).includes("/members"), false);
});

test("maps forbidden API responses to the localized unauthorized state", async () => {
  const result = await loadMemberProfile(
    7,
    "secret-token",
    "presidencia",
    async () => {
      throw new ApiError("ForbiddenException: /members", 403);
    },
  );

  assert.deepEqual(result, {
    status: "unauthorized",
    ...MEMBER_PROFILE_MESSAGES.unauthorized,
  });
});

test("normalization strips internal fields for roles without visibility", () => {
  const member = normalizeMemberProfile(rawMember, "miembro");

  assert.ok(member);
  assert.equal(member.institution, undefined);
  assert.equal(member.studentCode, undefined);
  assert.equal(member.birthDate, undefined);
  assert.equal(member.activityStatus, undefined);
  assert.equal(member.availabilityStatus, undefined);
  assert.equal(member.skills?.[0].name, "TypeScript");
});
