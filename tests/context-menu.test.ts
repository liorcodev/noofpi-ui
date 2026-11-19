import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NContextMenu } from "../src";

const mountMenu = (props = {}) =>
  mount(NContextMenu, {
    props: {
      items: [{ label: "Copy" }, { label: "Delete", disabled: true }],
      ...props,
    },
    slots: { default: '<p class="area">Area</p>' },
    attachTo: document.body,
  });

const menu = () => document.body.querySelector('[role="menu"]');

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("NContextMenu", () => {
  it("opens on right click at the pointer and blocks the browser menu", async () => {
    const wrapper = mountMenu();
    expect(menu()).toBeNull();

    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 40,
      clientY: 60,
    });
    wrapper.get(".area").element.dispatchEvent(event);
    await nextTick();
    await nextTick();

    expect(event.defaultPrevented).toBe(true);
    expect(menu()).not.toBeNull();
    expect(menu()!.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
    wrapper.unmount();
  });

  it("leaves the browser menu alone when disabled", async () => {
    const wrapper = mountMenu({ disabled: true });
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    wrapper.get(".area").element.dispatchEvent(event);
    await nextTick();
    expect(event.defaultPrevented).toBe(false);
    expect(menu()).toBeNull();
    wrapper.unmount();
  });

  it("opens from the keyboard with Shift+F10 and focuses the first item", async () => {
    const wrapper = mountMenu();
    await wrapper.get(".n-context-menu").trigger("keydown", {
      key: "F10",
      shiftKey: true,
    });
    await nextTick();
    await nextTick();
    await nextTick();
    expect(menu()).not.toBeNull();
    expect(document.activeElement).toBe(
      menu()!.querySelector('[role="menuitem"]'),
    );
    wrapper.unmount();
  });

  it("emits select, runs onSelect and closes; disabled items do nothing", async () => {
    const onSelect = vi.fn();
    const wrapper = mountMenu({
      items: [
        { label: "Copy", onSelect },
        { label: "Delete", disabled: true },
      ],
    });
    await wrapper.get(".area").trigger("contextmenu");
    await nextTick();

    const [copy, del] = Array.from(
      menu()!.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    );
    del!.click();
    await nextTick();
    expect(wrapper.emitted("select")).toBeUndefined();
    expect(menu()).not.toBeNull();

    copy!.click();
    await nextTick();
    expect(onSelect).toHaveBeenCalledOnce();
    expect(wrapper.emitted("select")![0]![0]).toMatchObject({ label: "Copy" });
    await vi.waitFor(() => expect(menu()).toBeNull());
    wrapper.unmount();
  });

  it("closes on Escape and on a pointer press outside", async () => {
    const wrapper = mountMenu();
    await wrapper.get(".area").trigger("contextmenu");
    await nextTick();
    menu()!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await vi.waitFor(() => expect(menu()).toBeNull());

    await wrapper.get(".area").trigger("contextmenu");
    await nextTick();
    expect(menu()).not.toBeNull();
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await vi.waitFor(() => expect(menu()).toBeNull());
    wrapper.unmount();
  });

  it("opens on a touch long press", async () => {
    vi.useFakeTimers();
    const wrapper = mountMenu();
    const area = wrapper.get(".area").element;
    const down = new Event("pointerdown", { bubbles: true });
    Object.assign(down, { pointerType: "touch", clientX: 10, clientY: 10 });
    area.dispatchEvent(down);
    vi.advanceTimersByTime(600);
    await nextTick();
    expect(menu()).not.toBeNull();
    wrapper.unmount();
  });

  it("doesn't open when a long press is released early", async () => {
    vi.useFakeTimers();
    const wrapper = mountMenu();
    const area = wrapper.get(".area").element;
    const down = new Event("pointerdown", { bubbles: true });
    Object.assign(down, { pointerType: "touch", clientX: 10, clientY: 10 });
    area.dispatchEvent(down);
    area.dispatchEvent(new Event("pointerup", { bubbles: true }));
    vi.advanceTimersByTime(600);
    await nextTick();
    expect(menu()).toBeNull();
    wrapper.unmount();
  });

  it("lets a nested context menu handle the event first", async () => {
    const wrapper = mount(NContextMenu, {
      props: { items: [{ label: "Outer" }] },
      slots: {
        default: `<div class="inner-host"></div>`,
      },
      attachTo: document.body,
    });
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    event.preventDefault();
    wrapper.get(".inner-host").element.dispatchEvent(event);
    await nextTick();
    expect(menu()).toBeNull();
    wrapper.unmount();
  });
});
