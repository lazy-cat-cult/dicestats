# Changelog

All notable changes to Dicestats are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — 2026-07-11

### Added
- Highest/lowest dice selection (`keep highest N` / `keep lowest N`).
- Result caching with precomputed presets for instant loading of popular RPG systems.
- Precomputed data for PbtA, Savage Worlds, Year Zero Push presets.
- User Guide page rendered from `doc/user_guide.md`.
- Full favicon and web manifest set (PWA).
- Dual deployment support for subdomain + GitHub Pages.

### Changed
- Sweep inputs replaced with independent X/Y expression variables; `SweepCostChip` removed.
- Validation ref scanning for sweep variable references.
- Google Fonts replaced with local `@fontsource` packages.
- Display font: Ubuntu.
- Preset deployment: rsync `--delay-updates --delete-after` for atomic per-file sync.
- CI: server deploy job with atomic swap and concurrency guard.

### Fixed
- Phantom X/Y sweep names no longer block preset activation.
- Sweep variable support in reroll/explode condition values.
- Flaky assertion in reroll events sample test.

## [1.0.0] — 2026-06-21

### Added
- Monte Carlo dice probability calculator (1M iterations per run).
- 5-step configuration wizard: Dice Pool, Rerolls, Pipeline, Outcomes, Sweep.
- Expression-based X/Y sweep parameters with cartesian product simulation.
- Pipeline functions: filter, remove, count, sum, max, min, add, sub, mul, div, switch/case, ceil, floor.
- Vector and scalar named values with fully typed pipeline.
- Multi-label independent outcome evaluation with overlap detection.
- Condition chain system: tag-based dice matching, scalar comparisons, AND/OR connectors, repeatable rerolls.
- Preset system: 5 built-in RPG presets (D&D 5e, PbtA, Daggerheart, Blades in the Dark).
- Preset library modal with search and compact rail UI.
- User preset management: save, load, rename, delete, favorites, YAML export/import.
- Sample mode: single-throw trace with editable face overrides and on-the-fly recalculation.
- Share URL encoding via LZ-String compression.
- Custom sides input with persistent combo-box.
- Probability table, outcome distribution charts (Chart.js), odds tape.
- Result details modal with full statistical breakdown.
- Overall roll progress indicator with zero-padded percentages.
- localStorage persistence with versioned migration (v1→v9).
- Responsive layout with GitHub Pages deployment.
- Web Worker simulation for non-blocking UI.
