import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NFormField, NSlider, NSwitch } from "../src";

describe("NSwitch", () => {
  it("toggles a boolean model and exposes switch semantics", async () => {
    const wrapper = mount(NSwitch, {
      props: {
        label: "Notifications",
        modelValue: false,
        "onUpdate:modelValue": (value: boolean | undefined) =>
          wrapper.setProps({ modelValue: value }),
      },
    });
    const input = wrapper.get("input");
    expect(input.attributes("role")).toBe("switch");
    expect(wrapper.get(".n-switch-label").text()).toBe("Notifications");
    await input.setValue(true);
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([true]);
    expect((input.element as HTMLInputElement).checked).toBe(true);
  });

  it("puts class on the wrapper and other attributes on the input", () => {
    const wrapper = mount(NSwitch, {
      attrs: { class: "mine", name: "mail", disabled: true },
      props: { color: "success", size: "lg" },
    });
    expect(wrapper.classes()).toContain("mine");
    expect(wrapper.attributes("data-color")).toBe("success");
    expect(wrapper.attributes("data-size")).toBe("lg");
    expect(wrapper.get("input").attributes("name")).toBe("mail");
    expect(wrapper.get("input").attributes("disabled")).toBeDefined();
  });

  it("picks up the id and error state from an NFormField", () => {
    const wrapper = mount(NFormField, {
      props: { error: "Required" },
      slots: { default: NSwitch },
    });
    const input = wrapper.get("input");
    expect(input.attributes("id")).toBeDefined();
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(input.attributes("aria-describedby")).toContain("-message");
  });
});

describe("NSlider", () => {
  it("emits a number and reflects the fill in --n-slider-pct", async () => {
    const wrapper = mount(NSlider, {
      props: {
        min: 0,
        max: 200,
        modelValue: 50,
        "onUpdate:modelValue": (value: number | undefined) =>
          wrapper.setProps({ modelValue: value }),
      },
    });
    const input = wrapper.get("input");
    expect(input.attributes("type")).toBe("range");
    expect(
      (wrapper.element as HTMLElement).style.getPropertyValue("--n-slider-pct"),
    ).toBe("25");
    await input.setValue("150");
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([150]);
    expect(
      (wrapper.element as HTMLElement).style.getPropertyValue("--n-slider-pct"),
    ).toBe("75");
  });

  it("starts at min without a model and clamps out-of-range values", () => {
    const empty = mount(NSlider, { props: { min: 10, max: 20 } });
    expect((empty.get("input").element as HTMLInputElement).value).toBe("10");
    const over = mount(NSlider, { props: { max: 10, modelValue: 99 } });
    expect((over.get("input").element as HTMLInputElement).value).toBe("10");
  });

  it("labels the input and shows the value", () => {
    const wrapper = mount(NSlider, {
      props: { label: "Volume", showValue: true, modelValue: 30 },
    });
    const labelId = wrapper.get(".n-slider-label").attributes("id");
    expect(wrapper.get("input").attributes("aria-labelledby")).toBe(labelId);
    expect(wrapper.get(".n-slider-value").text()).toBe("30");
  });
});
