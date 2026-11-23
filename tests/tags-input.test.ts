import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import { NFormField, NTagsInput } from "../src";

function mountTags(props: Record<string, unknown> = {}) {
  const wrapper = mount(NTagsInput, {
    props: {
      modelValue: [] as string[],
      "onUpdate:modelValue": (value: string[]) =>
        wrapper.setProps({ modelValue: value }),
      ...props,
    },
  });
  return wrapper;
}

const tags = (wrapper: ReturnType<typeof mountTags>) =>
  wrapper.findAll(".n-tags-tag").map((tag) => tag.text());

describe("NTagsInput", () => {
  it("adds a tag on Enter without submitting, and skips duplicates", async () => {
    const wrapper = mountTags();
    const input = wrapper.find("input");
    await input.setValue("vue");
    const enter = new KeyboardEvent("keydown", {
      key: "Enter",
      cancelable: true,
    });
    input.element.dispatchEvent(enter);
    await wrapper.vm.$nextTick();
    expect(enter.defaultPrevented).toBe(true);
    expect(wrapper.props("modelValue")).toEqual(["vue"]);
    expect(input.element.value).toBe("");

    await input.setValue("vue");
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.props("modelValue")).toEqual(["vue"]);
    expect(input.element.value).toBe("");
  });

  it("adds every piece when typing or pasting a delimiter and keeps the rest", async () => {
    const wrapper = mountTags();
    const input = wrapper.find("input");
    await input.setValue("a, b ,c");
    expect(wrapper.props("modelValue")).toEqual(["a", "b"]);
    expect(input.element.value).toBe("c");
  });

  it("removes with the button and with Backspace on an empty field", async () => {
    const wrapper = mountTags({ modelValue: ["a", "b", "c"] });
    expect(tags(wrapper)).toEqual(["a", "b", "c"]);
    await wrapper.find('[aria-label="Remove b"]').trigger("click");
    expect(wrapper.props("modelValue")).toEqual(["a", "c"]);

    const input = wrapper.find("input");
    await input.setValue("x");
    await input.trigger("keydown", { key: "Backspace" });
    expect(wrapper.props("modelValue")).toEqual(["a", "c"]);
    await input.setValue("");
    await input.trigger("keydown", { key: "Backspace" });
    expect(wrapper.props("modelValue")).toEqual(["a"]);
  });

  it("refuses tags over `max` or failing `validate`, and keeps them in the field", async () => {
    const wrapper = mountTags({
      max: 1,
      validate: (tag: string) => tag !== "no",
    });
    const input = wrapper.find("input");
    await input.setValue("no");
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.props("modelValue")).toEqual([]);
    expect(input.element.value).toBe("no");

    await input.setValue("yes");
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.props("modelValue")).toEqual(["yes"]);
    await input.setValue("more");
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.props("modelValue")).toEqual(["yes"]);
    expect(input.element.value).toBe("more");
  });

  it("adds on blur only when asked", async () => {
    const off = mountTags();
    await off.find("input").setValue("a");
    await off.find("input").trigger("blur");
    expect(off.props("modelValue")).toEqual([]);

    const on = mountTags({ addOnBlur: true });
    await on.find("input").setValue("a");
    await on.find("input").trigger("blur");
    expect(on.props("modelValue")).toEqual(["a"]);
  });

  it("submits one hidden input per tag", () => {
    const wrapper = mountTags({ modelValue: ["a", "b"], name: "skills" });
    const hidden = wrapper.findAll('input[type="hidden"]');
    expect(hidden.map((el) => el.attributes("name"))).toEqual([
      "skills",
      "skills",
    ]);
    expect(hidden.map((el) => (el.element as HTMLInputElement).value)).toEqual([
      "a",
      "b",
    ]);
  });

  it("hides the remove buttons and disables the field when disabled", () => {
    const wrapper = mountTags({ modelValue: ["a"], disabled: true });
    expect(wrapper.find(".n-tags-remove").exists()).toBe(false);
    expect(wrapper.find("input").attributes("disabled")).toBeDefined();
  });

  it("links to the surrounding NFormField", () => {
    const wrapper = mount(NFormField, {
      props: { label: "Skills", name: "skills", error: "Required" },
      slots: { default: () => h(NTagsInput) },
    });
    const input = wrapper.find(".n-tags-input");
    expect(input.attributes("id")).toBeTruthy();
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(input.attributes("aria-describedby")).toBeTruthy();
  });
});
