import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import { NButton } from "../src";
import { responsiveClasses } from "../src/utils/responsive";

const Icon = () => h("svg");

describe("responsiveClasses", () => {
  it("returns a single class for a plain value", () => {
    expect(responsiveClasses("sm", (v) => `n-size-${v}`)).toEqual([
      "n-size-sm",
    ]);
  });

  it("prefixes breakpoints and leaves base bare, in breakpoint order", () => {
    expect(
      responsiveClasses(
        { xl: "xl", base: "sm", md: "lg" },
        (v) => `n-size-${v}`,
      ),
    ).toEqual(["n-size-sm", "md:n-size-lg", "xl:n-size-xl"]);
  });

  it("keeps a `false` value", () => {
    expect(
      responsiveClasses({ base: true, md: false }, (v) =>
        v ? "n-block" : "n-inline",
      ),
    ).toEqual(["n-block", "md:n-inline"]);
  });
});

describe("NButton", () => {
  it("renders a primary solid md button by default", () => {
    const wrapper = mount(NButton, { props: { label: "Save" } });
    expect(wrapper.element.tagName).toBe("BUTTON");
    expect(wrapper.attributes("type")).toBe("button");
    expect(wrapper.attributes("data-variant")).toBe("solid");
    expect(wrapper.attributes("data-color")).toBe("primary");
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        "n-button",
        "n-size-md",
        "n-shape-rounded",
        "n-inline",
      ]),
    );
    expect(wrapper.text()).toBe("Save");
  });

  it("maps responsive props to breakpoint classes", () => {
    const wrapper = mount(NButton, {
      props: {
        label: "x",
        size: { base: "xxs", md: "xl", "2xl": "xxl" },
        shape: { base: "square", lg: "pill" },
        block: { base: true, md: false },
      },
    });
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        "n-size-xxs",
        "md:n-size-xl",
        "2xl:n-size-xxl",
        "n-shape-square",
        "lg:n-shape-pill",
        "n-block",
        "md:n-inline",
      ]),
    );
  });

  it("is icon-only without a label, and not with one", () => {
    const iconOnly = mount(NButton, { props: { icon: Icon } });
    expect(iconOnly.attributes("data-icon-only")).toBeDefined();
    expect(iconOnly.find(".n-button-label").exists()).toBe(false);

    const labelled = mount(NButton, { props: { icon: Icon, label: "Add" } });
    expect(labelled.attributes("data-icon-only")).toBeUndefined();
  });

  it("renders string icons as classes and component icons as components", () => {
    const wrapper = mount(NButton, {
      props: { label: "x", icon: "i-lucide-plus", trailingIcon: Icon },
    });
    const icons = wrapper.findAll(".n-button-icon");
    expect(icons).toHaveLength(2);
    expect(icons[0]!.classes()).toContain("i-lucide-plus");
    expect(icons[1]!.element.tagName).toBe("svg");
  });

  it("disables the button while loading and shows a spinner instead of the icon", () => {
    const wrapper = mount(NButton, {
      props: { label: "x", icon: Icon, loading: true },
    });
    expect(wrapper.attributes("disabled")).toBeDefined();
    expect(wrapper.attributes("aria-busy")).toBe("true");
    expect(wrapper.findAll(".n-button-icon")).toHaveLength(1);
    expect(wrapper.find(".n-spin").exists()).toBe(true);
  });

  it("uses aria-disabled instead of `disabled` on other elements", () => {
    const wrapper = mount(NButton, {
      props: { as: "a", label: "x", disabled: true },
      attrs: { href: "/x" },
    });
    expect(wrapper.element.tagName).toBe("A");
    expect(wrapper.attributes("type")).toBeUndefined();
    expect(wrapper.attributes("disabled")).toBeUndefined();
    expect(wrapper.attributes("aria-disabled")).toBe("true");
    expect(wrapper.attributes("tabindex")).toBe("-1");
  });

  it("merges a user `class` and forwards attributes", () => {
    const wrapper = mount(NButton, {
      props: { label: "x" },
      attrs: { class: "rounded-full", "data-testid": "btn" },
    });
    expect(wrapper.classes()).toContain("rounded-full");
    expect(wrapper.attributes("data-testid")).toBe("btn");
  });
});
