import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NHeader } from "../src";

const items = [
  { label: "Home", to: "/", active: true },
  { label: "Docs", to: "/docs", target: "_blank" },
];

const mountHeader = (props = {}) =>
  mount(NHeader, {
    props: { title: "Acme", logo: "i-lucide-zap", items, ...props },
    attachTo: document.body,
  });

describe("NHeader", () => {
  it("renders the logo, the navigation and the right buttons", () => {
    const wrapper = mountHeader({ buttons: [{ label: "Sign in", to: "/in" }] });
    expect(wrapper.find(".n-header-brand").attributes("href")).toBe("/");
    expect(wrapper.find(".n-header-title").text()).toBe("Acme");
    const links = wrapper.findAll(".n-header-nav .n-header-link");
    expect(links.map((link) => link.text())).toEqual(["Home", "Docs"]);
    expect(links[0]?.attributes("aria-current")).toBe("page");
    expect(links[1]?.attributes("rel")).toBe("noopener noreferrer");
    const button = wrapper.find(".n-header-right a");
    expect(button.attributes("href")).toBe("/in");
    expect(button.classes()).toContain("n-button");
    wrapper.unmount();
  });

  it("maps the shadow option", async () => {
    const wrapper = mountHeader();
    expect(wrapper.attributes("data-shadow")).toBe("none");
    await wrapper.setProps({ shadow: true });
    expect(wrapper.attributes("data-shadow")).toBe("md");
    await wrapper.setProps({ shadow: "xl" });
    expect(wrapper.attributes("data-shadow")).toBe("xl");
    wrapper.unmount();
  });

  it("shows the `scroll` shadow only once scrolled", async () => {
    const wrapper = mountHeader({ shadow: "scroll" });
    expect(wrapper.attributes("data-shadow")).toBe("none");
    Object.defineProperty(window, "scrollY", { value: 40, configurable: true });
    document.dispatchEvent(new Event("scroll"));
    await wrapper.vm.$nextTick();
    expect(wrapper.attributes("data-shadow")).toBe("md");
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
    document.dispatchEvent(new Event("scroll"));
    await wrapper.vm.$nextTick();
    expect(wrapper.attributes("data-shadow")).toBe("none");
    wrapper.unmount();
  });

  it("toggles the mobile menu and closes it on Escape, a link click or an outside click", async () => {
    const wrapper = mountHeader();
    const toggle = wrapper.find(".n-header-toggle");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(wrapper.find(".n-header-panel").exists()).toBe(false);

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(toggle.attributes("aria-controls")).toBe(
      wrapper.find(".n-header-panel").attributes("id"),
    );
    expect(wrapper.emitted("update:open")?.at(-1)).toEqual([true]);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".n-header-panel").exists()).toBe(false);

    await toggle.trigger("click");
    await wrapper.find(".n-header-panel .n-header-link").trigger("click");
    expect(wrapper.find(".n-header-panel").exists()).toBe(false);

    await toggle.trigger("click");
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".n-header-panel").exists()).toBe(false);
    wrapper.unmount();
  });

  it("marks the link of the current location as active and follows hash changes", async () => {
    history.replaceState(null, "", "/docs");
    const wrapper = mountHeader({
      items: [
        { label: "Home", to: "/" },
        { label: "Docs", to: "/docs" },
        { label: "Intro", to: "/docs#intro" },
      ],
    });
    await wrapper.vm.$nextTick();
    const active = () =>
      wrapper
        .findAll(".n-header-nav .n-header-link[aria-current='page']")
        .map((link) => link.text());
    expect(active()).toEqual(["Docs"]);

    history.replaceState(null, "", "/docs#intro");
    window.dispatchEvent(new Event("hashchange"));
    await wrapper.vm.$nextTick();
    expect(active()).toEqual(["Intro"]);
    wrapper.unmount();
    history.replaceState(null, "", "/");
  });

  it("lets a URL match replace a static active fallback", async () => {
    history.replaceState(null, "", "/#docs");
    const wrapper = mountHeader({
      items: [
        { label: "Home", to: "/", active: true },
        { label: "Docs", to: "/#docs" },
      ],
    });
    await wrapper.vm.$nextTick();
    const active = wrapper.findAll(
      ".n-header-nav .n-header-link[aria-current='page']",
    );
    expect(active).toHaveLength(1);
    expect(active[0]!.text()).toBe("Docs");
    wrapper.unmount();
    history.replaceState(null, "", "/");
  });

  it("puts the nav links and buttons in the mobile menu", async () => {
    const wrapper = mountHeader({ buttons: [{ label: "Sign up" }] });
    await wrapper.find(".n-header-toggle").trigger("click");
    const panel = wrapper.find(".n-header-panel");
    expect(panel.findAll(".n-header-link")).toHaveLength(2);
    expect(panel.find(".n-button").text()).toBe("Sign up");
    wrapper.unmount();
  });
});
