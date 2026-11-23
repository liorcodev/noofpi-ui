import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NAccessibility } from "../src";
import { matchesShortcut } from "../src/utils/accessibility";

const root = document.documentElement;

const mountMenu = (props: Record<string, unknown> = {}) =>
  mount(NAccessibility, {
    props,
    attachTo: document.body,
  });

const option = (wrapper: ReturnType<typeof mountMenu>, text: string) =>
  wrapper
    .findAll(".n-accessibility-option")
    .find((button) => button.text() === text)!;

describe("NAccessibility", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    document.body.innerHTML = "";
    for (const name of root.getAttributeNames())
      if (name.startsWith("data-n-a11y")) root.removeAttribute(name);
  });

  it("opens from the button and closes with Escape, returning the focus", async () => {
    const wrapper = mountMenu();
    const button = wrapper.get(".n-accessibility-trigger");
    expect(button.attributes("aria-expanded")).toBe("false");
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);

    await button.trigger("click");
    const panel = wrapper.get('[role="dialog"]');
    expect(button.attributes("aria-expanded")).toBe("true");
    expect(button.attributes("aria-controls")).toBe(panel.attributes("id"));
    expect(document.activeElement).toBe(panel.element);

    await panel.trigger("keydown", { key: "Escape" });
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(document.activeElement).toBe(button.element);
    wrapper.unmount();
  });

  it("opens with the keyboard shortcut", async () => {
    const wrapper = mountMenu();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", code: "KeyA", altKey: true }),
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("applies the adjustments to the page and takes them back on reset", async () => {
    const wrapper = mountMenu({ open: true });
    await option(wrapper, "Highlight links").trigger("click");
    await option(wrapper, "Dark contrast").trigger("click");
    await wrapper.get('[aria-label="Increase text size"]').trigger("click");

    expect(option(wrapper, "Highlight links").attributes("aria-pressed")).toBe(
      "true",
    );
    expect(root.hasAttribute("data-n-a11y-highlight-links")).toBe(true);
    expect(root.getAttribute("data-n-a11y-contrast")).toBe("dark");
    expect(root.getAttribute("data-n-a11y-font")).toBe("110");
    expect(wrapper.get("output").text()).toBe("110%");

    // Choosing the active contrast again turns it off
    await option(wrapper, "Dark contrast").trigger("click");
    expect(root.hasAttribute("data-n-a11y-contrast")).toBe(false);

    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Reset settings")!
      .trigger("click");
    expect(root.hasAttribute("data-n-a11y-highlight-links")).toBe(false);
    expect(root.hasAttribute("data-n-a11y-font")).toBe(false);
    expect(localStorage.getItem("n-accessibility")).toBeNull();

    wrapper.unmount();
  });

  it("keeps the font size within its steps", async () => {
    const wrapper = mountMenu({ open: true });
    const decrease = wrapper.get('[aria-label="Decrease text size"]');
    await decrease.trigger("click");
    expect(wrapper.get("output").text()).toBe("100%");

    const increase = wrapper.get('[aria-label="Increase text size"]');
    for (let i = 0; i < 8; i++) await increase.trigger("click");
    expect(wrapper.get("output").text()).toBe("200%");
    wrapper.unmount();
  });

  it("remembers the adjustments between visits and ignores bad stored data", async () => {
    localStorage.setItem(
      "n-accessibility",
      JSON.stringify({ fontSize: 150, contrast: "bogus", grayscale: true }),
    );
    const wrapper = mountMenu();
    await wrapper.vm.$nextTick();
    expect(root.getAttribute("data-n-a11y-font")).toBe("150");
    expect(root.hasAttribute("data-n-a11y-grayscale")).toBe(true);
    expect(root.hasAttribute("data-n-a11y-contrast")).toBe(false);

    wrapper.unmount();
    expect(root.hasAttribute("data-n-a11y-font")).toBe(false);
  });

  it("offers only the requested features, with the labels given", async () => {
    const wrapper = mountMenu({
      open: true,
      features: ["fontSize", "grayscale"],
      labels: { grayscale: "גווני אפור" },
      statementUrl: "/accessibility",
    });
    expect(wrapper.findAll(".n-accessibility-option")).toHaveLength(1);
    expect(wrapper.get(".n-accessibility-option").text()).toBe("גווני אפור");
    expect(wrapper.get(".n-accessibility-link").attributes("href")).toBe(
      "/accessibility",
    );
    expect(wrapper.text()).not.toContain("Contrast");
    wrapper.unmount();
  });

  it("skips to the main content", async () => {
    document.body.insertAdjacentHTML("beforeend", '<main id="main"></main>');
    const wrapper = mountMenu({ skipTo: "#main" });
    await wrapper.get(".n-accessibility-skip").trigger("click");
    expect(document.activeElement).toBe(document.getElementById("main"));
    wrapper.unmount();
  });

  it("matches shortcuts by key position and modifiers", () => {
    const press = (init: KeyboardEventInit) =>
      new KeyboardEvent("keydown", init);
    expect(
      matchesShortcut(press({ key: "å", code: "KeyA", altKey: true }), "Alt+A"),
    ).toBe(true);
    expect(matchesShortcut(press({ key: "a", code: "KeyA" }), "Alt+A")).toBe(
      false,
    );
    expect(
      matchesShortcut(
        press({ key: "a", code: "KeyA", altKey: true, shiftKey: true }),
        "Alt+A",
      ),
    ).toBe(false);
    expect(
      matchesShortcut(
        press({ key: "0", code: "Digit0", ctrlKey: true }),
        "Ctrl+0",
      ),
    ).toBe(true);
  });
});
