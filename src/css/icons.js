import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import iconify from "@iconify/tailwind4";
import plugin from "tailwindcss/plugin";

// Tailwind plugin: every installed `@iconify-json/<set>` becomes `i-<set>-<icon>` classes (`i-lucide-plus`).
// Only the icons used in your code are emitted. Lucide ships with noofpi-ui; any other set just needs installing.

const parents = (dir) => {
  const dirs = [];
  for (let current = dir; ; current = path.dirname(current)) {
    dirs.push(current);
    if (path.dirname(current) === current) return dirs;
  }
};

function findIconSets() {
  const roots = new Set([
    ...parents(process.cwd()),
    ...parents(path.dirname(fileURLToPath(import.meta.url))),
  ]);
  const sets = new Map();
  for (const root of roots) {
    const dir = path.join(root, "node_modules", "@iconify-json");
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const source = path.join(dir, name, "icons.json");
      if (!sets.has(name) && existsSync(source)) sets.set(name, source);
    }
  }
  return sets;
}

export default plugin((api) =>
  iconify({
    prefix: false,
    prefixes: [...findIconSets()].map(([prefix, source]) => ({
      prefix,
      source,
    })),
    iconSelector: ".i-{prefix}-{name}",
    maskSelector: "",
    backgroundSelector: "",
  }).handler(api),
);
