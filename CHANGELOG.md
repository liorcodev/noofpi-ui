# Changelog

All notable changes to noofpi-ui are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.2.0] - 2026-11-18

### Added

- `secondary` color (blue by default) next to `primary`, `neutral`, `success`, `info`, `warning` and `error`. Set its shades with the `--ui-secondary-50` … `--ui-secondary-950` variables; `bg-secondary-*`, `text-secondary-*` and the other Tailwind color utilities are available.
- `color="secondary"` on every component that has a `color` prop.
- `color` prop on `NTabs`, `NPagination`, `NStepper`, `NCheckbox`, `NCalendar` and `NDatePicker` (default `primary`) for the selected or active state. `NCalendar` and `NDatePicker` also color the focus ring and today marker.

### Changed

- The active-state tokens `--n-calendar-range`, `--n-calendar-selected-bg`, `--n-calendar-selected-fg`, `--n-stepper-active-*` and `--n-pagination-active-*` are now defined on `.n-calendar`, `.n-stepper` and `.n-pagination` instead of `:root`. Override them there.

## [1.1.0] - 2026-11-18

### Added

- `NTooltip` with accessible hover and keyboard-focus behavior, collision-aware placement, solid and soft variants, custom content, delays, controlled open state, and reduced-motion support.
- `NEmptyState` with configurable media, semantic colors, actions, sizes, and slots.
- `NCommandPalette` with fuzzy-style local search, grouped commands, keyboard navigation, disabled items, shortcuts, and accessible dialog semantics.
- `NFileUpload` with drag-and-drop, previews, single or multiple selection, accept filters, size/count validation, removal, and form integration.

### Changed

- Soft buttons now use the same light tint as soft badges, with consistent hover and pressed shades.

## [1.0.1] - 2026-11-17

### Changed

- The fallback `primary` palette (used when no Color Theme Studio `theme.css` is imported) is now the noofpi brand green (`#effaf5` to `#0a2a1f`). The previous, more saturated green made the hover and pressed fills of the outline, ghost, subtle and soft variants look too heavy.
- The `noofpi` theme in the playground `theme.css` uses the same palette.

## [1.0.0] - 2026-11-17

### Added

- First release: Tailwind v4 components for noofpi, auto-imported through the `noofpi-ui/vite` plugin and themed with `--ui-*` CSS variables and Color Theme Studio.
