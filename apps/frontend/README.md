# UNICORE frontend

## Getting Started

Set the backend URL when it differs from `http://localhost:3001`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Then run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Authentication

The application signs in through `POST /auth/login`, stores the returned access
token in `sessionStorage`, and validates restored sessions with `GET /auth/me`.
All private API requests send the token through the `Authorization: Bearer`
header.

The legacy `NEXT_PUBLIC_ACCESS_ROLE`, `NEXT_PUBLIC_ACCESS_AREA_ID`, and
`NEXT_PUBLIC_ACCESS_PROJECT_IDS` variables are no longer used.
