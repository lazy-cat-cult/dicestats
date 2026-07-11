# dice — Agent Instructions

Monte Carlo dice probability calculator (Vite + Preact + Tailwind + Chart.js, 1M iterations in a Web Worker).

## Spec-Driven Development

- **OpenSpec** (`openspec/specs/`) is the source of truth for models, algorithms, UI, and behavior.
- `doc/ARCH.md` — architecture reference.

### OpenSpec-first rule

- Before implementing ANY feature or code change, the agent MUST first check whether the project has an `openspec/` directory.
- If `openspec/` exists, the agent MUST read the relevant specs in `openspec/specs/` BEFORE writing any implementation code.
- If the change affects data models, algorithms, UI behavior, or persistence, the agent MUST either find an existing OpenSpec change for it or propose a new one using `/opsx:propose` before implementing.
- The agent MUST NOT skip spec review and jump straight to coding. Specs are the source of truth; code follows specs, not the other way around.

### Review & closure

- After implementation is complete and all tests pass, the agent MUST conduct a review of the change against the spec.
- Completed changes MUST be finalized: sync delta specs to main specs (`/opsx:sync`) and archive the change (`/opsx:archive`).

### Versioning & CHANGELOG

- The project follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
- `package.json` `version` field is the single source of truth for the current version.
- After completing an OpenSpec change that introduces features, fixes, or breaking changes, the agent MUST:
  1. Bump the version in `package.json` according to SemVer (`major.minor.patch`).
  2. Move entries from `[Unreleased]` to a new version section in `CHANGELOG.md`, or add a new `[Unreleased]` section with the changes if none exists.
  3. Group entries under `### Added`, `### Changed`, `### Fixed`, `### Removed` matching the Keep a Changelog format.
- `git tag v<version>` MUST be created after the version bump commit.

## Mandatory Process

1. After every code change, run **`verification-loop`** skill until `Overall: READY for PR`.
2. `npm run typecheck && npm run test && npm run lint` — zero new errors.
3. **English only** in UI strings and comments.
4. **No comments** in code unless explicitly requested.
5. When adding features (reroll, pipeline, outcomes), update YAML presets in `yaml/` to maintain coverage.
