# REQtec Twenty fork

Internal self-hosted CRM (reqtec-hq). No product rebrand.

## What this branch does

- `reqtec/agpl-keycloak` adds a clean-room Keycloak OIDC login module under
  `packages/twenty-server/src/engine/core-modules/reqtec-keycloak/`.
- Files whose **first line** is `/* @license Enterprise */` were removed.
- Compile-only stubs replace deleted Enterprise modules so the AGPL tree
  typechecks. Stubs export names/shapes only and contain no Enterprise logic.
- MIT `twenty-shared` RLS types were restored **without** the Enterprise header
  (type shapes required by `ObjectPermissions` / role manifests).

## Keycloak

Env vars:

- `REQTEC_KEYCLOAK_ISSUER` — realm issuer URL
- `REQTEC_KEYCLOAK_CLIENT_ID`
- `REQTEC_KEYCLOAK_CLIENT_SECRET`
- `REQTEC_KEYCLOAK_REDIRECT_URI` — must match the Keycloak client redirect
- `REQTEC_KEYCLOAK_JIT` — optional; `true` to create the Twenty user on first login

Routes: `/auth/reqtec-keycloak` and `/auth/reqtec-keycloak/callback`.

Users must already exist in Twenty (email match) unless JIT is enabled.

## Strip

`scripts/strip-enterprise-files.sh` deletes files whose first non-empty line is
exactly `/* @license Enterprise */`. It never touches `LICENSE`, `REQTEC.md`,
or this script. Do not grep the phrase anywhere in the file — that previously
deleted `LICENSE` and this document.

## CI on this fork

Required server gate is compile-only (`server-build`). Upstream jobs that
assume Enterprise billing/SSO/RLS, marketplace apps, published GraphQL schema,
preview infra, or Twenty-org secrets are `workflow_dispatch` only.

Kept on pull request: CI Shared, CI Server (build), CI SDK (unit/lint/typecheck),
CI UI, CI Front, CI Docs, docker/emails/utils when they skip cleanly.
