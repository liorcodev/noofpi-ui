import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NAccordion } from "../src";

const items = [
  { label: "One", value: "one", content: "First" },
  { label: "Two", value: "two", disabled: true },
  { label: "Three", value: "three" },
];

const triggers = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll(".n-accordion-trigger");

describe("NAccordion", () => {
  it("opens one section at a time and closes it again when collapsible", async () => {
    const wrapper = mount(NAccordion, {
      props: {
        items,
        modelValue: "one",
        "onUpdate:modelValue": (value: unknown) =>
          wrapper.setProps({ modelValue: value as string }),
      },
      slots: { three: "Third" },
    });
    const [one, , three] = triggers(wrapper);
    expect(one!.attributes("aria-expanded")).toBe("true");
    expect(wrapper.text()).toContain("First");

    await three!.trigger("click");
    expect(one!.attributes("aria-expanded")).toBe("false");
    expect(three!.attributes("aria-expanded")).toBe("true");
    expect(wrapper.text()).toContain("Third");

    await three!.trigger("click");
    expect(three!.attributes("aria-expanded")).toBe("false");
  });

  it("keeps the open section open without collapsible", async () => {
    const wrapper = mount(NAccordion, {
      props: { items, modelValue: "one", collapsible: false },
    });
    await triggers(wrapper)[0]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("emits an array with type multiple and ignores disabled sections", async () => {
    const wrapper = mount(NAccordion, {
      props: { items, type: "multiple", modelValue: ["one"] },
    });
    const [, two, three] = triggers(wrapper);
    await two!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    await three!.trigger("click");
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([
      ["one", "three"],
    ]);
  });

  it("links triggers to panels and makes closed panels inert", () => {
    const wrapper = mount(NAccordion, { props: { items, modelValue: "one" } });
    const trigger = triggers(wrapper)[0]!;
    const panels = wrapper.findAll(".n-accordion-panel");
    expect(trigger.attributes("aria-controls")).toBe(
      panels[0]!.attributes("id"),
    );
    expect(panels[0]!.attributes("aria-labelledby")).toBe(
      trigger.attributes("id"),
    );
    expect(panels[0]!.attributes("inert")).toBeUndefined();
    expect(panels[2]!.attributes("inert")).toBeDefined();
  });

  it("moves focus with arrow keys, skipping disabled headers", async () => {
    const wrapper = mount(NAccordion, {
      props: { items },
      attachTo: document.body,
    });
    const [one, , three] = triggers(wrapper);
    (one!.element as HTMLElement).focus();
    await one!.trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(three!.element);
    await three!.trigger("keydown", { key: "Home" });
    expect(document.activeElement).toBe(one!.element);
    wrapper.unmount();
  });
});
