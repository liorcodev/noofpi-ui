import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import { NFormField, NTextarea } from "../src";

describe("NTextarea", () => {
  it("binds v-model and puts class on the wrapper, other attributes on the textarea", async () => {
    const wrapper = mount(NTextarea, {
      props: { modelValue: "hi", rows: 5 },
      attrs: { class: "w-64", placeholder: "Message" },
    });
    const textarea = wrapper.find("textarea");
    expect(wrapper.classes()).toContain("w-64");
    expect(textarea.attributes("placeholder")).toBe("Message");
    expect(textarea.attributes("rows")).toBe("5");
    expect(textarea.element.value).toBe("hi");

    await textarea.setValue("hello");
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["hello"]);
  });

  it("shows the counter only when asked, with the maxlength", () => {
    expect(mount(NTextarea).find(".n-textarea-counter").exists()).toBe(false);
    expect(
      mount(NTextarea, { props: { counter: true, modelValue: "abc" } })
        .find(".n-textarea-counter")
        .text(),
    ).toBe("3");
    expect(
      mount(NTextarea, {
        props: { counter: true, modelValue: "abc" },
        attrs: { maxlength: 20 },
      })
        .find(".n-textarea-counter")
        .text(),
    ).toBe("3 / 20");
  });

  it("flags autoresize and the maximum rows", () => {
    const plain = mount(NTextarea).find("textarea");
    expect(plain.attributes("data-autoresize")).toBeUndefined();

    const grow = mount(NTextarea, {
      props: { autoresize: true, maxRows: 6 },
    }).find("textarea");
    expect(grow.attributes("data-autoresize")).toBe("");
    expect(grow.attributes("style")).toContain("--n-textarea-max-rows: 6");
  });

  it("is marked invalid and wired to NFormField", () => {
    expect(
      mount(NTextarea, { props: { invalid: true } })
        .find("textarea")
        .attributes("aria-invalid"),
    ).toBe("true");

    const wrapper = mount(NFormField, {
      props: { label: "Bio", name: "bio", error: "Required" },
      slots: { default: () => h(NTextarea) },
    });
    const textarea = wrapper.find("textarea");
    expect(textarea.attributes("id")).toBeTruthy();
    expect(textarea.attributes("aria-invalid")).toBe("true");
    expect(textarea.attributes("aria-describedby")).toBeTruthy();
  });
});
