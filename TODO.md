# TODO - Render deployment fix: ENOENT /app/data/lead-categories.json

- [ ] Identify the code path that reads `/app/data/lead-categories.json` (likely hardcoded relative paths vs DATA_DIR).
- [ ] Update `server/storage.ts` JSON storage to use a consistent writable data directory and to never reference `/app/data/*` directly.
- [ ] Ensure all JSON entities (including lead-categories) are loaded/saved only under the computed `DATA_DIR`.
- [ ] Confirm Render environment variables: set `DATA_DIR` to a writable path (e.g. `/opt/render/data`).
- [ ] Add/update `render.yaml` to define `DATA_DIR`.
- [x] Build and run locally to verify no ENOENT occurs.

- [ ] Final verification steps (smoke test endpoints for leads/lead-categories).

