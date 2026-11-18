import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";
import { NButton, NTooltip } from "../src";

const mountTooltip = (props = {}) =>
  mount(NTooltip, {
    props: { text: "Save your work", delay: 0, ...props },
    slots: {
      default: () => h(NButton, { label: "Save" }),
    },
    attachTo: document.body,
  });

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("NTooltip", () => {
  it("describes its trigger and shows on focus", async () => {
    const wrapper = mountTooltip();
    await nextTick();
    const button = wrapper.get("button");

    await button.trigger("focusin");
    const tooltip = document.body.querySelector('[role="tooltip"]')!;
    expect(tooltip.textContent).toContain("Save your work");
    expect(button.attributes("aria-describedby")).toBe(tooltip.id);
    wrapper.unmount();
  });

  it("preserves an existing description and closes on Escape", async () => {
    const wrapper = mount(NTooltip, {
      props: { text: "Help", delay: 0 },
      slots: {
        default: () =>
          h("button", { "aria-describedby": "existing" }, "Button"),
      },
      attachTo: document.body,
    });
    await nextTick();
    const button = wrapper.get("button");
    await button.trigger("focusin");
    expect(button.attributes("aria-describedby")).toMatch(/^existing /);

    await button.trigger("keydown", { key: "Escape" });
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
    expect(button.attributes("aria-describedby")).toBe("existing");
    wrapper.unmount();
  });

  it("supports delayed hover and custom content", async () => {
    vi.useFakeTimers();
    const wrapper = mount(NTooltip, {
      props: { text: "Ignored", delay: 200 },
      slots: {
        default: () => h(NButton, { label: "More" }),
        content: () => h("strong", "Custom help"),
      },
      attachTo: document.body,
    });
    await wrapper.get(".n-tooltip-trigger").trigger("mouseenter");
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
    await vi.advanceTimersByTimeAsync(200);
    await nextTick();
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe(
      "Custom help",
    );
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("does not open when disabled", async () => {
    const wrapper = mountTooltip({ disabled: true });
    await wrapper.get("button").trigger("focusin");
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
    wrapper.unmount();
  });

  it("flips placement when there is no room above", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(160);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(40);
    const wrapper = mountTooltip();
    vi.spyOn(
      wrapper.get("button").element,
      "getBoundingClientRect",
    ).mockReturnValue({
      left: 300,
      right: 400,
      top: 5,
      bottom: 35,
      width: 100,
      height: 30,
    } as DOMRect);

    await wrapper.get("button").trigger("focusin");
    await nextTick();
    expect(
      document.body.querySelector(".n-tooltip")?.getAttribute("data-placement"),
    ).toBe("bottom");
    wrapper.unmount();
  });
});
