import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NInput } from "../src";

describe("NInput", () => {
  it("renders leading and trailing icons and flags the wrapper", () => {
    const wrapper = mount(NInput, {
      props: { icon: "i-mail", trailingIcon: "i-check" },
    });
    expect(wrapper.find(".n-input-leading .i-mail").exists()).toBe(true);
    expect(wrapper.find(".n-input-trailing .i-check").exists()).toBe(true);
    expect(wrapper.find(".n-input-field").attributes("data-leading")).toBe("");
    expect(wrapper.find(".n-input-field").attributes("data-trailing")).toBe("");
  });

  it("renders shaded addons from props or slots", () => {
    const wrapper = mount(NInput, {
      props: { prepend: "https://" },
      slots: { append: `<b>.com</b>` },
    });
    expect(wrapper.find(".n-input-prepend").text()).toBe("https://");
    expect(wrapper.find(".n-input-append b").text()).toBe(".com");
    expect(wrapper.attributes("data-addon")).toBe("");
    expect(mount(NInput).attributes("data-addon")).toBeUndefined();
  });

  it("renders the slots and has no icons by default", () => {
    const plain = mount(NInput);
    expect(plain.find(".n-input-leading").exists()).toBe(false);
    expect(plain.find(".n-input-trailing").exists()).toBe(false);

    const slotted = mount(NInput, {
      slots: { trailing: `<button type="button">x</button>` },
    });
    expect(slotted.find(".n-input-trailing button").exists()).toBe(true);
  });

  it("puts class on the wrapper and native attributes on the input", () => {
    const wrapper = mount(NInput, {
      attrs: { class: "w-64", placeholder: "Email" },
    });
    expect(wrapper.classes()).toContain("w-64");
    expect(wrapper.find("input").attributes("placeholder")).toBe("Email");
  });
});
