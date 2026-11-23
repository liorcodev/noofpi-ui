import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NToggleGroup } from "../src";

const items = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month", disabled: true },
  { value: "year", label: "Year" },
];

describe("NToggleGroup", () => {
  it("is a radio group where one item is checked and only it is a tab stop", async () => {
    const wrapper = mount(NToggleGroup, {
      props: { items, modelValue: "week", label: "Range" },
    });
    expect(wrapper.attributes("role")).toBe("radiogroup");
    expect(wrapper.attributes("aria-label")).toBe("Range");
    const buttons = wrapper.findAll("button");
    expect(buttons.map((b) => b.attributes("aria-checked"))).toEqual([
      "false",
      "true",
      "false",
      "false",
    ]);
    expect(buttons.map((b) => b.attributes("tabindex"))).toEqual([
      "-1",
      undefined,
      "-1",
      "-1",
    ]);

    await buttons[3]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual(["year"]);
    await buttons[2]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
  });

  it("moves with the arrow keys, skipping disabled items, and selects", async () => {
    const wrapper = mount(NToggleGroup, {
      props: { items, modelValue: "week" },
      attachTo: document.body,
    });
    const buttons = wrapper.findAll("button");
    (buttons[1]!.element as HTMLElement).focus();
    await buttons[1]!.trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual(["year"]);
    expect(document.activeElement).toBe(buttons[3]!.element);

    await buttons[3]!.trigger("keydown", { key: "Home" });
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual(["day"]);
    wrapper.unmount();
  });

  it("toggles each item on its own with multiple", async () => {
    const wrapper = mount(NToggleGroup, {
      props: { items, multiple: true, modelValue: ["day"] },
    });
    expect(wrapper.attributes("role")).toBe("group");
    const buttons = wrapper.findAll("button");
    expect(buttons[0]!.attributes("aria-pressed")).toBe("true");
    expect(buttons[1]!.attributes("aria-pressed")).toBe("false");

    await buttons[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([
      ["day", "week"],
    ]);
    await buttons[0]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([["week"]]);
  });

  it("starts from an empty array when there is no model with multiple", async () => {
    const wrapper = mount(NToggleGroup, {
      props: { items, multiple: true },
    });
    await wrapper.findAll("button")[0]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([["day"]]);
  });

  it("names an icon-only item and disables every item with the group", async () => {
    const wrapper = mount(NToggleGroup, {
      props: {
        items: [
          { value: "list", icon: "i-lucide-list", ariaLabel: "List" },
          { value: "grid", icon: "i-lucide-grid-2x2", ariaLabel: "Grid" },
        ],
        modelValue: "list",
        disabled: true,
      },
    });
    const buttons = wrapper.findAll("button");
    expect(buttons[0]!.attributes("aria-label")).toBe("List");
    expect(buttons.every((b) => b.attributes("disabled") !== undefined)).toBe(
      true,
    );
    expect(wrapper.attributes("aria-disabled")).toBe("true");
  });

  it("renders the item slot", () => {
    const wrapper = mount(NToggleGroup, {
      props: { items, modelValue: "day" },
      slots: {
        item: `<template #item="{ item }">#{{ item.value }}</template>`,
      },
    });
    expect(wrapper.findAll("button")[0]!.text()).toBe("#day");
  });
});
