# Changelog

All notable changes to Dicestats will be documented in this file.

## [1.0.0] — 2026-06-21

### Added
- Monte Carlo dice probability calculator (1M iterations per run)
- 5-step configuration wizard: Dice Pool, Rerolls, Pipeline, Outcomes, Sweep
- Expression-based X/Y sweep parameters with cartesian product simulation
- Pipeline functions: filter, remove, count, sum, max, min, add, sub, mul, div, switch/case, ceil, floor
- Vector and scalar named values with fully typed pipeline
- Multi-label independent outcome evaluation with overlap detection
- Condition chain system: tag-based dice matching, scalar comparisons, AND/OR connectors, repeatable rerolls
- Preset system: 5 built-in RPG presets (D&D 5e, PbtA, Daggerheart ×2, Blades in the Dark)
- User preset management: save, load, rename, delete, favorites, YAML export/import
- Preset library modal with search and compact rail UI
- Sample mode: single-throw trace with editable face overrides and on-the-fly recalculation
- Share URL encoding via LZ-String compression
- Custom sides input with persistent combo-box
- Probability table, outcome distribution charts (Chart.js), odds tape
- Result details modal with full statistical breakdown
- localStorage persistence with versioned migration (v1→v9)
- Responsive layout with GitHub Pages deployment
- Web Worker simulation for non-blocking UI
