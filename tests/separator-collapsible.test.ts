import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NCollapsible, NSeparator } from "../src";

describe("NSeparator", () => {
  it("is a plain horizontal separator by default", () => {
    const el = mount(NSeparator).find(".n-separator");
    expect(el.attributes("role")).toBe("separator");
    expect(el.attributes("aria-orientation")).toBeUndefined();
    expect(el.attributes("data-labeled")).toBeUndefined();
    expect(el.find(".n-separator-label").exists()).toBe(false);
  });

  it("shows the label prop or the default slot, with its alignment", () => {
    const withProp = mount(NSeparator, {
      props: { label: "or", align: "start" },
    });
    expect(withProp.find(".n-separator-label").text()).toBe("or");
    expect(withProp.attributes("data-labeled")).toBeDefined();
    expect(withProp.attributes("data-align")).toBe("start");

    const withSlot = mount(NSeparator, {
      props: { label: "or" },
      slots: { default: "Next" },
    });
    expect(withSlot.find(".n-separator-label").text()).toBe("Next");
  });

  it("reports a vertical orientation and can be decorative", () => {
    const vertical = mount(NSeparator, { props: { orientation: "vertical" } });
    expect(vertical.attributes("aria-orientation")).toBe("vertical");

    const decorative = mount(NSeparator, {
      props: { orientation: "vertical", decorative: true },
    });
    expect(decorative.attributes("role")).toBe("none");
    expect(decorative.attributes("aria-orientation")).toBeUndefined();
  });
});

describe("NCollapsible", () => {
  it("toggles on its own without a v-model", async () => {
    const wrapper = mount(NCollapsible, {
      props: { label: "More" },
      slots: { default: "Hidden text" },
    });
    const trigger = wrapper.find(".n-collapsible-trigger");
    const panel = wrapper.find(".n-collapsible-panel");
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(panel.attributes("inert")).toBeDefined();

    await trigger.trigger("click");
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(panel.attributes("inert")).toBeUndefined();
    expect(wrapper.attributes("data-open")).toBeDefined();
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([true]);
  });

  it("follows the v-model and links the trigger to the panel", () => {
    const wrapper = mount(NCollapsible, {
      props: { label: "More", modelValue: true },
    });
    const trigger = wrapper.find(".n-collapsible-trigger");
    const panel = wrapper.find(".n-collapsible-panel");
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(trigger.attributes("aria-controls")).toBe(panel.attributes("id"));
    expect(panel.attributes("aria-labelledby")).toBe(trigger.attributes("id"));
  });

  it("does not toggle when disabled and passes the state to the label slot", async () => {
    const wrapper = mount(NCollapsible, {
      props: { disabled: true },
      slots: { label: ({ open }: { open: boolean }) => `State ${open}` },
    });
    expect(wrapper.find(".n-collapsible-trigger").text()).toBe("State false");
    await wrapper.find(".n-collapsible-trigger").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
