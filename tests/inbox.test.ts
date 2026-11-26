import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NInbox } from "../src";

const slots = {
  rail: "<p>Folders</p>",
  "list-header": "<p>Search</p>",
  list: "<p>Messages</p>",
  "reader-header": "<p>Subject</p>",
  default: "<p>Body</p>",
};

describe("NInbox", () => {
  it("renders the rail, list and reader slots", () => {
    const wrapper = mount(NInbox, { slots });
    expect(wrapper.attributes("aria-label")).toBe("Inbox");
    expect(wrapper.find(".n-inbox-rail-content").text()).toBe("Folders");
    expect(wrapper.find(".n-inbox-list-header-content").text()).toBe("Search");
    expect(wrapper.find(".n-inbox-list-content").text()).toBe("Messages");
    expect(wrapper.find(".n-inbox-reader-header").text()).toBe("Subject");
    expect(wrapper.find(".n-inbox-reader-content").text()).toBe("Body");
  });

  it("leaves out the rail without a rail slot", () => {
    const wrapper = mount(NInbox, {
      slots: { list: slots.list, "list-header": slots["list-header"] },
    });
    expect(wrapper.find(".n-inbox-rail").exists()).toBe(false);
    expect(wrapper.find(".n-inbox-rail-show").exists()).toBe(false);
  });

  it("keeps the reader inert until a message is open", async () => {
    const wrapper = mount(NInbox, { slots });
    expect(wrapper.attributes("data-open")).toBeUndefined();
    expect(wrapper.find(".n-inbox-reader").attributes("inert")).toBeDefined();
    await wrapper.setProps({ open: true });
    expect(wrapper.attributes("data-open")).toBe("");
    expect(wrapper.find(".n-inbox-reader").attributes("inert")).toBeUndefined();
  });

  it.each([
    [".n-inbox-close", "click"],
    [".n-inbox-back", "click"],
    [".n-inbox-reader", "keydown"],
  ])("closes from %s (%s)", async (selector, type) => {
    const wrapper = mount(NInbox, { props: { open: true }, slots });
    await wrapper.find(selector).trigger(type, { key: "Escape" });
    expect(wrapper.emitted("update:open")![0]).toEqual([false]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("ignores other keys in the reader", async () => {
    const wrapper = mount(NInbox, { props: { open: true }, slots });
    await wrapper.find(".n-inbox-reader").trigger("keydown", { key: "a" });
    expect(wrapper.emitted("close")).toBeUndefined();
  });

  it("toggles the expanded reader and resets it when the message closes", async () => {
    const wrapper = mount(NInbox, { props: { open: true }, slots });
    const expand = wrapper.find(".n-inbox-expand");
    expect(expand.attributes("aria-label")).toBe("Full width");
    expect(expand.attributes("aria-pressed")).toBe("false");

    await expand.trigger("click");
    expect(wrapper.emitted("update:expanded")![0]).toEqual([true]);
    await wrapper.setProps({ expanded: true });
    expect(wrapper.attributes("data-expanded")).toBe("");
    expect(wrapper.find(".n-inbox-expand").attributes("aria-label")).toBe(
      "Show list",
    );

    await wrapper.setProps({ open: false });
    expect(wrapper.emitted("update:expanded")!.at(-1)).toEqual([false]);
  });

  it("hides and shows the rail", async () => {
    const wrapper = mount(NInbox, { slots });
    expect(wrapper.attributes("data-rail-closed")).toBeUndefined();
    await wrapper.find(".n-inbox-rail-top button").trigger("click");
    expect(wrapper.emitted("update:rail")![0]).toEqual([false]);

    await wrapper.setProps({ rail: false });
    expect(wrapper.attributes("data-rail-closed")).toBe("");
    await wrapper.find(".n-inbox-rail-show").trigger("click");
    expect(wrapper.emitted("update:rail")![1]).toEqual([true]);
  });

  it("uses custom rail icons", () => {
    const wrapper = mount(NInbox, {
      props: {
        hideRailIcon: "i-lucide-chevron-left",
        showRailIcon: "i-lucide-chevron-right",
      },
      slots,
    });
    expect(
      wrapper.find(".n-inbox-rail-top .i-lucide-chevron-left").exists(),
    ).toBe(true);
    expect(
      wrapper.find(".n-inbox-rail-show .i-lucide-chevron-right").exists(),
    ).toBe(true);
  });

  it("reflects the breakpoints and custom labels", () => {
    const wrapper = mount(NInbox, {
      props: {
        breakpoint: "md",
        railBreakpoint: "lg",
        closeLabel: "Schließen",
      },
      slots,
    });
    expect(wrapper.attributes("data-breakpoint")).toBe("md");
    expect(wrapper.attributes("data-rail-breakpoint")).toBe("lg");
    expect(wrapper.find(".n-inbox-close").attributes("aria-label")).toBe(
      "Schließen",
    );
  });
});
