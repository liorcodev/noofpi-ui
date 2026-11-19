import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import { NDashboard, NHeader, NSidebar } from "../src";

const items = [
  { label: "Overview", to: "/", active: true },
  { label: "Docs", to: "/docs", target: "_blank" },
];

const mountDashboard = (props = {}, slots = {}) =>
  mount(NDashboard, {
    props,
    slots: {
      header: () => "header",
      sidebar: () => "sidebar",
      default: () => "content",
      ...slots,
    },
    attachTo: document.body,
  });

describe("NSidebar", () => {
  it("renders the links and the grouped links", () => {
    const wrapper = mount(NSidebar, {
      props: {
        items,
        groups: [{ label: "Team", items: [{ label: "Members", to: "/m" }] }],
      },
    });
    expect(wrapper.attributes("aria-label")).toBe("Sidebar");
    const links = wrapper.findAll(".n-sidebar-link");
    expect(links.map((link) => link.text())).toEqual([
      "Overview",
      "Docs",
      "Members",
    ]);
    expect(links[0]?.attributes("aria-current")).toBe("page");
    expect(links[1]?.attributes("rel")).toBe("noopener noreferrer");
    expect(wrapper.findAll(".n-sidebar-group-label")).toHaveLength(1);
  });

  it("only renders the header and footer when given", () => {
    const wrapper = mount(NSidebar, { props: { items } });
    expect(wrapper.find(".n-sidebar-header").exists()).toBe(false);
    expect(wrapper.find(".n-sidebar-footer").exists()).toBe(false);
  });

  it("keeps only the matching sidebar link active across groups", async () => {
    history.replaceState(null, "", "/settings");
    const wrapper = mount(NSidebar, {
      props: {
        items: [{ label: "Overview", to: "/", active: true }],
        groups: [
          { label: "Account", items: [{ label: "Settings", to: "/settings" }] },
        ],
      },
    });
    await wrapper.vm.$nextTick();
    const active = wrapper.findAll(".n-sidebar-link[aria-current='page']");
    expect(active).toHaveLength(1);
    expect(active[0]!.text()).toBe("Settings");
    wrapper.unmount();
    history.replaceState(null, "", "/");
  });

  it("collapses to a rail with the collapse button", async () => {
    const wrapper = mount(NSidebar, {
      props: {
        items,
        collapsible: true,
        "onUpdate:collapsed": (collapsed: boolean) =>
          wrapper.setProps({ collapsed }),
      },
    });
    const button = wrapper.find(".n-sidebar-collapse");
    expect(button.attributes("aria-label")).toBe("Collapse sidebar");
    expect(wrapper.attributes("data-collapsed")).toBeUndefined();
    await button.trigger("click");
    expect(wrapper.attributes("data-collapsed")).toBeDefined();
    expect(button.attributes("aria-label")).toBe("Expand sidebar");
    expect(wrapper.find(".n-sidebar-link").attributes("title")).toBe(
      "Overview",
    );
  });

  it("ignores `collapsed` and has no button unless collapsible", () => {
    const wrapper = mount(NSidebar, { props: { items, collapsed: true } });
    expect(wrapper.attributes("data-collapsed")).toBeUndefined();
    expect(wrapper.find(".n-sidebar-collapse").exists()).toBe(false);
  });
});

describe("NDashboard", () => {
  it("renders the header, the sidebar and the main content", () => {
    const wrapper = mountDashboard();
    expect(wrapper.attributes("data-breakpoint")).toBe("lg");
    expect(wrapper.find(".n-dashboard-sidebar").text()).toBe("sidebar");
    expect(wrapper.find("main").text()).toBe("content");
    expect(wrapper.text()).toContain("header");
    wrapper.unmount();
  });

  it("lets the header open and close the sidebar", async () => {
    const wrapper = mount(NDashboard, {
      slots: {
        header: () => h(NHeader, { title: "Acme", container: false }),
        sidebar: () => h(NSidebar, { items }),
      },
      attachTo: document.body,
    });
    const toggle = wrapper.find(".n-header-sidebar-toggle");
    const panelId = wrapper.find(".n-dashboard-sidebar").attributes("id");
    expect(toggle.attributes("aria-controls")).toBe(panelId);
    expect(toggle.attributes("aria-expanded")).toBe("false");
    await toggle.trigger("click");
    expect(wrapper.attributes("data-open")).toBeDefined();
    expect(toggle.attributes("aria-expanded")).toBe("true");
    await wrapper.find(".n-sidebar-link").trigger("click");
    expect(wrapper.attributes("data-open")).toBeUndefined();
    wrapper.unmount();
  });

  it("closes the sidebar on Escape and a backdrop click", async () => {
    const wrapper = mountDashboard({
      open: true,
      "onUpdate:open": (open: boolean) => wrapper.setProps({ open }),
    });
    expect(wrapper.attributes("data-open")).toBeDefined();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();
    expect(wrapper.attributes("data-open")).toBeUndefined();
    await wrapper.setProps({ open: true });
    await wrapper.find(".n-dashboard-backdrop").trigger("click");
    expect(wrapper.attributes("data-open")).toBeUndefined();
    wrapper.unmount();
  });

  it("has no menu button when the menu would be empty", () => {
    const wrapper = mount(NHeader, { props: { title: "Acme" } });
    expect(wrapper.find(".n-header-toggle").exists()).toBe(false);
  });

  it("keeps the buttons in the bar and out of the menu inside a dashboard", async () => {
    const buttons = [{ label: "Sign in" }];
    const wrapper = mount(NDashboard, {
      slots: {
        header: () => h(NHeader, { title: "Acme", buttons }),
        sidebar: () => h(NSidebar, { items }),
      },
      attachTo: document.body,
    });
    expect(wrapper.find(".n-header").attributes("data-sidebar")).toBeDefined();
    expect(wrapper.find(".n-header-toggle").exists()).toBe(false);
    expect(wrapper.find(".n-header-right").text()).toBe("Sign in");
    expect(wrapper.find(".n-header-sidebar-toggle").exists()).toBe(true);
    wrapper.unmount();
  });

  it("doesn't give the header a sidebar button without a sidebar", () => {
    const wrapper = mount(NDashboard, {
      slots: { header: () => h(NHeader, { title: "Acme" }) },
    });
    expect(wrapper.find(".n-header-sidebar-toggle").exists()).toBe(false);
    expect(wrapper.find(".n-dashboard-sidebar").exists()).toBe(false);
  });
});
