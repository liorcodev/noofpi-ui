<div align="center">

<img src="./assets/logo.svg" alt="noofpi-ui logo" width="96" height="96">

# noofpi-ui

Tailwind (v4) components for [noofpi](https://www.npmjs.com/package/noofpi)

Built like Nuxt UI: auto-imported `N*` components, styled by CSS variables you can override, themed by [Color Theme Studio](https://liorcodev.github.io/color-theme-studio/docs).

[![npm version](https://img.shields.io/npm/v/noofpi-ui.svg)](https://www.npmjs.com/package/noofpi-ui) [![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)

</div>

## Install

```sh
bun add noofpi-ui
```

Requires `noofpi` with `tailwind: true`, plus the peer dependencies `tailwindcss` (>=4.3), `vite` (>=7) and `vue` (>=3.5). The package ships `.vue` source, so it must be compiled by your Vite build.

## Setup

Add the Vite plugin in `noofpi.config.ts`. It auto-imports the `N*` components in templates, bundles `noofpi-ui` for SSR and writes component types to `.noofpi/ui-components.d.ts`.

```ts
import { defineNoofpiConfig } from "noofpi";
import { noofpiUi } from "noofpi-ui/vite";

export default defineNoofpiConfig({
  tailwind: true,
  vite: { plugins: [noofpiUi()] },
});
```

Import the styles in your main CSS file, after Tailwind:

```css
@import "tailwindcss";

/* Color Theme Studio export (--color-theme-50 ... 950) */
@import "./theme.css";
@import "noofpi-ui";

@custom-variant dark (&:where(.dark, .dark *));
```

Without a Color Theme Studio export, the primary color falls back to noofpi's green.

## Usage

```vue
<template>
  <NCard>
    <NButton>Save</NButton>
  </NCard>
</template>
```

Components are auto-imported, no `import` needed.

## Theming

Components are styled by `--ui-*` CSS variables. Override them with plain CSS after the import:

```css
:root {
  --ui-primary-500: var(--color-brand-500);
}
```

## Documentation

https://liorcodev.github.io/noofpi-ui-docs/
