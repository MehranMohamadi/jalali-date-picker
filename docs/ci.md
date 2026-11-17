# Continuous integration

`.github/workflows/ci.yml` runs on pushes, pull requests, and manual dispatch.
It uses read-only repository permissions and does not require production secrets.

- Frontend: Node.js 22, `npm ci`, `npm test`, `npm run build`, then `npm run build:app`.
- Backend: the Go version from `backend/go.mod`, then `go test ./...` in `backend/`.
- Vitest discovers only `tests/**/*.test.ts`, excluding tests in sibling worktrees.

These checks do not deploy the app or build an APK. Generated frontend output
is a build check, not a published release. Linux CI skips the existing
Windows-only credential encryption test. The backend billing integration test
skips without `BUDGETYAR_TEST_DATABASE_URL`; this workflow does not supply a
database and does not verify the database payment lifecycle.

After pushing, confirm both jobs pass on GitHub. To enforce them before merging,
configure branch protection or a ruleset requiring `Frontend tests and builds`
and `Backend tests`. Adding this workflow alone does not enforce checks in
Vercel or prevent direct production deployments.

Dependency vulnerability checks, secret scanning, browser acceptance tests, and
database integration tests remain separate launch tasks.
