import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NBreadcrumb, NStepper } from "../src";

describe("NBreadcrumb", () => {
  const items = [
    { label: "Home", to: "/" },
    { label: "Docs", to: "/docs" },
    { label: "Guide", to: "/docs/guide" },
    { label: "Page", to: "/docs/guide/page" },
  ];

  it("links all items except the current one", () => {
    const wrapper = mount(NBreadcrumb, { props: { items } });
    expect(wrapper.findAll("a")).toHaveLength(3);
    const current = wrapper.get("[aria-current=page]");
    expect(current.text()).toBe("Page");
    expect(current.element.tagName).toBe("SPAN");
    expect(wrapper.attributes("aria-label")).toBe("Breadcrumb");
  });

  it("collapses the middle items above maxItems", () => {
    const wrapper = mount(NBreadcrumb, { props: { items, maxItems: 3 } });
    const texts = wrapper
      .findAll(".n-breadcrumb-item, .n-breadcrumb-ellipsis")
      .map((el) => el.text());
    expect(texts).toEqual(["Home", "…More", "Guide", "Page"]);
  });
});

describe("NStepper", () => {
  const items = [{ title: "Account" }, { title: "Plan" }, { title: "Done" }];

  it("marks the step states and the current step", () => {
    const wrapper = mount(NStepper, { props: { items, modelValue: 1 } });
    const steps = wrapper.findAll(".n-stepper-step");
    expect(steps.map((s) => s.attributes("data-state"))).toEqual([
      "complete",
      "current",
      "upcoming",
    ]);
    expect(steps[1]!.attributes("aria-current")).toBe("step");
  });

  it("only lets completed steps be clicked to go back", async () => {
    const wrapper = mount(NStepper, { props: { items, modelValue: 2 } });
    expect(wrapper.findAll("button")).toHaveLength(2);
    await wrapper.findAll("button")[0]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([0]);
  });

  it("is not clickable when clickable is false", () => {
    const wrapper = mount(NStepper, {
      props: { items, modelValue: 2, clickable: false },
    });
    expect(wrapper.findAll("button")).toHaveLength(0);
  });
});
