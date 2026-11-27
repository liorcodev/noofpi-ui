import { DOMWrapper, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import { NFormField, NSelect, NTabs } from "../src";

// The list is teleported to the body
const page = new DOMWrapper(document.body);

const items = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana", disabled: true },
  { label: "Cherry", value: "cherry" },
];

const mountSelect = (props = {}) =>
  mount(NSelect, {
    props: { items, ...props },
    attachTo: document.body,
  });

describe("NSelect", () => {
  it("shows the placeholder, then the selected label", async () => {
    const wrapper = mountSelect({ placeholder: "Pick one" });
    const trigger = wrapper.get('[role="combobox"]');
    expect(trigger.text()).toBe("Pick one");
    expect(trigger.attributes("aria-expanded")).toBe("false");

    await wrapper.setProps({ modelValue: "cherry" });
    expect(trigger.text()).toBe("Cherry");
    wrapper.unmount();
  });

  it("opens, skips disabled options with the arrow keys and picks with Enter", async () => {
    const wrapper = mountSelect({ modelValue: "apple" });
    const trigger = wrapper.get('[role="combobox"]');

    await trigger.trigger("click");
    const options = page.findAll('[role="option"]');
    expect(options).toHaveLength(3);
    expect(options[0]!.attributes("aria-selected")).toBe("true");
    expect(trigger.attributes("aria-activedescendant")).toBe(
      options[0]!.attributes("id"),
    );

    await trigger.trigger("keydown", { key: "ArrowDown" });
    expect(trigger.attributes("aria-activedescendant")).toBe(
      options[2]!.attributes("id"),
    );

    await trigger.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["cherry"]);
    expect(page.find('[role="listbox"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("ignores clicks on disabled options and closes with Escape", async () => {
    const wrapper = mountSelect();
    await wrapper.get('[role="combobox"]').trigger("click");
    await page.findAll('[role="option"]')[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    await wrapper
      .get('[role="combobox"]')
      .trigger("keydown", { key: "Escape" });
    expect(page.find('[role="listbox"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("jumps to an option by typing its first letters", async () => {
    const wrapper = mountSelect();
    const trigger = wrapper.get('[role="combobox"]');
    await trigger.trigger("keydown", { key: "c" });
    const options = page.findAll('[role="option"]');
    expect(options[2]!.attributes("data-active")).toBe("");
    wrapper.unmount();
  });

  it("doesn't open when disabled and submits through a hidden input", async () => {
    const wrapper = mountSelect({
      disabled: true,
      name: "fruit",
      modelValue: "apple",
    });
    const trigger = wrapper.get('[role="combobox"]');
    expect(trigger.attributes("disabled")).toBeDefined();
    expect(wrapper.get('input[type="hidden"]').attributes("value")).toBe(
      "apple",
    );
    wrapper.unmount();
  });

  it("toggles several values with `multiple` and stays open", async () => {
    const wrapper = mountSelect({
      multiple: true,
      modelValue: ["apple"],
      name: "fruit",
      "onUpdate:modelValue": (value: unknown) =>
        wrapper.setProps({ modelValue: value }),
    });
    const trigger = wrapper.get('[role="combobox"]');
    expect(trigger.text()).toBe("Apple");

    await trigger.trigger("click");
    expect(
      page.get('[role="listbox"]').attributes("aria-multiselectable"),
    ).toBe("true");
    await page.findAll('[role="option"]')[2]!.trigger("click");
    expect(page.find('[role="listbox"]').exists()).toBe(true);
    expect(trigger.text()).toBe("Apple, Cherry");
    expect(
      wrapper.findAll('input[type="hidden"]').map((i) => i.attributes("value")),
    ).toEqual(["apple", "cherry"]);

    await wrapper.setProps({ badges: true });
    expect(
      wrapper.findAll(".n-select-trigger .n-badge").map((b) => b.text()),
    ).toEqual(["Apple", "Cherry"]);
    wrapper.unmount();
  });

  it("takes the id and aria attributes of an NFormField", () => {
    const wrapper = mount(NFormField, {
      props: { label: "Fruit", name: "fruit", error: "Required" },
      slots: { default: () => h(NSelect, { items }) },
      attachTo: document.body,
    });
    const trigger = wrapper.get('[role="combobox"]');
    expect(trigger.attributes("id")).toBeTruthy();
    expect(trigger.attributes("aria-invalid")).toBe("true");
    expect(trigger.attributes("aria-describedby")).toBeTruthy();
    wrapper.unmount();
  });
});

const tabs = [
  { label: "Overview", value: "overview" },
  { label: "Billing", value: "billing", disabled: true },
  { label: "Team", value: "team" },
];

const mountTabs = (props = {}) =>
  mount(NTabs, {
    props: { items: tabs, ...props },
    slots: {
      overview: () => "Overview panel",
      team: () => "Team panel",
      panel: ({ item }: { item: { label: string } }) =>
        `${item.label} fallback`,
    },
    attachTo: document.body,
  });

describe("NTabs", () => {
  it("selects the first enabled tab and shows only its panel", () => {
    const wrapper = mountTabs();
    const [overview, billing, team] = wrapper.findAll('[role="tab"]');
    expect(overview!.attributes("aria-selected")).toBe("true");
    expect(overview!.attributes("tabindex")).toBe("0");
    expect(team!.attributes("tabindex")).toBe("-1");
    expect(billing!.attributes("disabled")).toBeDefined();

    const panels = wrapper.findAll('[role="tabpanel"]');
    expect(panels).toHaveLength(1);
    expect(panels[0]!.text()).toBe("Overview panel");
    expect(panels[0]!.attributes("aria-labelledby")).toBe(
      overview!.attributes("id"),
    );
    expect(overview!.attributes("aria-controls")).toBe(
      panels[0]!.attributes("id"),
    );
    wrapper.unmount();
  });

  it("selects a tab on click and ignores disabled ones", async () => {
    const wrapper = mountTabs({ modelValue: "overview" });
    const [, billing, team] = wrapper.findAll('[role="tab"]');
    await billing!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    await team!.trigger("click");
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["team"]);
    wrapper.unmount();
  });

  it("moves with the arrow keys, skipping disabled tabs and wrapping", async () => {
    const wrapper = mountTabs({ modelValue: "overview" });
    const list = wrapper.get('[role="tablist"]');
    const [overview, , team] = wrapper.findAll('[role="tab"]');

    (overview!.element as HTMLElement).focus();
    await list.trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(team!.element);
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["team"]);

    await list.trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(overview!.element);
    wrapper.unmount();
  });

  it("with manual activation only moves focus", async () => {
    const wrapper = mountTabs({ modelValue: "overview", activation: "manual" });
    const [overview, , team] = wrapper.findAll('[role="tab"]');
    (overview!.element as HTMLElement).focus();
    await wrapper.get('[role="tablist"]').trigger("keydown", { key: "End" });
    expect(document.activeElement).toBe(team!.element);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    wrapper.unmount();
  });

  it("uses the vertical arrows for a vertical list", async () => {
    const wrapper = mountTabs({
      modelValue: "overview",
      orientation: "vertical",
    });
    const list = wrapper.get('[role="tablist"]');
    expect(list.attributes("aria-orientation")).toBe("vertical");
    (wrapper.get('[role="tab"]').element as HTMLElement).focus();

    await list.trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    await list.trigger("keydown", { key: "ArrowDown" });
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["team"]);
    wrapper.unmount();
  });

  it("falls back to the panel slot and can keep visited panels mounted", async () => {
    const wrapper = mountTabs({
      modelValue: "overview",
      keepAlive: true,
      items: [...tabs, { label: "Logs", value: "logs" }],
    });
    await wrapper.setProps({ modelValue: "logs" });
    const panels = wrapper.findAll('[role="tabpanel"]');
    expect(panels).toHaveLength(2);
    expect(panels[0]!.attributes("hidden")).toBeDefined();
    expect(panels[1]!.text()).toBe("Logs fallback");
    wrapper.unmount();
  });
});
