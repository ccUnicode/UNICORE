# Authentication

All endpoints are private by default. The only public routes are:

- `GET /`
- `POST /auth/bootstrap`
- `POST /auth/login`

Copy `.env.example` to `.env` and replace both authentication secrets with
independent random values of at least 32 characters.

## Bootstrap

Bootstrap is available only until the first member password is configured and
always requires `AUTH_BOOTSTRAP_SECRET`.

The bootstrap member must be an active UNI member with a student code and the
Presidencia role. This ensures the initial administrator can use the regular
login flow after the bootstrap token expires.

For an empty database, send a full Presidencia member:

```json
{
  "bootstrapSecret": "the-value-from-AUTH_BOOTSTRAP_SECRET",
  "password": "a-password-with-at-least-12-characters",
  "member": {
    "institution": "UNI",
    "studentCode": "20260001",
    "firstNames": "Initial",
    "lastNames": "Administrator",
    "major": "Systems Engineering",
    "birthDate": "2000-01-01",
    "role": "presidencia",
    "skills": ["management"]
  }
}
```

For an existing database, activate an existing Presidencia member instead:

```json
{
  "bootstrapSecret": "the-value-from-AUTH_BOOTSTRAP_SECRET",
  "password": "a-password-with-at-least-12-characters",
  "memberId": 1
}
```

## Login and authenticated requests

Login with `POST /auth/login`:

```json
{
  "studentCode": "20260001",
  "password": "a-password-with-at-least-12-characters"
}
```

Login is scoped to UNI members. External members are managed records but cannot
authenticate through the student-code login flow.

Send the returned token on private requests:

```text
Authorization: Bearer <accessToken>
```

Roles and area scope are loaded from the member record for every request.
Client-provided `x-role`, `x-area-id`, and related access headers are ignored.

Presidencia can configure or reset another member's password with
`PUT /auth/members/:memberId/password`.

Every password change increments the member's persisted session version.
Tokens issued with an earlier version are rejected by `AuthGuard`.

## Login rate limiting

`POST /auth/login` limits attempts per IP and student code, as well as
concurrent password verifications globally, per IP, and per account. The
thresholds are configured through the `AUTH_LOGIN_RATE_LIMIT_*` variables in
`.env.example`. These in-process limits apply per backend instance; a
multi-instance deployment should additionally enforce a shared limit at the
gateway.
