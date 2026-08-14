# Security Policy

## Reporting a vulnerability

Do not disclose a suspected vulnerability in a public issue. Use GitHub Private Vulnerability Reporting for this repository. Include the affected path, impact, reproduction steps, and any suggested mitigation without attaching real credentials or personal data.

## Public repository rules

Only Supabase project URLs and publishable keys may be embedded in browser or mobile clients. These values still receive only the permissions granted by RLS and explicit database privileges.

Never commit or log:

- Supabase secret/service-role keys, database URLs, or JWT secrets
- Admin, E2E, or production user credentials
- Expo access tokens or push-service access tokens
- Apple APNs keys, certificates, provisioning profiles, or App Store Connect keys
- Android keystores, service-account files, or Firebase admin credentials

If a secret is exposed, deleting it from Git is insufficient. Revoke and rotate the credential first, then remove it from all reachable Git history.

## Content and asset rights

The repository being public does not grant permission to reuse Jubilee Worship or Sundoo Church names, photographs, videos, logos, or other brand assets. Application assets are excluded from any future code license unless explicitly stated otherwise.

## Dependency policy

Dependencies are locked with pnpm. Security alerts are reviewed before release. A transitive advisory without an upstream patched version is documented in `docs/DEPENDENCY_RISK_REGISTER.md` and must not be hidden with an unverified major-version override.
