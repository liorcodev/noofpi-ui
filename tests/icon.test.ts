import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import { NIcon } from "../src";

describe("NIcon", () => {
  it("renders a class name as a decorative span", () => {
    const wrapper = mount(NIcon, { props: { name: "i-lucide-plus" } });
    expect(wrapper.element.tagName).toBe("SPAN");
    expect(wrapper.classes()).toEqual(["n-icon", "i-lucide-plus"]);
    expect(wrapper.attributes("aria-hidden")).toBe("true");
    expect(wrapper.attributes("role")).toBeUndefined();
  });

  it("renders a component", () => {
    const wrapper = mount(NIcon, { props: { name: () => h("svg") } });
    expect(wrapper.element.tagName).toBe("svg");
    expect(wrapper.classes()).toContain("n-icon");
  });

  it("exposes a `label` to assistive tech and merges a user class", () => {
    const wrapper = mount(NIcon, {
      props: { name: "i-lucide-plus", label: "Add" },
      attrs: { class: "text-2xl" },
    });
    expect(wrapper.attributes("role")).toBe("img");
    expect(wrapper.attributes("aria-label")).toBe("Add");
    expect(wrapper.attributes("aria-hidden")).toBeUndefined();
    expect(wrapper.classes()).toContain("text-2xl");
  });
});
