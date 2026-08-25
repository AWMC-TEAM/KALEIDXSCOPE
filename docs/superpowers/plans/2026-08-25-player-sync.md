# Player Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual progress import/export with a secure QR-code score sync that keeps the account and normalized records in the browser.

**Architecture:** Add an EdgeOne Pages Function at `/api/player/sync` that reads `WMC_API_TOKEN` and optional `WMC_SESSION_COOKIE` only from runtime environment variables, calls the upstream full-record API, and returns normalized played records. Add a shared browser module that encrypts the QR code for local storage, caches records, rate-limits client requests, and emits updates consumed by all six gate pages.

**Tech Stack:** EdgeOne Pages Function Web APIs, browser Web Crypto/localStorage/sessionStorage, existing vanilla HTML/CSS/JavaScript.

**Spec:** `docs/superpowers/specs/2026-08-25-player-sync-design.md`

## Global Constraints

- API credentials never appear in tracked files, HTML, JavaScript, analytics payloads, or URLs.
- The browser asks for the QR code once and reuses it from encrypted local storage until the user clears the account.
- No KV or database is required by the application.
- Strict global QPS is configured at the EdgeOne platform layer; the function also provides bounded per-instance protection.
- Import and export controls and handlers are removed from all six gate pages.

### Task 1: Secure upstream proxy

**Files:**
- Create: `functions/api/player/sync.js`
- Modify: `README.md`

- [x] Add request validation, environment-only credentials, timeout, bounded retry, per-instance cooldown, response normalization, and no-store headers.
- [x] Document EdgeOne runtime variables and platform-level rate-limit setup without including real values.
- [x] Test the normalization and secret scan with Node syntax checks and a local fixture script.

### Task 2: Shared browser sync module and UI

**Files:**
- Create: `player-sync.js`
- Create: `player-sync.css`

- [x] Implement AES-GCM encrypted QR storage, cached record storage, clear-account action, request coalescing, cooldown, and cache-first startup.
- [x] Build the compact sync button, modal/bottom-sheet form, status text, and error states.
- [x] Dispatch `player-records-updated` and expose `PlayerSync.getPlayedSongIds()`.

### Task 3: Gate page integration

**Files:**
- Modify: `BLUEKALEIDXSCOPE/index.html`, `BLUEKALEIDXSCOPE/script.js`
- Modify: `BLACKKALEIDXSCOPE/index.html`, `BLACKKALEIDXSCOPE/script.js`
- Modify: `PURPLEKALEIDXSCOPE/index.html`, `PURPLEKALEIDXSCOPE/script.js`
- Modify: `WHITEKALEIDXSCOPE/index.html`, `WHITEKALEIDXSCOPE/script.js`
- Modify: `YELLOWKALEIDXSCOPE/index.html`, `YELLOWKALEIDXSCOPE/script.js`
- Modify: `REDKALEIDXSCOPE/index.html`, `REDKALEIDXSCOPE/script.js`

- [x] Replace import/export controls with the shared sync control and load shared assets.
- [x] Remove import/export modals and handlers.
- [x] Merge played song IDs into each page's existing progress model without clearing manual progress.
- [x] Keep reset, filters, randomizers, and challenge behavior intact.

### Task 4: Responsive visual refresh

**Files:**
- Modify: `style.css`
- Modify: each gate page stylesheet as needed for shared toolbar/modal hooks.

- [x] Add compact toolbar, status, modal, and mobile layout rules.
- [x] Preserve each gate's accent color while reducing excess spacing and preventing overflow.
- [x] Verify desktop and narrow mobile rendering with static browser checks.

### Task 5: Verification

- [x] Run `node --check` on all JavaScript files.
- [x] Confirm no real credential value appears in tracked frontend files.
- [x] Confirm no import/export labels, IDs, or listeners remain.
- [x] Serve the site locally and smoke-test all six pages plus the sync modal assets.
