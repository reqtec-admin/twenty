# REQtec Twenty fork

This repository is a fork of [twentyhq/twenty](https://github.com/twentyhq/twenty) for Requisite Technologies.

It is a fork of Twenty, not Twenty itself. Do not use the Twenty name or logo as the product brand. See Twenty's `.github/TRADEMARK.md`.

## What this branch adds

1. `scripts/strip-enterprise-files.sh` — deletes every file whose header contains `@license Enterprise` so this tree does not ship Twenty commercial-licensed code.
2. A **clean-room Keycloak OIDC login** under `packages/twenty-server/src/engine/core-modules/reqtec-keycloak/`. It does not copy Twenty's Enterprise SSO module.

## Strip Enterprise files

From the repo root:

```bash
bash scripts/strip-enterprise-files.sh
```

The script:

- finds files containing `@license Enterprise`
- deletes them
- writes `scripts/stripped-enterprise-files.txt`
- prints AGPL files that still import deleted paths so you can finish compile cleanup

Expect follow-up compile work. Twenty's AGPL modules import some Enterprise modules (SSO, row-level permissions, billing extras). After the strip you must remove those imports or replace them with your own code. Do **not** restore the deleted Enterprise sources.

A workflow on this branch (`.github/workflows/strip-enterprise.yml`) can run the same script.

## Keycloak OIDC

### Env vars

```bash
AUTH_KEYCLOAK_ENABLED=true
AUTH_KEYCLOAK_ISSUER=https://keycloak.reqtec.example/realms/reqtec
AUTH_KEYCLOAK_CLIENT_ID=twenty
AUTH_KEYCLOAK_CLIENT_SECRET=replace-me
AUTH_KEYCLOAK_CALLBACK_URL=https://crm.reqtec.example/auth/keycloak/redirect
# Optional. Default: openid email profile
AUTH_KEYCLOAK_SCOPE=openid email profile
# If true, create a Twenty user when Keycloak email is new. Default false.
AUTH_KEYCLOAK_ALLOW_JIT=false
```

`AUTH_KEYCLOAK_ISSUER` must be the realm issuer, for example:
`https://<keycloak-host>/realms/<realm>`

Discovery is loaded from:
`<issuer>/.well-known/openid-configuration`

### Keycloak client

- Client type: confidential (or public + PKCE; this code always sends PKCE)
- Valid redirect URI: exactly `AUTH_KEYCLOAK_CALLBACK_URL`
- Standard flow enabled
- Scopes: `openid`, `email`, `profile`
- Email must be present and match the Twenty user

### Login URL

`GET /auth/keycloak`

Callback:

`GET /auth/keycloak/redirect`

Optional query on start: `workspaceId`, `returnToPath`.

### First version behavior

- Verifies the user with Keycloak (authorization code + PKCE).
- Looks up an **existing** Twenty user by email (case-insensitive).
- Issues a Twenty login token for that user's workspace and redirects to `/verify`.
- JIT user creation is off unless `AUTH_KEYCLOAK_ALLOW_JIT=true`. JIT only creates a user row when SignInUpService is available; prefer inviting users in Twenty first.

This path does **not** use Twenty's `/* @license Enterprise */` SSO controllers, guards, or Settings UI.

## License reminder

- Remaining Twenty core: AGPLv3.
- SDKs / UI packages: MIT as marked in their package.json.
- Deleted Enterprise files: do not reintroduce them.
- Your Keycloak module: copyright Requisite Technologies, licensed AGPLv3 to match the server package.
