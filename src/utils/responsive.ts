export const BREAKPOINTS = ["sm", "md", "lg", "xl", "2xl"] as const;

export type Breakpoint = (typeof BREAKPOINTS)[number];

/** A value, or a value per Tailwind breakpoint (mobile first): `{ base: "sm", md: "lg" }` */
export type Responsive<T extends string | boolean> =
  T | ({ base?: T } & { [K in Breakpoint]?: T });

/** Classes of a responsive value: `{ base: "sm", md: "lg" }` -> `["n-size-sm", "md:n-size-lg"]` */
export function responsiveClasses<T extends string | boolean>(
  value: Responsive<T>,
  toClass: (value: T) => string,
): string[] {
  if (typeof value !== "object") return [toClass(value)];
  const classes: string[] = [];
  if (value.base !== undefined) classes.push(toClass(value.base));
  for (const breakpoint of BREAKPOINTS) {
    const at = value[breakpoint];
    if (at !== undefined) classes.push(`${breakpoint}:${toClass(at)}`);
  }
  return classes;
}
