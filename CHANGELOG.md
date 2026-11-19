# Changelog

All notable changes to noofpi-ui are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `NAuthForm`: a `clear` prop. Toggling it empties the inputs and clears the errors, e.g. after a failed sign in. With `form` it calls that form's `reset()`.
- `NAuthForm`: `AuthField` accepts `icon` and `trailingIcon`, shown before and after the text of the input.
- `NAuthForm`: `AuthField` accepts `revealable` on a `password` field, which adds an eye button that shows or hides the text.

### Fixed

- `NFileExplorer`: toolbar actions, including Sort and List/Grid view controls, wrap without overflowing on mobile.

## [1.4.1] - 2026-11-19

### Fixed

- `NFileExplorer`: a click no longer selects an item. Folders and files open with a double click or `Enter`. Ctrl/Cmd-click, Shift-click and `Space` still select.
- `NFileExplorer`: starting a drag no longer selects the dragged item. It still moves that item, or the whole selection if the item is already selected.
- `NFileExplorer`: dragging several selected items shows one stacked "N items" badge beside the pointer instead of only the row under it.
- `NFileExplorer`: using any toolbar button (New folder, Paste, Upload, Select, Sort, List or Grid view) clears the selection.
- `NFileExplorer`: the Sort menu is shown in the list view too, not only in the grid, and every row has its own icon with the current choice in the primary color and a check at the end.

### Added

- `NFileExplorer`: a Select button in the toolbar (`v-model:selecting`) turns on click-to-select. While it is on, the button reads Done in the primary color, the explorer gets a primary outline and rows show a pointer cursor. Turning it off clears the selection.

## [1.4.0] - 2026-11-19

### Added

- `NContextMenu`: wraps an area and opens a menu at the pointer on right click, on long press for touch, and with `Shift+F10` or the context menu key. It takes the same `items` as `NMenu` and stays inside the viewport.
- `NPopover`: anchored floating panel with `click`, `hover` or `manual` triggers, 12 placements that flip and shift to stay in the viewport, optional arrow, `offset`, `delay` and `hideDelay`, `maxWidth`, dismissal on `Escape` or outside interaction, teleport target, and `v-model:open`.
- `NTree`: accessible, keyboard-navigable tree with single or multiple selection, `checkable` checkboxes, search, lazy `loadChildren`, `droppable` rows, and `v-model` for `selected`, `expanded`, `checked` and `search`. Items support `description`, `icon`, `badge` and `disabled`.
- `NFileExplorer`: file manager with list and grid views, a folder tree, breadcrumbs, search, sorting by name, size or modified (folders first), multi-select, drag-and-drop moves, lazy folder loading, and an optional Upload button that also accepts files dropped from the computer. Built-in actions (`new-folder`, `download`, `copy`, `cut`, `paste`, `rename`, `delete`) are configurable with `actions`. It only reports changes: `open`, `rename`, `delete`, `download`, `upload`, `move`, `copy`, `create-folder` and `load` are events you apply to `items`.
- Exported types and constants: `ContextMenuProps`, `PopoverProps`, `PopoverPlacement`, `PopoverTrigger`, `POPOVER_PLACEMENTS`, `POPOVER_TRIGGERS`, `TreeItem`, `TreeProps`, `TreeSelection`, `TreeValue`, `FileItem`, `FileExplorerProps`, `FileExplorerView`, `FileExplorerSort`, `FileExplorerSortKey`, `FileExplorerSortDirection`, `FileExplorerAction`, `FILE_EXPLORER_SORT_KEYS` and `FILE_EXPLORER_ACTIONS`.
- `NContextMenu`, `NPopover`, `NTree` and `NFileExplorer` are auto-imported by the `noofpi-ui/vite` plugin and their styles are included in `index.css`.

### Changed

- `NHeader`, `NSidebar` and `NFooter` mark only one link as current. A link matching the current URL takes priority over the `active` fallback, so a stale `active: true` no longer stays highlighted next to the real page. `NFooter` now marks its current link too (`aria-current="page"`, `data-active`).

- `NAuthForm` is generic over its `schema`: the `submit` event carries the schema's output type instead of `unknown`, so a handler typed with `z.infer<typeof schema>` no longer fails type checking. Without a `schema`, or with a `form`, the payload is still `unknown`.

## [1.3.0] - 2026-11-18

### Added

- `secondary` follows the Color Theme Studio export: `--ui-secondary-*` reads `--color-theme-secondary-50` … `--color-theme-secondary-950` (set via the studio's Secondary Color panel) and switches with `ColorTheme.change()` like `primary`. Without them it stays blue.

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
