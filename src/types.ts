import type { Component, Ref } from "vue";
import type { Responsive } from "./utils/responsive";

export const BUTTON_SIZES = [
  "xxs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "xxl",
] as const;
export const BUTTON_VARIANTS = [
  "solid",
  "outline",
  "soft",
  "subtle",
  "ghost",
  "link",
] as const;
export const BUTTON_COLORS = [
  "primary",
  "secondary",
  "neutral",
  "success",
  "info",
  "warning",
  "error",
] as const;
export const BUTTON_SHAPES = ["rounded", "square", "pill", "circle"] as const;

export type ButtonSize = (typeof BUTTON_SIZES)[number];
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
export type ButtonColor = (typeof BUTTON_COLORS)[number];
export type ButtonShape = (typeof BUTTON_SHAPES)[number];

/** An Iconify class (`i-lucide-search`), any other icon class name (`fa-solid fa-user`), or a Vue component */
export type ButtonIcon = string | Component;

export interface IconProps {
  /** An Iconify class (`i-lucide-search`), any other icon class name, or a Vue component */
  name: ButtonIcon;
  /** Accessible name. Without it the icon is decorative (`aria-hidden`) */
  label?: string;
}

export const AVATAR_SIZES = BUTTON_SIZES;
export const AVATAR_SHAPES = ["circle", "rounded", "square"] as const;

export type AvatarSize = ButtonSize;
export type AvatarShape = (typeof AVATAR_SHAPES)[number];

export interface AvatarProps {
  /** Image URL. If it fails to load, the fallback (`icon`, `text`, or the initials of `alt`) is shown */
  src?: string;
  /** Accessible name; also the source of the initials when there's no `text` */
  alt?: string;
  /** Fallback text, shown as is (e.g. `"JD"`) */
  text?: string;
  /** Fallback icon, used when there's no `text` or `alt` */
  icon?: ButtonIcon;
  /** Default: `"md"` */
  size?: AvatarSize;
  /** Default: `"circle"` */
  shape?: AvatarShape;
  /** Color of the fallback. Default: `"neutral"` */
  color?: ButtonColor;
  /** Adds a border in `color`. Default: `false` */
  bordered?: boolean;
}

export const PAGE_HEADER_SIZES = ["sm", "md", "lg"] as const;

export type PageHeaderSize = (typeof PAGE_HEADER_SIZES)[number];

export interface PageHeaderProps {
  /** Element or component to render, e.g. `"header"`. Default: `"div"` */
  as?: string | Component;
  title?: string;
  /** Text under the title */
  description?: string;
  /** Icon in a gradient tile before the title */
  icon?: ButtonIcon;
  /** Color of the icon tile. Default: `"primary"` (the Color Theme Studio theme) */
  color?: ButtonColor;
  /** Default: `"md"` */
  size?: PageHeaderSize;
  /** Element of the title. Default: `"h1"` */
  headingAs?: string;
}

export const HERO_PAGE_LAYOUTS = ["vertical", "horizontal"] as const;

export type HeroPageLayout = (typeof HERO_PAGE_LAYOUTS)[number];

export interface HeroPageProps {
  /** Element or component to render, e.g. `"header"`. Default: `"section"` */
  as?: string | Component;
  /** Small text above the title */
  eyebrow?: string;
  title?: string;
  /** Text under the title */
  description?: string;
  /** Image URL. Shown under the text (vertical) or beside it (horizontal) */
  image?: string;
  /** Alt text of the image. Default: `""` (decorative) */
  imageAlt?: string;
  /** `"vertical"` stacks and centers; `"horizontal"` puts the text and the image side by side. Default: `"vertical"` */
  layout?: HeroPageLayout;
  /** Horizontal layout only: put the image before the text. Default: `false` */
  reverse?: boolean;
  /** Element of the title. Default: `"h1"` */
  headingAs?: string;
}

export const MARQUEE_SIZES = ["sm", "md", "lg"] as const;

export type MarqueeSize = (typeof MARQUEE_SIZES)[number];

export const MARQUEE_ORIENTATIONS = ["horizontal", "vertical"] as const;

export type MarqueeOrientation = (typeof MARQUEE_ORIENTATIONS)[number];

export interface MarqueeItem {
  /** Logo image URL */
  src?: string;
  /** Alt text of the logo. Default: `""` (decorative) */
  alt?: string;
  /** Text shown next to (or instead of) the logo */
  label?: string;
  /** Makes the item a link */
  href?: string;
  /** Link target, e.g. `"_blank"` */
  target?: string;
}

export interface MarqueeProps {
  /** Element or component to render, e.g. `"section"`. Default: `"div"` */
  as?: string | Component;
  /** Logos to scroll. Use the default slot for custom content instead */
  items?: MarqueeItem[];
  /** Seconds for one full loop, a bigger number is slower. Default: `40` */
  duration?: number;
  /** Scroll the other way. Default: `false` */
  reverse?: boolean;
  /** Pause while hovered or focused. Default: `true` */
  pauseOnHover?: boolean;
  /** Fade the edges out. Default: `true` */
  fade?: boolean;
  /** Mute the logos until hovered. Default: `true` */
  grayscale?: boolean;
  /** Show every logo in black and white (color returns on hover). Default: `false` */
  monochrome?: boolean;
  /** Logo height. Default: `"md"`. Responsive: `{ base: "sm", md: "lg" }` */
  size?: Responsive<MarqueeSize>;
  /** `"vertical"` scrolls up (the element needs a height). Default: `"horizontal"` */
  orientation?: MarqueeOrientation;
  /** Accessible name of the region */
  label?: string;
}

export const BLOB_BLENDS = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "soft-light",
  "lighten",
  "color-dodge",
  "plus-lighter",
] as const;

export type BlobBlend = (typeof BLOB_BLENDS)[number];

export const BLOB_FORMS = ["organic", "circle"] as const;

export type BlobForm = (typeof BLOB_FORMS)[number];

export interface BlobsProps {
  /** Element or component to render, e.g. `"section"`. Default: `"div"` */
  as?: string | Component;
  /** How many blobs, 0 to 60. Default: `5` */
  count?: number;
  /** Colors the blobs cycle through: a `ButtonColor` name (`"primary"`, `"secondary"`, ...) or any CSS color. Default: `["primary", "secondary"]` */
  colors?: string[];
  /** Shade (50 to 950) used for color names. Default: `500` */
  shade?: number;
  /** Smallest blob, as a percentage of the width. Default: `30` */
  minSize?: number;
  /** Biggest blob, as a percentage of the width. Default: `60` */
  maxSize?: number;
  /** Blur in px. Default: `60` */
  blur?: number;
  /** 0 to 1. Default: `0.6` */
  opacity?: number;
  /** How blobs mix with what's behind them (CSS `mix-blend-mode`). Default: `"normal"` */
  blend?: BlobBlend;
  /** `"organic"` gives each blob its own irregular outline. Default: `"organic"` */
  form?: BlobForm;
  /** Fill each blob with a soft gradient instead of a flat color. Default: `false` */
  gradient?: boolean;
  /** Same seed, same layout (also on the server). Change it to roll a new design. Default: `1` */
  seed?: number;
  /** Drift slowly. Stopped by `prefers-reduced-motion`. Default: `true` */
  animate?: boolean;
  /** Seconds of one drift, a bigger number is slower. Default: `24` */
  duration?: number;
}

export const SHAPE_KINDS = [
  "circle",
  "ring",
  "square",
  "squircle",
  "triangle",
  "diamond",
  "pentagon",
  "hexagon",
  "octagon",
  "star",
  "sparkle",
  "plus",
  "cross",
  "asterisk",
  "semicircle",
  "quarter",
  "crescent",
  "arc",
  "wave",
  "zigzag",
  "bars",
  "dots",
] as const;

export type ShapeKind = (typeof SHAPE_KINDS)[number];

export const SHAPE_VARIANTS = ["fill", "outline", "mixed"] as const;

export type ShapeVariant = (typeof SHAPE_VARIANTS)[number];

export const SHAPE_ANIMATIONS = ["float", "spin", "pulse", "none"] as const;

export type ShapeAnimation = (typeof SHAPE_ANIMATIONS)[number];

export const SHAPE_LAYOUTS = ["even", "random"] as const;

export type ShapeLayout = (typeof SHAPE_LAYOUTS)[number];

export interface ShapesProps {
  /** Element or component to render, e.g. `"section"`. Default: `"div"` */
  as?: string | Component;
  /** Shapes to pick from. Default: all of `SHAPE_KINDS` */
  shapes?: ShapeKind[];
  /** How many shapes, 0 to 200. Default: `14` */
  count?: number;
  /** Colors the shapes cycle through: a `ButtonColor` name or any CSS color. Default: `["primary", "secondary"]` */
  colors?: string[];
  /** Shade (50 to 950) used for color names. Default: `500` */
  shade?: number;
  /** Smallest shape, in px. Default: `24` */
  minSize?: number;
  /** Biggest shape, in px. Default: `72` */
  maxSize?: number;
  /** `"mixed"` picks fill or outline per shape. Lines (`wave`, `zigzag`, ...) are always strokes. Default: `"outline"` */
  variant?: ShapeVariant;
  /** Outline thickness in px. Default: `2` */
  strokeWidth?: number;
  /** 0 to 1. Default: `0.5` */
  opacity?: number;
  /** Blur in px, for a depth-of-field look. Default: `0` */
  blur?: number;
  /** Turn each shape to a random angle. Default: `true` */
  rotate?: boolean;
  /** `"even"` spreads the shapes over the area, `"random"` scatters them freely. Default: `"even"` */
  layout?: ShapeLayout;
  /** Same seed, same layout (also on the server). Default: `1` */
  seed?: number;
  /** Default: `"float"`. Stopped by `prefers-reduced-motion` */
  animation?: ShapeAnimation;
  /** Seconds of one cycle, a bigger number is slower. Default: `14` */
  duration?: number;
}

export interface UserProps {
  /** Element or component to render, e.g. `"li"` or `NoofpiLink`. Default: `"div"` */
  as?: string | Component;
  name?: string;
  /** Text under the name, e.g. an email or a date */
  description?: string;
  /** Props of the avatar (`NAvatar`). Without it no avatar is shown. `alt` defaults to `name` */
  avatar?: AvatarProps;
  /** Size of the avatar and the text. Default: `"md"` */
  size?: AvatarSize;
}

export const BADGE_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const BADGE_VARIANTS = ["solid", "outline", "soft", "subtle"] as const;

export type BadgeSize = (typeof BADGE_SIZES)[number];
export type BadgeVariant = (typeof BADGE_VARIANTS)[number];

export interface BadgeProps {
  /** Element or component to render, e.g. `"a"` or `NoofpiLink`. Default: `"span"` */
  as?: string | Component;
  label?: string | number;
  /** Default: `"solid"` */
  variant?: BadgeVariant;
  /** Default: `"primary"` (the Color Theme Studio theme) */
  color?: ButtonColor;
  /** Default: `"md"` */
  size?: BadgeSize;
  /** Fully rounded ends. Default: `false` */
  pill?: boolean;
  /** Leading icon */
  icon?: ButtonIcon;
  /** Trailing icon */
  trailingIcon?: ButtonIcon;
}

export const CARD_VARIANTS = ["outline", "solid", "soft", "subtle"] as const;

export type CardVariant = (typeof CARD_VARIANTS)[number];

export interface CardProps {
  /** Element or component to render, e.g. `"article"` or `NoofpiLink`. Default: `"div"` */
  as?: string | Component;
  /** Default: `"outline"` */
  variant?: CardVariant;
  /** Default: `"neutral"` */
  color?: ButtonColor;
}

export const EMPTY_STATE_SIZES = ["sm", "md", "lg"] as const;
export type EmptyStateSize = (typeof EMPTY_STATE_SIZES)[number];
export type EmptyStateAction = ButtonProps & {
  onClick?: (event: MouseEvent) => void;
};

export interface EmptyStateProps {
  /** Element or component to render. Default: `"div"` */
  as?: string | Component;
  title?: string;
  description?: string;
  /** Leading illustration icon */
  icon?: ButtonIcon;
  /** Accent color. Default: `"primary"` */
  color?: ButtonColor;
  /** Default: `"md"` */
  size?: EmptyStateSize;
  /** Action buttons */
  actions?: EmptyStateAction[];
}

export interface CommandItem {
  /** Stable value used as the default item key */
  value?: string | number;
  label: string;
  description?: string;
  /** Consecutive items with the same group render under one heading */
  group?: string;
  icon?: ButtonIcon;
  keywords?: string[];
  shortcut?: string;
  disabled?: boolean;
  /** `event.preventDefault()` keeps the palette open */
  onSelect?: (event: Event) => void;
}

export interface CommandPaletteProps {
  items?: readonly CommandItem[];
  placeholder?: string;
  label?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  closeLabel?: string;
  dismissible?: boolean;
  /** Filter label, description, group and keywords locally. Default: `true` */
  filter?: boolean;
  /** Open state (`v-model:open`) */
  open?: boolean;
  /** Search text (`v-model:search`) */
  search?: string;
}

export interface FileUploadError {
  type: "accept" | "size" | "count";
  file?: File;
  message: string;
}

export interface FileUploadProps {
  /** Native `accept` filter */
  accept?: string;
  multiple?: boolean;
  /** Maximum bytes per file */
  maxSize?: number;
  /** Maximum accepted files when `multiple` is enabled */
  maxFiles?: number;
  disabled?: boolean;
  name?: string;
  label?: string;
  browseLabel?: string;
  dropLabel?: string;
  description?: string;
  invalid?: boolean;
  removeLabel?: string;
  icon?: ButtonIcon;
  /** Selected files (`v-model`) */
  modelValue?: File[];
}

export const STAT_TRENDS = ["up", "down", "neutral"] as const;

export type StatTrend = (typeof STAT_TRENDS)[number];

export interface StatProps {
  /** Element or component to render, e.g. `"article"` or `NoofpiLink`. Default: `"div"` */
  as?: string | Component;
  label?: string;
  value?: string | number;
  /** Text under the value, e.g. `"vs last month"` */
  description?: string;
  /** Icon shown in a tinted tile next to the label */
  icon?: ButtonIcon;
  /** Color of the icon tile. Default: `"primary"` (the Color Theme Studio theme) */
  color?: ButtonColor;
  /** Arrow and color of the description: `"up"` is green, `"down"` is red */
  trend?: StatTrend;
}

export const PROGRESS_SIZES = ["xs", "sm", "md", "lg"] as const;

export type ProgressSize = (typeof PROGRESS_SIZES)[number];

export interface ProgressProps {
  /** Element or component to render, e.g. `"section"`. Default: `"div"` */
  as?: string | Component;
  /** Current value, from `0` to `max`. Without it the bar is indeterminate (an animation) */
  value?: number;
  /** Value at which the bar is full. Default: `100` */
  max?: number;
  /** Text above the bar, also its accessible name */
  label?: string;
  /** Shows the percentage at the end of the label row. Default: `false` */
  showValue?: boolean;
  /** Default: `"primary"` (the Color Theme Studio theme) */
  color?: ButtonColor;
  /** Default: `"md"` */
  size?: ProgressSize;
}

export const ALERT_VARIANTS = ["solid", "outline", "soft", "subtle"] as const;
export type AlertVariant = (typeof ALERT_VARIANTS)[number];

/** A button under the alert's text: any `NButton` prop, plus a click handler */
export type AlertAction = ButtonProps & {
  onClick?: (event: MouseEvent) => void;
};

export interface AlertProps {
  /** Element or component to render, e.g. `"section"`. Default: `"div"` */
  as?: string | Component;
  title?: string;
  description?: string;
  /** Leading icon. Defaults to one matching `color` (none for `primary` and `neutral`) */
  icon?: ButtonIcon;
  /** Default: `"primary"` (the Color Theme Studio theme) */
  color?: ButtonColor;
  /** Default: `"soft"` */
  variant?: AlertVariant;
  /** Shows a close button that emits `close`. Default: `false` */
  close?: boolean;
  /** Replaces the close button's `i-lucide-x` icon */
  closeIcon?: ButtonIcon;
  /** Accessible name of the close button. Default: `"Close"` */
  closeLabel?: string;
  actions?: AlertAction[];
}

export const SKELETON_SHAPES = ["text", "rect", "circle"] as const;
export type SkeletonShape = (typeof SKELETON_SHAPES)[number];

export interface SkeletonProps {
  /** Element or component to render, e.g. `"li"`. Default: `"div"` */
  as?: string | Component;
  /** Default: `"rect"` */
  shape?: SkeletonShape;
  /** A CSS length, or a number in pixels. `circle` uses it as the diameter */
  width?: string | number;
  /** A CSS length, or a number in pixels */
  height?: string | number;
  /** Number of text lines, the last one shorter. Only for `shape="text"`. Default: `1` */
  lines?: number;
  /** Pulses the placeholder. Default: `true` */
  animated?: boolean;
  /** Accessible name announced while loading. Without it the placeholder is hidden from assistive technology */
  label?: string;
}

export interface LoadingIndicatorProps {
  /** `true` starts the bar, `false` completes it. Left out, it follows the page load */
  loading?: boolean;
  /** Controls the bar from `0` to `100` instead of the automatic trickle */
  value?: number;
  /** Default: `"primary"` (the Color Theme Studio theme) */
  color?: ButtonColor;
  /** Accessible name of the bar. Default: `"Loading page"` */
  label?: string;
}

export const DATA_LIST_SIZES = ["sm", "md", "lg"] as const;

export type DataListSize = (typeof DATA_LIST_SIZES)[number];

export interface DataListItem {
  /** Name of the row, muted, at the start */
  label: string;
  /** Value of the row, emphasized, at the end */
  value?: string | number;
}

export interface DataListProps {
  /** Element or component to render, e.g. `"section"`. Default: `"div"` */
  as?: string | Component;
  /** Heading above the rows */
  title?: string;
  /** Icon shown in a tinted tile next to the title */
  icon?: ButtonIcon;
  /** Color of the icon tile. Default: `"primary"` (the Color Theme Studio theme) */
  color?: ButtonColor;
  items?: DataListItem[];
  /** Default: `"md"` */
  size?: DataListSize;
  /** Lines between the rows. Default: `true` */
  divided?: boolean;
}

export const TABLE_SIZES = ["sm", "md", "lg"] as const;
export const TABLE_BORDERS = ["none", "sm", "md", "lg"] as const;
export const TABLE_BREAKPOINTS = ["sm", "md", "lg", "xl"] as const;
export const TABLE_ALIGNS = ["start", "center", "end"] as const;
export const TABLE_SORT_DIRECTIONS = ["asc", "desc"] as const;

export type TableSize = (typeof TABLE_SIZES)[number];
export type TableBorder = (typeof TABLE_BORDERS)[number];
export type TableBreakpoint = (typeof TABLE_BREAKPOINTS)[number];
export type TableAlign = (typeof TABLE_ALIGNS)[number];
export type TableSortDirection = (typeof TABLE_SORT_DIRECTIONS)[number];

export type TableRow = Record<string, unknown>;

export interface TableColumn {
  /** Key of the value in each row. Also names the slots `cell-<key>` and `header-<key>` */
  key: string;
  /** Header text. Also the label of the cell when the table is stacked */
  label?: string;
  /** Text alignment, `"start"` follows the writing direction (RTL aware). Default: `"start"` */
  align?: TableAlign;
  /** Header becomes a button that sorts by this column */
  sortable?: boolean;
  /** CSS width of the column, e.g. `"8rem"` */
  width?: string;
  /** Hides the column below this breakpoint */
  hideBelow?: TableBreakpoint;
  /** Keeps the text of the cells on one line */
  nowrap?: boolean;
}

export interface TableSort {
  key: string;
  direction: TableSortDirection;
}

export interface TableProps {
  /** Element or component to render, e.g. `"section"`. Default: `"div"` */
  as?: string | Component;
  columns: TableColumn[];
  data?: TableRow[];
  /** Key in the row, or a function, that identifies it. Default: the row's index */
  rowKey?: string | ((row: TableRow, index: number) => string | number);
  /** Title of the table, shown above it and used as its accessible name */
  caption?: string;
  /** Default: `"md"` */
  size?: TableSize;
  /** Strength of the outer border and the lines between rows: `"none"` removes them, `"sm"` `"md"` `"lg"` get stronger. Default: `"sm"` */
  border?: TableBorder;
  /** Alternating row backgrounds. Default: `false` */
  striped?: boolean;
  /** Highlights the row under the pointer. Default: `true` */
  hoverable?: boolean;
  /** Below this breakpoint every row becomes a card of `label: value` lines instead of scrolling sideways */
  stackBelow?: TableBreakpoint;
  /** CSS max height of the table; the header stays in view while the rows scroll, e.g. `"24rem"` */
  maxHeight?: string;
  /** Shows a spinner instead of the empty message, and dims the rows */
  loading?: boolean;
  /** Accessible name of the table when it has no `caption`. Default: `"Table"` */
  label?: string;
  /** Text shown when there are no rows. Default: `"No data"` */
  empty?: string;
  /** Text shown while loading without rows. Default: `"Loading…"` */
  loadingLabel?: string;
  /** Rows get a pointer, can be focused and emit `rowClick`. Default: `false` */
  clickable?: boolean;
  /** Sorted column (`v-model:sort`) */
  sort?: TableSort;
  /** The `data` is already sorted (e.g. by the server); the table only reports `update:sort`. Default: `false` */
  manualSort?: boolean;
}

export const CHIP_SIZES = BUTTON_SIZES;
export const CHIP_POSITIONS = [
  "top-right",
  "top-left",
  "bottom-right",
  "bottom-left",
] as const;

export type ChipSize = ButtonSize;
export type ChipPosition = (typeof CHIP_POSITIONS)[number];

export interface ChipProps {
  /** Text or count shown in the chip. Without it the chip is a dot */
  text?: string | number;
  /** Default: `"primary"` (the Color Theme Studio theme) */
  color?: ButtonColor;
  /** Default: `"md"` */
  size?: ChipSize;
  /** Corner of the content the chip sits on. Default: `"top-right"` */
  position?: ChipPosition;
  /** Moves the chip inside the content's box, for content that clips its overflow. Default: `false` */
  inset?: boolean;
  /** Renders just the chip, without wrapping content or positioning. Default: `false` */
  standalone?: boolean;
  /** Hides the chip when `false`. Default: `true` */
  show?: boolean;
}

export interface ButtonProps {
  /** Element or component to render, e.g. `"a"` or `NoofpiLink`. Default: `"button"` */
  as?: string | Component;
  /** Native `type` of a `<button>`. Default: `"button"` */
  type?: "button" | "submit" | "reset";
  label?: string;
  /** Default: `"solid"` */
  variant?: ButtonVariant;
  /** Default: `"primary"` (the Color Theme Studio theme) */
  color?: ButtonColor;
  /** Default: `"md"`. Responsive: `{ base: "sm", md: "lg" }` */
  size?: Responsive<ButtonSize>;
  /** Default: `"rounded"`. Responsive: `{ base: "rounded", md: "pill" }` */
  shape?: Responsive<ButtonShape>;
  /** Full width. Responsive: `{ base: true, md: false }` */
  block?: Responsive<boolean>;
  /** Leading icon */
  icon?: ButtonIcon;
  /** Trailing icon */
  trailingIcon?: ButtonIcon;
  /** Shows a spinner instead of the leading icon and disables the button */
  loading?: boolean;
  /** Replaces the built-in spinner */
  loadingIcon?: ButtonIcon;
  disabled?: boolean;
}

export const HEADER_SHADOWS = [
  "none",
  "sm",
  "md",
  "lg",
  "xl",
  "scroll",
] as const;
export const HEADER_BREAKPOINTS = ["sm", "md", "lg", "xl"] as const;
export const HEADER_NAV_ALIGNS = ["left", "center", "right"] as const;

/** `"scroll"` adds a `md` shadow once the page is scrolled */
export type HeaderShadow = (typeof HEADER_SHADOWS)[number];
export type HeaderBreakpoint = (typeof HEADER_BREAKPOINTS)[number];
export type HeaderNavAlign = (typeof HEADER_NAV_ALIGNS)[number];

export interface HeaderItem {
  label: string;
  /** Link target: `href` of an `<a>`, or `to` of `linkAs` (e.g. `NuxtLink`) */
  to?: string;
  icon?: ButtonIcon;
  /** Fallback current-page marker. A matching URL takes priority, so a stale fallback does not stay active. */
  active?: boolean;
  disabled?: boolean;
  target?: string;
}

export interface HeaderButton extends ButtonProps {
  /** Link target, like `HeaderItem.to`. Renders the button as `linkAs` */
  to?: string;
  /** Required for an icon-only button */
  "aria-label"?: string;
  onClick?: (event: MouseEvent) => void;
}

export interface HeaderProps {
  /** Brand text next to the logo */
  title?: string;
  /** Logo icon: an Iconify class, other class name, or a Vue component. Use the `logo` slot for an image */
  logo?: ButtonIcon;
  /** Where the logo links to. Default: `"/"` */
  to?: string;
  /** Navigation links */
  items?: HeaderItem[];
  /** Buttons on the right. They stay in the bar on phones too; only the navigation goes in the mobile menu */
  buttons?: HeaderButton[];
  /** Default: `false`. `true` is `"md"` */
  shadow?: boolean | HeaderShadow;
  /** Stick to the top of the viewport. Default: `false` */
  sticky?: boolean;
  /** Bottom border. Default: `true` */
  border?: boolean;
  /** Keeps the content within `--n-header-max-w` (80rem) and centers it. Default: `true` */
  container?: boolean;
  /** Width from which the navigation is shown instead of the menu button. Default: `"md"` */
  breakpoint?: HeaderBreakpoint;
  /** Where the navigation sits in the bar: next to the logo, centered between the logo and the buttons, or next to the buttons. Default: `"left"` */
  navAlign?: HeaderNavAlign;
  /** Element or component of the links, e.g. `NuxtLink`. Default: `"a"` */
  linkAs?: string | Component;
  /** Accessible name of the navigation. Default: `"Main"` */
  navLabel?: string;
  /** Accessible name of the menu button. Default: `"Menu"` */
  menuLabel?: string;
  /** Accessible name of the sidebar button, shown inside an `NDashboard`. Default: `"Sidebar"` */
  sidebarLabel?: string;
  /** Icon of the sidebar button while the sidebar is closed, shown inside an `NDashboard`. Default: `"i-lucide-panel-left"` */
  sidebarIcon?: ButtonIcon;
  /** Icon of the sidebar button while the sidebar is open. Default: `"i-lucide-panel-left-close"` */
  sidebarOpenIcon?: ButtonIcon;
  /** Mobile menu state (`v-model:open`) */
  open?: boolean;
}

export const DASHBOARD_BREAKPOINTS = ["sm", "md", "lg", "xl"] as const;

export type DashboardBreakpoint = (typeof DASHBOARD_BREAKPOINTS)[number];

export interface DashboardProps {
  /** Width from which the sidebar is always visible instead of opened by the header's button. Default: `"lg"` */
  breakpoint?: DashboardBreakpoint;
  /** Mobile sidebar state (`v-model:open`) */
  open?: boolean;
}

export interface SidebarGroup {
  /** Heading of the group */
  label?: string;
  items: HeaderItem[];
}

export interface SidebarProps {
  /** Links shown first, without a heading */
  items?: HeaderItem[];
  /** Links under headings */
  groups?: SidebarGroup[];
  /** Right border. Default: `true` */
  border?: boolean;
  /** Shows a button that collapses the sidebar to a rail of icons. In an `NDashboard` only from its breakpoint up. Default: `false` */
  collapsible?: boolean;
  /** Collapsed state (`v-model:collapsed`), only used with `collapsible`. Default: `false` */
  collapsed?: boolean;
  /** Element or component of the links, e.g. `NuxtLink`. Default: `"a"` */
  linkAs?: string | Component;
  /** Accessible name of the navigation. Default: `"Sidebar"` */
  label?: string;
  /** Accessible name of the collapse button. Default: `"Collapse sidebar"` */
  collapseLabel?: string;
  /** Accessible name of the expand button. Default: `"Expand sidebar"` */
  expandLabel?: string;
}

export const FOOTER_BRAND_ALIGNS = ["left", "right"] as const;
export const FOOTER_COPYRIGHT_ALIGNS = ["left", "center", "right"] as const;

/** Which side of the link columns the brand sits on, once the footer is at least `28rem` wide. Narrower, everything is centered */
export type FooterBrandAlign = (typeof FOOTER_BRAND_ALIGNS)[number];
export type FooterCopyrightAlign = (typeof FOOTER_COPYRIGHT_ALIGNS)[number];

export interface FooterColumn {
  title?: string;
  items: HeaderItem[];
}

export type FooterButton = HeaderButton;

export interface FooterProps {
  /** Brand text next to the logo */
  title?: string;
  /** Logo icon: an Iconify class, other class name, or a Vue component. Use the `brand` slot for an image */
  logo?: ButtonIcon;
  /** Where the logo links to. Default: `"/"` */
  to?: string;
  /** Short text under the brand */
  description?: string;
  /** Link columns, side by side */
  columns?: FooterColumn[];
  /** Icon buttons under the brand, e.g. social links */
  buttons?: FooterButton[];
  /** Text of the bottom bar */
  copyright?: string;
  /** Which side of the columns the brand sits on, once the footer is at least `28rem` wide. Default: `"left"` */
  brandAlign?: FooterBrandAlign;
  /** Where the copyright sits once the footer is at least `28rem` wide (it's centered below that). Default: `"left"` */
  copyrightAlign?: FooterCopyrightAlign;
  /** Top border. Default: `true` */
  border?: boolean;
  /** Keeps the content within `--n-footer-max-w` (`80rem`) and centers it. Default: `true` */
  container?: boolean;
  /** Element or component of the links, e.g. `NuxtLink`. Default: `"a"` */
  linkAs?: string | Component;
}

/** The part of a Zod issue that `NForm` reads */
export interface FormIssue {
  path: readonly PropertyKey[];
  message: string;
}

/** Messages by field path (`"user.email"`, `"tags.0"`); issues about the whole value are under `""`. Same as noofpi's */
export type FormErrors = Record<string, string[]>;

/** Any schema with a Zod-style `safeParse` (Zod 3 and 4) */
export interface FormSchema<T> {
  safeParse(
    value: unknown,
  ):
    | { success: true; data: T }
    | { success: false; error: { issues: readonly FormIssue[] } };
}

/** What `NForm` needs from noofpi's `useDoofpiForm()` result */
export interface NoofpiFormLike {
  errors: Ref<FormErrors>;
  failure: Ref<string | null>;
  submitting: Ref<boolean>;
  submit(): Promise<
    { ok: true; result: unknown } | { ok: false; errors: FormErrors }
  >;
  validate(): boolean;
  reset(): void;
}

export interface FormProps {
  /** The result of `useDoofpiForm(schema, { initial, onSubmit })` */
  form?: NoofpiFormLike;
  /** A Zod schema validated against `state` on submit. Ignored with `form` */
  schema?: FormSchema<unknown>;
  /** The reactive values to validate. Ignored with `form` */
  state?: object;
  disabled?: boolean;
}

export interface AuthField {
  /** Key in the values and path in the schema */
  name: string;
  /** `"checkbox"` renders a checkbox with the `label` beside it; anything else is an `<input type>`. Default: `"text"` */
  type?: "text" | "email" | "password" | "tel" | "url" | "checkbox";
  label?: string;
  placeholder?: string;
  autocomplete?: string;
  description?: string;
  help?: string;
  required?: boolean;
  /** Icon before the text (an icon class or a component) */
  icon?: ButtonIcon;
  /** Icon after the text. Ignored for a `revealable` password field */
  trailingIcon?: ButtonIcon;
  /** Adds an eye button that shows or hides the text of a `"password"` field */
  revealable?: boolean;
}

export interface AuthProvider {
  label: string;
  icon?: ButtonIcon;
  onClick?: () => void;
  disabled?: boolean;
}

export const CHOICE_ORIENTATIONS = ["vertical", "horizontal"] as const;
export type ChoiceOrientation = (typeof CHOICE_ORIENTATIONS)[number];

export const PIN_INPUT_TYPES = ["numeric", "alphanumeric"] as const;
export type PinInputType = (typeof PIN_INPUT_TYPES)[number];

/** One option of `NCheckboxGroup` or `NRadioGroup` */
export interface ChoiceItem {
  label: string;
  value: unknown;
  /** Text under the label (ignored with `buttons`) */
  description?: string;
  disabled?: boolean;
}

/** One option of `NSelect` and `NCombobox` */
export interface SelectItem extends ChoiceItem {
  icon?: ButtonIcon;
}

export interface ComboboxProps {
  items: readonly SelectItem[];
  /** Shown while the input is empty */
  placeholder?: string;
  /** Native `name`: a hidden input submits the selected value with a surrounding `<form>` */
  name?: string;
  /** Mark invalid without an `NFormField` around it */
  invalid?: boolean;
  disabled?: boolean;
  /** Accessible name when there is no `NFormField` label */
  label?: string;
  /** Filters the options by label while typing. Turn it off to filter them yourself with `v-model:search-term`. Default: `true` */
  filter?: boolean;
  /** Shows a button that clears the selection. Default: `false` */
  clearable?: boolean;
  /** Shown in the list when no option matches. Default: `"No results"` */
  emptyText?: string;
  /** Accessible name of the clear button. Default: `"Clear"` */
  clearLabel?: string;
}

export interface SelectProps {
  items: readonly SelectItem[];
  /** Shown while nothing is selected */
  placeholder?: string;
  /** Native `name`: a hidden input submits the selected value with a surrounding `<form>` */
  name?: string;
  /** Mark invalid without an `NFormField` around it */
  invalid?: boolean;
  disabled?: boolean;
  /** Accessible name when there is no `NFormField` label */
  label?: string;
  /** Several options can be selected: `v-model` is an array of values and the list stays open while picking. Default: `false` */
  multiple?: boolean;
  /** With `multiple`: shows the chosen options as badges instead of comma-separated text. Default: `false` */
  badges?: boolean;
  /** Default: `"subtle"` */
  badgeVariant?: BadgeVariant;
  /** Default: `"primary"` */
  badgeColor?: ButtonColor;
}

/** A date range of `NCalendar` and `NDatePicker`: `YYYY-MM-DD` strings. `end` is `null` until the range is complete */
export interface DateRange {
  start: string | null;
  end: string | null;
}

export interface CalendarProps {
  /** A `YYYY-MM-DD` string, or a `DateRange` with `range` (`v-model`) */
  modelValue?: string | DateRange | null;
  /** Selects a start and an end date. Default: `false` */
  range?: boolean;
  /** Earliest selectable date (`YYYY-MM-DD`) */
  min?: string;
  /** Latest selectable date (`YYYY-MM-DD`) */
  max?: string;
  /** Marks individual dates (`YYYY-MM-DD`) as unselectable */
  isDateDisabled?: (date: string) => boolean;
  /** First day of the week, `0` (Sunday) to `6`. Default: `0` */
  weekStart?: number;
  /** BCP 47 tag of the month, weekday and date names. Default: the browser's */
  locale?: string;
  /** Accessible name of the calendar. Default: `"Calendar"` */
  label?: string;
  /** Accessible name of the previous month button. Default: `"Previous month"` */
  prevLabel?: string;
  /** Accessible name of the next month button. Default: `"Next month"` */
  nextLabel?: string;
  disabled?: boolean;
}

export interface DatePickerProps extends Omit<
  CalendarProps,
  "label" | "disabled"
> {
  /** Shown while no date is selected */
  placeholder?: string;
  /** Native `name`: a hidden input submits the date with a surrounding `<form>` (with `range`, `<name>-start` and `<name>-end`) */
  name?: string;
  /** Mark invalid without an `NFormField` around it. Default: `false` */
  invalid?: boolean;
  disabled?: boolean;
  /** Accessible name when there is no `NFormField` label */
  label?: string;
  /** Options of the formatted date in the trigger. Default: `{ dateStyle: "medium" }` */
  format?: Intl.DateTimeFormatOptions;
  /** Open state (`v-model:open`) */
  open?: boolean;
}

export const ACCORDION_TYPES = ["single", "multiple"] as const;
export type AccordionType = (typeof ACCORDION_TYPES)[number];

export const ACCORDION_VARIANTS = ["line", "outline"] as const;
export type AccordionVariant = (typeof ACCORDION_VARIANTS)[number];

/** One section of `NAccordion` */
export interface AccordionItem {
  label: string;
  /** Identifies the section: the `v-model`, and the name of its content slot */
  value: string | number;
  icon?: ButtonIcon;
  /** Text shown in the panel when there is no slot for it */
  content?: string;
  disabled?: boolean;
}

export interface AccordionProps {
  items: readonly AccordionItem[];
  /** `"single"` keeps one section open, `"multiple"` lets any number be open. Default: `"single"` */
  type?: AccordionType;
  /** With `type="single"`: the open section can be closed again. Default: `true` */
  collapsible?: boolean;
  /** Default: `"line"` */
  variant?: AccordionVariant;
  /** Open sections (`v-model`): a `value` with `type="single"`, an array of values with `type="multiple"` */
  modelValue?: string | number | (string | number)[];
}

export type TreeValue = string | number;
export type TreeSelection = "single" | "multiple";

export interface TreeItem {
  value: TreeValue;
  label: string;
  description?: string;
  icon?: ButtonIcon;
  badge?: string | number;
  disabled?: boolean;
  children?: TreeItem[];
}

export interface TreeProps {
  items?: TreeItem[];
  /** Selection mode. Default: `"single"` */
  selection?: TreeSelection;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Shows checkboxes and maintains `v-model:checked` independently from selection */
  checkable?: boolean;
  /** Lets rows accept drops; the `drop` event carries the row's item and the native event. Default: `false` */
  droppable?: boolean;
  /** Loads children on first expansion for nodes without `children` */
  loadChildren?: (item: TreeItem) => TreeItem[] | Promise<TreeItem[]>;
  /** Text announced by assistive technology. Default: `"Tree"` */
  label?: string;
  /** Selected value, or values with `selection="multiple"` (`v-model:selected`) */
  selected?: TreeValue | TreeValue[] | undefined;
  /** Expanded node values (`v-model:expanded`) */
  expanded?: TreeValue[];
  /** Checked node values (`v-model:checked`) */
  checked?: TreeValue[];
  /** Search text (`v-model:search`) */
  search?: string;
}

export type FileExplorerView = "list" | "grid";

export const FILE_EXPLORER_SORT_KEYS = ["name", "size", "modified"] as const;
export type FileExplorerSortKey = (typeof FILE_EXPLORER_SORT_KEYS)[number];
export type FileExplorerSortDirection = "asc" | "desc";

/** Folders always stay before files; the sort applies within each */
export interface FileExplorerSort {
  key: FileExplorerSortKey;
  direction: FileExplorerSortDirection;
}

/** The built-in actions. `upload` is not one of them: it is switched on with `showUpload` */
export const FILE_EXPLORER_ACTIONS = [
  "new-folder",
  "download",
  "copy",
  "cut",
  "paste",
  "rename",
  "delete",
] as const;
export type FileExplorerAction = (typeof FILE_EXPLORER_ACTIONS)[number];

export interface FileItem {
  value: TreeValue;
  label: string;
  /** Default: inferred from `children` or `loadChildren` */
  type?: "file" | "folder";
  description?: string;
  icon?: ButtonIcon;
  size?: number;
  modified?: string | Date;
  /** Where the file can be downloaded from. The Download action saves it; without it, only the `download` event is emitted */
  url?: string;
  disabled?: boolean;
  children?: FileItem[];
}

/**
 * A file manager. It only displays and reports: every change (`rename`, `delete`, `move`, `copy`, `upload`,
 * `create-folder`) is an event, and you apply it to the `items` you pass in.
 */
export interface FileExplorerProps {
  /** The top level files and folders */
  items?: FileItem[];
  /** The open folder (`v-model:current`). `undefined` is the top level */
  current?: TreeValue;
  /** Selected values (`v-model:selected`) */
  selected?: TreeValue[];
  /** Selection mode (`v-model:selecting`): a click selects an item. Off, a click selects nothing; Ctrl/Cmd or Shift-click and `Space` still do. Default: `false` */
  selecting?: boolean;
  /** Default: `"list"` */
  view?: FileExplorerView;
  /** How the items are ordered (`v-model:sort`). Default: `{ key: "name", direction: "asc" }` */
  sort?: FileExplorerSort;
  /** Which built-in actions are offered. Default: all of them */
  actions?: readonly FileExplorerAction[];
  /** Ctrl/Cmd-click and Shift-click select several items. Default: `false` */
  multiple?: boolean;
  /** Search box that filters the open folder. Default: `true` */
  searchable?: boolean;
  /** Shows the Upload button and accepts files dropped from the computer. Default: `false` */
  showUpload?: boolean;
  /** Name of the top level, used by the first breadcrumb and the first entry of the folder tree. Default: `"All files"` */
  rootLabel?: string;
  searchPlaceholder?: string;
  /** Shown in an empty folder. Default: `"This folder is empty"` */
  emptyText?: string;
  /** Accessible name. Default: `"File explorer"` */
  label?: string;
  /** Loads the content of a folder without `children` the first time it is opened. The `load` event reports the result */
  loadChildren?: (folder: FileItem) => FileItem[] | Promise<FileItem[]>;
  /** `accept` of the upload file picker, e.g. `"image/*"` */
  accept?: string;
  disabled?: boolean;
}

export const TABS_ORIENTATIONS = ["horizontal", "vertical"] as const;
export type TabsOrientation = (typeof TABS_ORIENTATIONS)[number];

export const TABS_VARIANTS = ["line", "pill"] as const;
export type TabsVariant = (typeof TABS_VARIANTS)[number];

export const TABS_ACTIVATIONS = ["automatic", "manual"] as const;
export type TabsActivation = (typeof TABS_ACTIVATIONS)[number];

/** One tab of `NTabs` */
export interface TabItem {
  label: string;
  /** Identifies the tab: the `v-model`, and the name of its panel slot */
  value: string | number;
  icon?: ButtonIcon;
  disabled?: boolean;
}

export interface TabsProps {
  items: readonly TabItem[];
  /** Direction of the tab list. Default: `"horizontal"` */
  orientation?: TabsOrientation;
  /** Default: `"line"` */
  variant?: TabsVariant;
  /** `"automatic"` selects a tab as arrow keys focus it, `"manual"` waits for Enter or Space. Default: `"automatic"` */
  activation?: TabsActivation;
  /** Keeps the panels of visited tabs mounted (hidden) instead of unmounting them. Default: `false` */
  keepAlive?: boolean;
  /** Accessible name of the tab list */
  label?: string;
  /** Selected tab (`v-model`). Default: the first enabled tab */
  modelValue?: string | number;
}

export const TOAST_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;
export type ToastPosition = (typeof TOAST_POSITIONS)[number];

/** A button under the toast's text: any `NButton` prop, plus a click handler */
export type ToastAction = ButtonProps & {
  onClick?: (event: MouseEvent) => void;
};

export interface ToastProps {
  title?: string;
  description?: string;
  /** Leading icon */
  icon?: ButtonIcon;
  /** Accent color. Default: `"primary"` */
  color?: ButtonColor;
  /** Shows a close button. Default: `true` */
  close?: boolean;
  /** Replaces the close button's `i-lucide-x` icon */
  closeIcon?: ButtonIcon;
  actions?: ToastAction[];
  /** Milliseconds before the toast closes itself (paused while hovered or focused); `0` keeps it until closed. Default: `5000` */
  duration?: number;
}

export interface ToastOptions extends ToastProps {
  /** Reusing the id of a visible toast updates it instead of adding another. Default: generated */
  id?: string | number;
  /** Called once the toast is removed, whether by the user, its timer, `remove` or `clear` */
  onClose?: () => void;
}

export interface Toast extends ToastOptions {
  id: string | number;
}

export const MENU_PLACEMENTS = [
  "bottom-start",
  "bottom",
  "bottom-end",
  "top-start",
  "top",
  "top-end",
] as const;
export type MenuPlacement = (typeof MENU_PLACEMENTS)[number];

export interface MenuItem {
  /** `"label"` is a non-interactive heading (with an optional `description`, e.g. a user's email), `"separator"` a divider. Default: `"item"` */
  type?: "item" | "label" | "separator";
  label?: string;
  /** Text under a `"label"` */
  description?: string;
  icon?: ButtonIcon;
  /** Link target: `href` of an `<a>`, or `to` of `linkAs` (e.g. `NuxtLink`). Without it the item is a button */
  to?: string;
  target?: string;
  /** `"error"` marks a destructive action. Default: `"neutral"` */
  color?: ButtonColor;
  /** How the row looks at rest, as on `NButton`. Default: `"ghost"` (plain, tinted on hover) */
  variant?: ButtonVariant;
  /** Hint shown at the end of the row, e.g. `"⌘K"` (display only) */
  shortcut?: string;
  disabled?: boolean;
  /** Called when the item is chosen; `event.preventDefault()` keeps the menu open */
  onSelect?: (event: Event) => void;
}

export interface MenuProps {
  /** Items of the menu. An array of arrays is a list of groups, divided by separators */
  items?: MenuItem[] | MenuItem[][];
  /** Where the menu opens, relative to its trigger. Default: `"bottom-start"` */
  placement?: MenuPlacement;
  /** Element or component of the links, e.g. `NuxtLink`. Default: `"a"` */
  linkAs?: string | Component;
  /** Accessible name of the menu */
  label?: string;
  /** Teleport target of the panel, so a clipping ancestor (a table, a card) can't hide it. Use `false` to render in place. Default: `"body"` */
  to?: string | HTMLElement | false;
  /** Doesn't open. Default: `false` */
  disabled?: boolean;
  /** Open state (`v-model:open`) */
  open?: boolean;
}

export interface ContextMenuProps {
  /** Items of the menu, as in `NMenu`. An array of arrays is a list of groups, divided by separators */
  items?: MenuItem[] | MenuItem[][];
  /** Element or component of the links, e.g. `NuxtLink`. Default: `"a"` */
  linkAs?: string | Component;
  /** Accessible name of the menu */
  label?: string;
  /** Teleport target. Use `false` to render in place. Default: `"body"` */
  to?: string | HTMLElement | false;
  /** Keeps the browser's own context menu. Default: `false` */
  disabled?: boolean;
  /** Open state (`v-model:open`) */
  open?: boolean;
}

export const POPOVER_PLACEMENTS = [
  "top-start",
  "top",
  "top-end",
  "right-start",
  "right",
  "right-end",
  "bottom-start",
  "bottom",
  "bottom-end",
  "left-start",
  "left",
  "left-end",
] as const;
export const POPOVER_TRIGGERS = ["click", "hover", "manual"] as const;

export type PopoverPlacement = (typeof POPOVER_PLACEMENTS)[number];
export type PopoverTrigger = (typeof POPOVER_TRIGGERS)[number];

export interface PopoverProps {
  /** Preferred placement. Flips and shifts to stay inside the viewport. Default: `"bottom-start"` */
  placement?: PopoverPlacement;
  /** How the popover opens. Default: `"click"` */
  trigger?: PopoverTrigger;
  /** Accessible name of the popover */
  label?: string;
  /** Closes on `Escape` and pointer interaction outside. Default: `true` */
  dismissible?: boolean;
  /** Shows a pointer back to the trigger. Default: `true` */
  arrow?: boolean;
  /** Distance from the trigger in pixels. Default: `8` */
  offset?: number;
  /** Hover delay in milliseconds. Focus opens immediately. Default: `100` */
  delay?: number;
  /** Delay before closing after hover leaves. Default: `100` */
  hideDelay?: number;
  /** CSS maximum width. Default: `"20rem"` */
  maxWidth?: string;
  /** Teleport target. Use `false` to render in place. Default: `"body"` */
  to?: string | HTMLElement | false;
  /** Doesn't open. Default: `false` */
  disabled?: boolean;
  /** Open state (`v-model:open`) */
  open?: boolean;
}

export const TOOLTIP_PLACEMENTS = ["top", "right", "bottom", "left"] as const;
export const TOOLTIP_VARIANTS = ["solid", "soft"] as const;

export type TooltipPlacement = (typeof TOOLTIP_PLACEMENTS)[number];
export type TooltipVariant = (typeof TOOLTIP_VARIANTS)[number];

export interface TooltipProps {
  /** Tooltip text. The `content` slot replaces it */
  text?: string;
  /** Preferred side. Flips to the opposite side when needed. Default: `"top"` */
  placement?: TooltipPlacement;
  /** Default: `"solid"` */
  variant?: TooltipVariant;
  /** Accent color. Default: `"neutral"` */
  color?: ButtonColor;
  /** Hover delay in milliseconds. Focus opens immediately. Default: `350` */
  delay?: number;
  /** Delay before closing on hover exit in milliseconds. Default: `100` */
  hideDelay?: number;
  disabled?: boolean;
  /** Default: `true` */
  arrow?: boolean;
  /** CSS maximum width. Default: `"16rem"` */
  maxWidth?: string;
  /** Teleport target. Use `false` to render in place. Default: `"body"` */
  to?: string | object | false;
  /** Open state (`v-model:open`) */
  open?: boolean;
}

export const DIALOG_PLACEMENTS = [
  "center",
  "top",
  "bottom",
  "start",
  "end",
] as const;
export const DIALOG_SIZES = ["sm", "md", "lg", "xl", "full"] as const;

/** `"start"` and `"end"` follow the text direction */
export type DialogPlacement = (typeof DIALOG_PLACEMENTS)[number];
export type DialogSize = (typeof DIALOG_SIZES)[number];
export type DrawerPlacement = Exclude<DialogPlacement, "center">;

export interface DialogProps {
  title?: string;
  description?: string;
  /** Accessible name when there is no `title` */
  label?: string;
  /** Default: `"center"` */
  placement?: DialogPlacement;
  /** Width of the panel (a `"top"` or `"bottom"` panel spans the viewport). Default: `"md"` */
  size?: DialogSize;
  /** Closes on `Escape` and on a click outside the panel. Default: `true` */
  dismissible?: boolean;
  /** Shows the close button. Default: `true` */
  close?: boolean;
  /** Default: `"i-lucide-x"` */
  closeIcon?: ButtonIcon;
  /** Accessible name of the close button. Default: `"Close"` */
  closeLabel?: string;
  /** Where the dialog is rendered (a selector or an element), or `false` to render in place. Default: `"body"` */
  to?: string | HTMLElement | false;
  /** Open state (`v-model:open`) */
  open?: boolean;
}

export interface DrawerProps extends Omit<DialogProps, "placement"> {
  /** Default: `"end"` */
  placement?: DrawerPlacement;
}

export const PAGINATION_SIZES = ["sm", "md", "lg"] as const;
export type PaginationSize = (typeof PAGINATION_SIZES)[number];

export interface PaginationProps {
  /** Current page, starting at `1` (`v-model`) */
  modelValue?: number;
  /** Total number of items. With `pageSize` it gives the number of pages */
  total?: number;
  /** Items per page. Default: `10` */
  pageSize?: number;
  /** Pages shown on each side of the current one. Default: `1` */
  siblings?: number;
  /** Pages always shown at the start and the end. Default: `1` */
  boundaries?: number;
  /** Shows buttons for the first and the last page. Default: `false` */
  showEdges?: boolean;
  /** Default: `"md"` */
  size?: PaginationSize;
  /** Accessible name of the navigation. Default: `"Pagination"` */
  label?: string;
  /** Accessible name of the previous button. Default: `"Previous page"` */
  prevLabel?: string;
  /** Accessible name of the next button. Default: `"Next page"` */
  nextLabel?: string;
  /** Accessible name of the first page button. Default: `"First page"` */
  firstLabel?: string;
  /** Accessible name of the last page button. Default: `"Last page"` */
  lastLabel?: string;
  /** Accessible name of a page button. Default: `` (page) => `Page ${page}` `` */
  pageLabel?: (page: number) => string;
  disabled?: boolean;
}

export const BREADCRUMB_SIZES = ["sm", "md", "lg"] as const;
export type BreadcrumbSize = (typeof BREADCRUMB_SIZES)[number];

export interface BreadcrumbItem {
  label: string;
  /** Link target. Without it the item renders as plain text */
  to?: string;
  target?: string;
  /** Lucide-style icon name, e.g. `i-lucide-house` */
  icon?: string;
}

export interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  /** Component for links, e.g. `RouterLink` or `NuxtLink`. Default: `"a"` */
  linkAs?: string | object;
  /** Icon between items. Default: `"i-lucide-chevron-right"` */
  separatorIcon?: string;
  /** Collapses the middle items into `…` when there are more than this many. `0` never collapses. Default: `0` */
  maxItems?: number;
  /** Default: `"md"` */
  size?: BreadcrumbSize;
  /** Accessible name of the navigation. Default: `"Breadcrumb"` */
  label?: string;
}

export const STEPPER_ORIENTATIONS = ["horizontal", "vertical"] as const;
export type StepperOrientation = (typeof STEPPER_ORIENTATIONS)[number];

export const STEPPER_SIZES = ["sm", "md", "lg"] as const;
export type StepperSize = (typeof STEPPER_SIZES)[number];

export interface StepperItem {
  title: string;
  description?: string;
  /** Lucide-style icon name shown instead of the step number */
  icon?: string;
  disabled?: boolean;
}

export interface StepperProps {
  /** Index of the current step, starting at `0` (`v-model`) */
  modelValue?: number;
  items?: StepperItem[];
  /** Default: `"horizontal"` */
  orientation?: StepperOrientation;
  /** Default: `"md"` */
  size?: StepperSize;
  /** Lets users click a completed step to go back to it. Default: `true` */
  clickable?: boolean;
  /** Accessible name of the list. Default: `"Progress"` */
  label?: string;
}

export const SWITCH_SIZES = ["sm", "md", "lg"] as const;
export type SwitchSize = (typeof SWITCH_SIZES)[number];

export interface SwitchProps {
  /** On or off (`v-model`) */
  modelValue?: boolean;
  /** Text beside the switch. The default slot works too */
  label?: string;
  /** Default: `"primary"` (the Color Theme Studio theme) */
  color?: ButtonColor;
  /** Default: `"md"` */
  size?: SwitchSize;
  /** Mark invalid without an `NFormField` around it. Default: `false` */
  invalid?: boolean;
}

export const ACCESSIBILITY_CONTRASTS = [
  "none",
  "dark",
  "light",
  "invert",
] as const;
export const ACCESSIBILITY_FONT_SIZES = [100, 110, 125, 150, 175, 200] as const;
export const ACCESSIBILITY_PLACEMENTS = [
  "bottom-start",
  "bottom-end",
  "top-start",
  "top-end",
] as const;
export const ACCESSIBILITY_TOGGLES = [
  "grayscale",
  "highlightLinks",
  "highlightHeadings",
  "readableFont",
  "textSpacing",
  "largeCursor",
  "highlightFocus",
  "readingGuide",
  "stopAnimations",
  "hideImages",
] as const;

export type AccessibilityContrast = (typeof ACCESSIBILITY_CONTRASTS)[number];
export type AccessibilityFontSize = (typeof ACCESSIBILITY_FONT_SIZES)[number];
export type AccessibilityPlacement = (typeof ACCESSIBILITY_PLACEMENTS)[number];
export type AccessibilityToggle = (typeof ACCESSIBILITY_TOGGLES)[number];
/** An adjustment the menu offers */
export type AccessibilityFeature =
  "fontSize" | "contrast" | AccessibilityToggle;

export interface AccessibilitySettings {
  /** Text size in percent of the page's own size, one of `ACCESSIBILITY_FONT_SIZES` */
  fontSize: AccessibilityFontSize;
  contrast: AccessibilityContrast;
  grayscale: boolean;
  highlightLinks: boolean;
  highlightHeadings: boolean;
  /** Replaces the fonts of the page with a plain sans-serif */
  readableFont: boolean;
  /** Letter, word, line and paragraph spacing of WCAG 1.4.12 */
  textSpacing: boolean;
  largeCursor: boolean;
  /** A thick outline around the element that has the keyboard focus */
  highlightFocus: boolean;
  /** A bar that follows the pointer and the focus */
  readingGuide: boolean;
  /** Stops CSS animations and transitions */
  stopAnimations: boolean;
  hideImages: boolean;
}

export type AccessibilityLabel =
  | AccessibilityFeature
  | "open"
  | "title"
  | "close"
  | "reset"
  | "statement"
  | "skip"
  | "increaseFontSize"
  | "decreaseFontSize"
  | "contrastDark"
  | "contrastLight"
  | "contrastInvert";
export type AccessibilityLabels = Record<AccessibilityLabel, string>;

export interface AccessibilityProps {
  /** Open state of the menu (`v-model:open`) */
  open?: boolean;
  /** Current adjustments (`v-model:settings`). They are also applied to the page (as `data-n-a11y-*` attributes on `<html>`) */
  settings?: AccessibilitySettings;
  /** Adjustments to offer. Default: all of them */
  features?: AccessibilityFeature[];
  /** Corner of the screen, `start` and `end` follow the text direction. Default: `"bottom-start"` */
  placement?: AccessibilityPlacement;
  /** Link to the accessibility statement (הצהרת נגישות), which Israeli regulations require every website to have */
  statementUrl?: string;
  /** Adds a "skip to the main content" link, the first thing a keyboard user reaches, to the element it points to, e.g. `"#main"` */
  skipTo?: string;
  /** Key that opens and closes the menu. Use `""` for none. Default: `"Alt+A"` */
  shortcut?: string;
  /** `localStorage` key the adjustments are kept in between visits. Use `false` to not keep them. Default: `"n-accessibility"` */
  storageKey?: string | false;
  /** Texts of the menu, any of them. Default: English; `ACCESSIBILITY_LABELS_HE` is Hebrew */
  labels?: Partial<AccessibilityLabels>;
}

export const SLIDER_SIZES = ["sm", "md", "lg"] as const;
export type SliderSize = (typeof SLIDER_SIZES)[number];

export interface SliderProps {
  /** Current value (`v-model`). Default: `min` */
  modelValue?: number;
  /** Default: `0` */
  min?: number;
  /** Default: `100` */
  max?: number;
  /** Default: `1` */
  step?: number;
  /** Text above the slider, also its accessible name */
  label?: string;
  /** Shows the value at the end of the label row. Default: `false` */
  showValue?: boolean;
  /** Default: `"primary"` (the Color Theme Studio theme) */
  color?: ButtonColor;
  /** Default: `"md"` */
  size?: SliderSize;
  /** Mark invalid without an `NFormField` around it. Default: `false` */
  invalid?: boolean;
  disabled?: boolean;
}
