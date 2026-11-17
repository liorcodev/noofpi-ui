# Changelog

All notable changes to noofpi-ui are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.1] - 2026-11-17

### Changed

- The fallback `primary` palette (used when no Color Theme Studio `theme.css` is imported) is now the noofpi brand green (`#effaf5` to `#0a2a1f`). The previous, more saturated green made the hover and pressed fills of the outline, ghost, subtle and soft variants look too heavy.
- The `noofpi` theme in the playground `theme.css` uses the same palette.

## [1.0.0] - 2026-11-17

### Added

- First release: Tailwind v4 components for noofpi, auto-imported through the `noofpi-ui/vite` plugin and themed with `--ui-*` CSS variables and Color Theme Studio.
