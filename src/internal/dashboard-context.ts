import type { ComputedRef, InjectionKey, Ref } from "vue";

/** Provided by `NDashboard` to the `NHeader` inside it, which then shows the sidebar button */
export interface DashboardContext {
  open: Ref<boolean>;
  hasSidebar: ComputedRef<boolean>;
  /** Whether the viewport is at or past the breakpoint, where the sidebar is shown as a column and can be collapsed */
  desktop: Ref<boolean>;
  /** Id of the sidebar panel, for `aria-controls` */
  panelId: string;
  toggle: () => void;
}

export const DASHBOARD_KEY: InjectionKey<DashboardContext> =
  Symbol("n-dashboard");
