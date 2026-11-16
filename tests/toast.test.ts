import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NToaster, toast, useToast } from "../src";

describe("useToast", () => {
  afterEach(() => useToast().clear());

  it("shares the imported toast object", () => {
    expect(useToast()).toBe(toast);
  });

  it("adds, updates and removes toasts, calling onClose once", () => {
    const { toasts, add, update, remove } = useToast();
    const onClose = vi.fn();
    const { id } = add({ title: "Saved", onClose });
    expect(toasts.value.map((t) => t.title)).toEqual(["Saved"]);

    update(id, { title: "Done" });
    expect(toasts.value[0]!.title).toBe("Done");

    remove(id);
    remove(id);
    expect(toasts.value).toEqual([]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("updates in place when the id is reused, and clear removes all", () => {
    const { toasts, add, clear } = useToast();
    const onClose = vi.fn();
    add({ id: "a", title: "One", onClose });
    add({ id: "a", title: "Two", onClose });
    add({ title: "Three" });
    expect(toasts.value.map((t) => t.title)).toEqual(["Two", "Three"]);

    clear();
    expect(toasts.value).toEqual([]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("NToaster", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    useToast().clear();
    vi.useRealTimers();
  });

  it("renders toasts in the chosen position with their color", async () => {
    const wrapper = mount(NToaster, { props: { position: "top-center" } });
    useToast().add({ title: "Oops", description: "Try again", color: "error" });
    await wrapper.vm.$nextTick();

    expect(wrapper.attributes("data-position")).toBe("top-center");
    const toast = wrapper.get(".n-toast");
    expect(toast.attributes("data-color")).toBe("error");
    expect(toast.attributes("role")).toBe("alert");
    expect(toast.text()).toContain("Oops");
    expect(toast.text()).toContain("Try again");
    wrapper.unmount();
  });

  it("closes with the close button and runs an action's handler", async () => {
    const wrapper = mount(NToaster);
    const onClick = vi.fn();
    const onClose = vi.fn();
    useToast().add({
      title: "Hi",
      actions: [{ label: "Undo", onClick }],
      onClose,
    });
    await wrapper.vm.$nextTick();

    const buttons = wrapper.findAll("button");
    await buttons[0]!.trigger("click");
    expect(onClick).toHaveBeenCalledTimes(1);

    await wrapper.get(".n-toast-close").trigger("click");
    expect(useToast().toasts.value).toEqual([]);
    expect(onClose).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("closes after its duration, but not while hovered or with duration 0", async () => {
    const wrapper = mount(NToaster, { props: { duration: 1000 } });
    const { add, toasts } = useToast();
    add({ title: "Timed" });
    add({ title: "Sticky", duration: 0 });
    await wrapper.vm.$nextTick();

    await wrapper.findAll(".n-toast")[0]!.trigger("mouseenter");
    vi.advanceTimersByTime(5000);
    expect(toasts.value).toHaveLength(2);

    await wrapper.findAll(".n-toast")[0]!.trigger("mouseleave");
    vi.advanceTimersByTime(1000);
    expect(toasts.value.map((t) => t.title)).toEqual(["Sticky"]);
    wrapper.unmount();
  });

  it("shows at most `max` toasts", async () => {
    const wrapper = mount(NToaster, { props: { max: 2 } });
    const { add } = useToast();
    for (const title of ["1", "2", "3"]) add({ title });
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll(".n-toast")).toHaveLength(2);
    wrapper.unmount();
  });
});
