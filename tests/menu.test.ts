import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { NAvatar, NButton, NMenu } from "../src";

const mountMenu = (
  props = {},
  slot: () => unknown = () => h(NButton, { label: "Open" }),
) =>
  mount(NMenu, {
    props: {
      items: [{ label: "Profile", to: "/me" }, { label: "Out" }],
      // In place, so the panel is inside the wrapper; the teleport has its own tests
      to: false,
      ...props,
    },
    slots: { default: slot as never },
    attachTo: document.body,
  });

describe("NMenu", () => {
  it("opens from a button trigger and wires up its aria attributes", async () => {
    const wrapper = mountMenu();
    const button = wrapper.get("button");
    expect(button.attributes("aria-haspopup")).toBe("menu");
    expect(button.attributes("aria-expanded")).toBe("false");
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);

    await button.trigger("click");
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);
    expect(button.attributes("aria-expanded")).toBe("true");
    expect(button.attributes("aria-controls")).toBe(
      wrapper.get('[role="menu"]').attributes("id"),
    );
    wrapper.unmount();
  });

  it("makes a non-focusable trigger such as an avatar a button itself", async () => {
    const wrapper = mountMenu({}, () => h(NAvatar, { alt: "Jane Doe" }));
    const trigger = wrapper.get(".n-menu-trigger");
    expect(trigger.attributes("role")).toBe("button");
    expect(trigger.attributes("tabindex")).toBe("0");
    expect(trigger.attributes("aria-haspopup")).toBe("menu");

    await trigger.trigger("keydown", { key: "Enter" });
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);
    expect(trigger.attributes("aria-expanded")).toBe("true");
    wrapper.unmount();
  });

  it("renders links, buttons, labels and separators between groups", async () => {
    const wrapper = mountMenu({
      items: [
        [{ type: "label", label: "Jane", description: "jane@example.com" }],
        [
          { label: "Docs", to: "/docs", target: "_blank", shortcut: "D" },
          { label: "Delete", color: "error", disabled: true },
        ],
      ],
    });
    await wrapper.get("button").trigger("click");
    expect(wrapper.get(".n-menu-label-description").text()).toBe(
      "jane@example.com",
    );
    expect(wrapper.findAll(".n-menu-separator")).toHaveLength(1);
    const [link, button] = wrapper.findAll('[role="menuitem"]');
    expect(link?.element.tagName).toBe("A");
    expect(link?.attributes("href")).toBe("/docs");
    expect(link?.attributes("rel")).toBe("noopener noreferrer");
    expect(link?.get(".n-menu-shortcut").text()).toBe("D");
    expect(button?.attributes("aria-disabled")).toBe("true");
    expect(button?.attributes("data-color")).toBe("error");
    wrapper.unmount();
  });

  it("selects an item and closes, unless the handler prevents it", async () => {
    const onSelect = vi.fn();
    const keep = vi.fn((event: Event) => event.preventDefault());
    const disabled = vi.fn();
    const wrapper = mountMenu({
      items: [
        { label: "Save", onSelect },
        { label: "Keep", onSelect: keep },
        { label: "Nope", disabled: true, onSelect: disabled },
      ],
    });
    const trigger = wrapper.get("button");
    await trigger.trigger("click");

    const items = () => wrapper.findAll('[role="menuitem"]');
    await items()[1]!.trigger("click");
    expect(keep).toHaveBeenCalled();
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);

    await items()[2]!.trigger("click");
    expect(disabled).not.toHaveBeenCalled();
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);

    await items()[0]!.trigger("click");
    expect(onSelect).toHaveBeenCalledOnce();
    expect(wrapper.emitted("select")?.at(-1)?.[0]).toMatchObject({
      label: "Save",
    });
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    expect(document.activeElement).toBe(trigger.element);
    wrapper.unmount();
  });

  it("closes on Escape and on a click outside", async () => {
    const wrapper = mountMenu();
    const trigger = wrapper.get("button");
    await trigger.trigger("click");
    await wrapper.get('[role="menu"]').trigger("keydown", { key: "Escape" });
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    expect(document.activeElement).toBe(trigger.element);

    await trigger.trigger("click");
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("moves focus between enabled items with the arrow keys", async () => {
    const wrapper = mountMenu({
      items: [{ label: "A" }, { label: "B", disabled: true }, { label: "C" }],
    });
    await wrapper.get("button").trigger("keydown", { key: "ArrowDown" });
    await wrapper.vm.$nextTick();
    const items = wrapper.findAll('[role="menuitem"]');
    expect(document.activeElement).toBe(items[0]!.element);

    await wrapper.get('[role="menu"]').trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[2]!.element);
    await wrapper.get('[role="menu"]').trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[0]!.element);
    wrapper.unmount();
  });

  it("doesn't open when disabled", async () => {
    const wrapper = mountMenu({ disabled: true });
    await wrapper.get("button").trigger("click");
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    wrapper.unmount();
  });
});

describe("NMenu teleport", () => {
  const panel = () => document.body.querySelector<HTMLElement>('[role="menu"]');

  it("renders the panel in the body, outside a clipping ancestor", async () => {
    const wrapper = mountMenu({ to: "body" });
    await wrapper.get("button").trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    expect(panel()?.closest(".n-menu")).toBeNull();
    expect(document.body.contains(panel())).toBe(true);
    expect(panel()?.style.left).not.toBe("");
    expect(panel()?.style.top).not.toBe("");
    wrapper.unmount();
    expect(panel()).toBeNull();
  });

  it("handles keys and outside clicks of the teleported panel", async () => {
    const wrapper = mountMenu({
      to: "body",
      items: [{ label: "A" }, { label: "B" }],
    });
    await wrapper.get("button").trigger("click");
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    // A click inside the panel isn't an outside click
    panel()!.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(panel()).not.toBeNull();

    const items = panel()!.querySelectorAll('[role="menuitem"]');
    // A click without a pointer opens the menu on its first item
    expect(document.activeElement).toBe(items[0]);
    panel()!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
    expect(document.activeElement).toBe(items[1]);

    panel()!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await wrapper.vm.$nextTick();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(wrapper.get("button").element);
    wrapper.unmount();
  });
});

describe("NMenu at the edge of the viewport", () => {
  const PANEL = { width: 200, height: 100 };

  // The layout isn't computed in the test DOM, so the trigger's box and the menu's size are given
  const mountAt = async (anchor: Partial<DOMRect>, props = {}) => {
    const rect = { left: 0, right: 0, top: 0, bottom: 0, width: 0, ...anchor };
    const wrapper = mountMenu(props);
    vi.spyOn(
      wrapper.get(".n-menu").element,
      "getBoundingClientRect",
    ).mockReturnValue(rect as DOMRect);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(
      PANEL.width,
    );
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(
      PANEL.height,
    );
    await wrapper.get("button").trigger("click");
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    return wrapper;
  };

  const middle = { top: 300, bottom: 340 };

  afterEach(() => vi.restoreAllMocks());

  it("keeps the requested placement when there's room", async () => {
    const wrapper = await mountAt({
      ...middle,
      left: 300,
      right: 400,
      width: 100,
    });
    expect(wrapper.get(".n-menu").attributes("data-placement")).toBe(
      "bottom-start",
    );
    wrapper.unmount();
  });

  it("aligns to the trigger's right edge when it would overflow the right side", async () => {
    const wrapper = await mountAt({
      ...middle,
      left: window.innerWidth - 60,
      right: window.innerWidth - 10,
      width: 50,
    });
    expect(wrapper.get(".n-menu").attributes("data-placement")).toBe(
      "bottom-end",
    );
    wrapper.unmount();
  });

  it("aligns to the trigger's left edge when it would overflow the left side", async () => {
    const wrapper = await mountAt(
      { ...middle, left: 10, right: 60, width: 50 },
      { placement: "bottom-end" },
    );
    expect(wrapper.get(".n-menu").attributes("data-placement")).toBe(
      "bottom-start",
    );
    wrapper.unmount();
  });

  it("opens upwards when there's no room below", async () => {
    const wrapper = await mountAt({
      left: 300,
      right: 400,
      width: 100,
      top: window.innerHeight - 50,
      bottom: window.innerHeight - 10,
    });
    expect(wrapper.get(".n-menu").attributes("data-placement")).toBe(
      "top-start",
    );
    wrapper.unmount();
  });

  it("opens downwards when a menu placed above has no room", async () => {
    const wrapper = await mountAt(
      { left: 300, right: 400, width: 100, top: 10, bottom: 50 },
      { placement: "top" },
    );
    expect(wrapper.get(".n-menu").attributes("data-placement")).toBe("bottom");
    wrapper.unmount();
  });
});
