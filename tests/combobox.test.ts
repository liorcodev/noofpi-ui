import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import { NCombobox, NFormField } from "../src";

const items = [
  { label: "Apple", value: "apple" },
  { label: "Apricot", value: "apricot", disabled: true },
  { label: "Banana", value: "banana" },
  { label: "Cherry", value: "cherry" },
];

const mountCombobox = (props = {}) =>
  mount(NCombobox, { props: { items, ...props }, attachTo: document.body });

describe("NCombobox", () => {
  it("shows the selected label and opens with every option", async () => {
    const wrapper = mountCombobox({ modelValue: "cherry" });
    const input = wrapper.get<HTMLInputElement>('[role="combobox"]');
    expect(input.element.value).toBe("Cherry");

    await input.trigger("click");
    expect(wrapper.findAll('[role="option"]')).toHaveLength(4);
    expect(input.attributes("aria-expanded")).toBe("true");
    wrapper.unmount();
  });

  it("filters by label while typing and picks with Enter, skipping disabled options", async () => {
    const wrapper = mountCombobox();
    const input = wrapper.get<HTMLInputElement>('[role="combobox"]');

    await input.setValue("ap");
    const options = wrapper.findAll('[role="option"]');
    expect(options.map((option) => option.text())).toEqual([
      "Apple",
      "Apricot",
    ]);
    expect(input.attributes("aria-activedescendant")).toBe(
      options[0]!.attributes("id"),
    );

    await input.trigger("keydown", { key: "ArrowDown" });
    expect(input.attributes("aria-activedescendant")).toBe(
      options[0]!.attributes("id"),
    );

    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["apple"]);
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("shows the empty text, and reverts the text to the selection on Escape", async () => {
    const wrapper = mountCombobox({ modelValue: "banana" });
    const input = wrapper.get<HTMLInputElement>('[role="combobox"]');

    await input.setValue("zzz");
    expect(wrapper.text()).toContain("No results");

    await input.trigger("keydown", { key: "Escape" });
    expect(input.element.value).toBe("Banana");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    wrapper.unmount();
  });

  it("leaves filtering to the parent with filter off and reports the search term", async () => {
    const wrapper = mountCombobox({ filter: false });
    await wrapper.get('[role="combobox"]').setValue("zzz");
    expect(wrapper.findAll('[role="option"]')).toHaveLength(4);
    expect(wrapper.emitted("update:searchTerm")![0]).toEqual(["zzz"]);
    wrapper.unmount();
  });

  it("clears the selection and submits it with a hidden input", async () => {
    const wrapper = mountCombobox({
      modelValue: "apple",
      clearable: true,
      name: "fruit",
    });
    expect(
      wrapper.get<HTMLInputElement>('input[type="hidden"]').element.value,
    ).toBe("apple");
    await wrapper.get(".n-combobox-clear").trigger("click");
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([undefined]);
    wrapper.unmount();
  });

  it("takes its id and invalid state from an NFormField", () => {
    const wrapper = mount(NFormField, {
      props: { label: "Fruit", error: "Required" },
      slots: { default: () => h(NCombobox, { items }) },
      attachTo: document.body,
    });
    const input = wrapper.get('[role="combobox"]');
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(wrapper.get("label").attributes("for")).toBe(input.attributes("id"));
    wrapper.unmount();
  });
});
