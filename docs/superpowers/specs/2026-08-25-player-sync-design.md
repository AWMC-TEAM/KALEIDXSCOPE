# Player Sync Design

## Goal

Replace manual progress import/export with a QR-code based score sync. The static EdgeOne site must never expose the upstream API token, and a successful sync should be reusable in the same browser without asking for the QR code again.

## Architecture

The browser calls a same-origin `POST /api/player/sync` Edge Function. The function reads `WMC_API_TOKEN` from runtime environment variables and calls `https://api.wmc.pub/v1/user/music`. The function returns only normalized player records and sync metadata.

The repository contains no token, QR code, or upstream request header. The deployment config must provide `WMC_API_TOKEN` through EdgeOne runtime secrets.

## Browser persistence

After a successful sync, the browser stores:

- An encrypted-at-rest QR code in `localStorage`, using a per-browser AES key stored alongside the encrypted envelope in `localStorage` so the binding survives browser restarts.
- Normalized records and the last successful sync timestamp in `localStorage`.

The QR code is never rendered back into the UI, logged, sent to analytics, or included in URLs. This browser-side encryption protects against casual storage inspection, not a compromised page or XSS. A clear-account action removes both the encrypted QR code and cached records. If browser storage is unavailable, syncing remains available for the current page session only.

## Rate limiting and failure handling

The client coalesces concurrent syncs, applies a cooldown, and uses cached records while a request is unavailable. The Edge Function applies request validation, a timeout, bounded retries only for transient upstream failures, and a per-instance limiter. Strict global QPS must be configured in EdgeOne's platform-level rate limiting/WAF rules; no KV-backed limiter is required by the application.

## Progress integration

All six gate pages consume the shared sync module. A record with a positive play count marks the matching song ID as played. Sync is merge-only: it marks songs complete but never clears manual progress because of an incomplete or failed response. Existing reset controls remain; import/export controls and handlers are removed.

## UI

Each gate page gets a compact sync control and responsive modal/bottom sheet. Desktop uses a dense toolbar and status summary; mobile uses a single-column layout, compact filters, and a full-width sync action. Existing gate colors and challenge logic remain intact.

## Verification

Verify that no secret-like token is present in tracked files, the static pages load without console errors, the sync module handles success/429/timeout responses, cached sync works after navigation, and all import/export controls are gone.
