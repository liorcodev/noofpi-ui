import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import {
  NCheckButton,
  NCheckbox,
  NCheckboxGroup,
  NFormField,
  NRadioGroup,
} from "../src";

const items = [
  { label: "A", value: "a", description: "first" },
  { label: "B", value: "b" },
  { label: "C", value: "c", disabled: true },
];

describe("NCheckButton", () => {
  it("toggles a boolean model and switches variant", async () => {
    const wrapper = mount(NCheckButton, {
      props: {
        label: "Bold",
        modelValue: false,
        "onUpdate:modelValue": (value: unknown) =>
          wrapper.setProps({ modelValue: value as boolean }),
      },
    });
    expect(wrapper.attributes("aria-pressed")).toBe("false");
    expect(wrapper.attributes("data-variant")).toBe("outline");
    await wrapper.trigger("click");
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([true]);
    expect(wrapper.attributes("aria-pressed")).toBe("true");
    expect(wrapper.attributes("data-variant")).toBe("solid");
  });

  it("adds and removes its value in an array model", async () => {
    const wrapper = mount(NCheckButton, {
      props: {
        value: "a",
        label: "A",
        modelValue: ["b"],
        "onUpdate:modelValue": (value: unknown) =>
          wrapper.setProps({ modelValue: value as unknown[] }),
      },
    });
    await wrapper.trigger("click");
    await wrapper.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([
      [["b", "a"]],
      [["b"]],
    ]);
  });
});

describe("NCheckboxGroup", () => {
  it("renders items and updates the array model", async () => {
    const wrapper = mount(NCheckboxGroup, {
      props: {
        items,
        modelValue: ["a"],
        "onUpdate:modelValue": (value: unknown) =>
          wrapper.setProps({ modelValue: value as unknown[] }),
      },
    });
    const inputs = wrapper.findAll("input");
    expect(inputs).toHaveLength(3);
    expect((inputs[0]!.element as HTMLInputElement).checked).toBe(true);
    expect(wrapper.text()).toContain("first");
    expect(inputs[2]!.attributes("disabled")).toBeDefined();
    await inputs[1]!.setValue(true);
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([["a", "b"]]);
  });

  it("renders toggle buttons with `buttons`", async () => {
    const wrapper = mount(NCheckboxGroup, {
      props: { items, buttons: true, modelValue: [] },
    });
    expect(wrapper.findAll("input")).toHaveLength(0);
    await wrapper.findAll("button")[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([["b"]]);
  });

  it("carries the field id once instead of repeating it on every item", () => {
    const wrapper = mount(NFormField, {
      props: { error: "Pick one" },
      slots: { default: () => h(NCheckboxGroup, { items }) },
    });
    const ids = wrapper.findAll("[id]").map((node) => node.attributes("id"));
    expect(wrapper.get("fieldset").attributes("id")).toBeDefined();
    expect(new Set(ids).size).toBe(ids.length);
    expect(wrapper.get("input").attributes("aria-invalid")).toBe("true");
  });
});

describe("NRadioGroup", () => {
  it("selects one value and shares a name", async () => {
    const wrapper = mount(NRadioGroup, {
      props: { items, modelValue: "a" },
    });
    const inputs = wrapper.findAll("input");
    expect((inputs[0]!.element as HTMLInputElement).checked).toBe(true);
    expect(new Set(inputs.map((input) => input.attributes("name"))).size).toBe(
      1,
    );
    await inputs[1]!.setValue(true);
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["b"]);
  });

  it("marks the selected button in `buttons` mode", async () => {
    const wrapper = mount(NRadioGroup, {
      props: { items, buttons: true, modelValue: "b" },
    });
    const buttons = wrapper.findAll("button");
    expect(buttons.map((button) => button.attributes("aria-checked"))).toEqual([
      "false",
      "true",
      "false",
    ]);
    await buttons[0]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["a"]);
  });
});

describe("NCheckbox", () => {
  it("toggles a boolean v-model and renders the label", async () => {
    const wrapper = mount(NCheckbox, {
      props: {
        label: "Remember me",
        modelValue: false,
        "onUpdate:modelValue": (value: unknown) =>
          wrapper.setProps({ modelValue: value as boolean }),
      },
    });
    expect(wrapper.text()).toBe("Remember me");
    await wrapper.get("input").setValue(true);
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([true]);
    expect((wrapper.get("input").element as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it("adds and removes its value in an array model", async () => {
    const wrapper = mount(NCheckbox, {
      props: {
        value: "a",
        modelValue: ["b"],
        "onUpdate:modelValue": (value: unknown) =>
          wrapper.setProps({ modelValue: value as unknown[] }),
      },
    });
    await wrapper.get("input").setValue(true);
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([["b", "a"]]);
    await wrapper.get("input").setValue(false);
    expect(wrapper.emitted("update:modelValue")![1]).toEqual([["b"]]);
  });

  it("sends class to the wrapper and other attributes to the input", () => {
    const wrapper = mount(NCheckbox, {
      attrs: { class: "mine", name: "terms", disabled: true },
    });
    expect(wrapper.classes()).toContain("mine");
    expect(wrapper.get("input").attributes("name")).toBe("terms");
    expect(wrapper.get("input").attributes("disabled")).toBeDefined();
  });

  it("picks up the id and error state from an NFormField", () => {
    const wrapper = mount(NFormField, {
      props: { error: "Required", help: "x" },
      slots: { default: NCheckbox },
    });
    const input = wrapper.get("input");
    expect(input.attributes("id")).toBe(
      wrapper.get("[id$='-message']").attributes("id")?.replace("-message", ""),
    );
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(input.attributes("aria-describedby")).toContain("-message");
  });
});
