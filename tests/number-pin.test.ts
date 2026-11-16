import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import { NFormField, NNumberInput, NPinInput } from "../src";

function mountNumber(props: Record<string, unknown> = {}) {
  const wrapper = mount(NNumberInput, {
    props: {
      modelValue: undefined,
      "onUpdate:modelValue": (value: unknown) =>
        wrapper.setProps({ modelValue: value as number | undefined }),
      ...props,
    },
  });
  return wrapper;
}

describe("NNumberInput", () => {
  it("steps with the buttons and clamps to min and max", async () => {
    const wrapper = mountNumber({ modelValue: 4, min: 0, max: 5, step: 1 });
    const [minus, plus] = wrapper.findAll("button");
    await plus!.trigger("click");
    expect(wrapper.props("modelValue")).toBe(5);
    expect(plus!.attributes("disabled")).toBeDefined();
    await minus!.trigger("click");
    expect(wrapper.props("modelValue")).toBe(4);
  });

  it("avoids float drift with decimal steps", async () => {
    const wrapper = mountNumber({ modelValue: 0.1, step: 0.2 });
    await wrapper.findAll("button")[1]!.trigger("click");
    expect(wrapper.props("modelValue")).toBe(0.3);
  });

  it("steps with the arrow keys", async () => {
    const wrapper = mountNumber({ modelValue: 1 });
    const input = wrapper.find("input");
    await input.trigger("keydown", { key: "ArrowUp" });
    await input.trigger("keydown", { key: "PageUp" });
    expect(wrapper.props("modelValue")).toBe(12);
  });

  it("commits typed text on change, clamped, and reverts invalid text", async () => {
    const wrapper = mountNumber({ modelValue: 2, max: 10 });
    const input = wrapper.find("input");
    await input.setValue("99");
    await input.trigger("change");
    expect(wrapper.props("modelValue")).toBe(10);
    await input.setValue("abc");
    await input.trigger("change");
    expect(wrapper.props("modelValue")).toBe(10);
    expect(input.element.value).toBe("10");
    await input.setValue("");
    await input.trigger("change");
    expect(wrapper.props("modelValue")).toBeUndefined();
  });

  it("sets spinbutton semantics and takes the id from its NFormField", () => {
    const wrapper = mount(NFormField, {
      props: { label: "Qty", error: true },
      slots: { default: () => h(NNumberInput, { modelValue: 3, min: 1 }) },
    });
    const input = wrapper.find("input");
    expect(input.attributes("role")).toBe("spinbutton");
    expect(input.attributes("aria-valuenow")).toBe("3");
    expect(input.attributes("aria-valuemin")).toBe("1");
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(wrapper.find("label").attributes("for")).toBe(
      input.attributes("id"),
    );
  });
});

function mountPin(props: Record<string, unknown> = {}) {
  const wrapper = mount(NPinInput, {
    attachTo: document.body,
    props: {
      modelValue: "",
      "onUpdate:modelValue": (value: unknown) =>
        wrapper.setProps({ modelValue: value as string }),
      ...props,
    },
  });
  return wrapper;
}

describe("NPinInput", () => {
  it("renders one cell per length", () => {
    expect(mountPin({ length: 4 }).findAll("input")).toHaveLength(4);
  });

  it("types a character per cell, moves on, and ignores rejected characters", async () => {
    const wrapper = mountPin({ length: 4 });
    const cells = wrapper.findAll("input");
    await cells[0]!.setValue("1");
    expect(document.activeElement).toBe(cells[1]!.element);
    await cells[1]!.setValue("x");
    expect(wrapper.props("modelValue")).toBe("1");
    expect(cells[1]!.element.value).toBe("");
    wrapper.unmount();
  });

  it("spreads pasted text over the cells and emits complete", async () => {
    const wrapper = mountPin({ length: 4 });
    await wrapper.findAll("input")[0]!.trigger("paste", {
      clipboardData: { getData: () => "12 34 99" },
    });
    expect(wrapper.props("modelValue")).toBe("1234");
    expect(wrapper.emitted("complete")![0]).toEqual(["1234"]);
    wrapper.unmount();
  });

  it("backspace clears the cell, or the previous one when empty", async () => {
    const wrapper = mountPin({ length: 3, modelValue: "12" });
    const cells = wrapper.findAll("input");
    await cells[2]!.trigger("keydown", { key: "Backspace" });
    expect(wrapper.props("modelValue")).toBe("1");
    expect(document.activeElement).toBe(cells[1]!.element);
    wrapper.unmount();
  });

  it("accepts letters only as alphanumeric and masks on request", async () => {
    const wrapper = mountPin({ length: 3, type: "alphanumeric", mask: true });
    const cells = wrapper.findAll("input");
    expect(cells[0]!.attributes("type")).toBe("password");
    await cells[0]!.setValue("a");
    expect(wrapper.props("modelValue")).toBe("a");
    wrapper.unmount();
  });

  it("submits the code through a hidden input named `name`", () => {
    const wrapper = mountPin({ length: 3, modelValue: "123", name: "otp" });
    const hidden = wrapper.find('input[type="hidden"]');
    expect(hidden.attributes("name")).toBe("otp");
    expect((hidden.element as HTMLInputElement).value).toBe("123");
  });
});
