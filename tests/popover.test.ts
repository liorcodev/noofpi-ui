import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";
import { NAvatar, NButton, NPopover } from "../src";

const mountPopover = (props = {}, slots = {}) =>
  mount(NPopover, {
    props,
    slots: {
      trigger: () => h(NButton, { label: "Open" }),
      content: ({ close }: { close: () => void }) =>
        h("div", [
          h("span", "Details"),
          h("button", { onClick: close }, "Done"),
        ]),
      ...slots,
    },
    attachTo: document.body,
  });

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("NPopover", () => {
  it("opens from a button and wires the trigger to the teleported dialog", async () => {
    const wrapper = mountPopover();
    await nextTick();
    const trigger = wrapper.get("button");
    expect(trigger.attributes("aria-haspopup")).toBe("dialog");
    expect(trigger.attributes("aria-expanded")).toBe("false");

    await trigger.trigger("click");
    const panel = document.body.querySelector<HTMLElement>(
      '.n-popover[role="dialog"]',
    )!;
    expect(panel.textContent).toContain("Details");
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(trigger.attributes("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-label")).toBe("Popover");
    wrapper.unmount();
  });

  it("closes through slot control and restores focus", async () => {
    const wrapper = mountPopover();
    const trigger = wrapper.get("button");
    await trigger.trigger("click");
    await document.body
      .querySelector<HTMLElement>(".n-popover button")!
      .click();
    await nextTick();

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger.element);
    wrapper.unmount();
  });

  it("closes on Escape and outside interaction when dismissible", async () => {
    const wrapper = mountPopover();
    const trigger = wrapper.get("button");
    await trigger.trigger("click");
    document.body
      .querySelector<HTMLElement>(".n-popover")!
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    await nextTick();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();

    await trigger.trigger("click");
    document.body.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );
    await nextTick();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });

  it("keeps a non-dismissible popover open and does not open while disabled", async () => {
    const wrapper = mountPopover({ dismissible: false });
    const trigger = wrapper.get("button");
    await trigger.trigger("click");
    document.body.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );
    await nextTick();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    wrapper.unmount();

    const disabled = mountPopover({ disabled: true });
    await disabled.get("button").trigger("click");
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    disabled.unmount();
  });

  it("supports non-focusable triggers and hover delays", async () => {
    vi.useFakeTimers();
    const wrapper = mountPopover(
      { trigger: "hover", delay: 50, hideDelay: 25 },
      { trigger: () => h(NAvatar, { alt: "Jane Doe" }) },
    );
    await nextTick();
    const root = wrapper.get(".n-popover-trigger");
    expect(root.attributes("role")).toBe("button");
    expect(root.attributes("tabindex")).toBe("0");

    await root.trigger("mouseenter");
    await vi.advanceTimersByTimeAsync(50);
    await nextTick();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();

    await root.trigger("mouseleave");
    await vi.advanceTimersByTimeAsync(25);
    await nextTick();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });

  it("flips and shifts when the requested placement would leave the viewport", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(180);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(100);
    const wrapper = mountPopover({ placement: "bottom-end" });
    vi.spyOn(
      wrapper.get("button").element,
      "getBoundingClientRect",
    ).mockReturnValue({
      left: window.innerWidth - 30,
      right: window.innerWidth - 5,
      top: window.innerHeight - 30,
      bottom: window.innerHeight - 5,
      width: 25,
      height: 25,
    } as DOMRect);

    await wrapper.get("button").trigger("click");
    await nextTick();
    const panel = document.body.querySelector<HTMLElement>(".n-popover")!;
    expect(panel.getAttribute("data-side")).toBe("top");
    expect(Number.parseFloat(panel.style.left)).toBeGreaterThanOrEqual(8);
    wrapper.unmount();
  });
});
