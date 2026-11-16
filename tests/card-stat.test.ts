import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NCard, NStat } from "../src";

describe("NCard", () => {
  it("renders slots in header, body and footer wrappers with defaults", () => {
    const wrapper = mount(NCard, {
      slots: { header: "Head", default: "Body", footer: "Foot" },
    });
    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.attributes("data-variant")).toBe("outline");
    expect(wrapper.get(".n-card-header").text()).toBe("Head");
    expect(wrapper.get(".n-card-body").text()).toBe("Body");
    expect(wrapper.get(".n-card-footer").text()).toBe("Foot");
  });

  it("renders media above the header without padding wrappers", () => {
    const wrapper = mount(NCard, {
      slots: { media: "<img src='/a.png' alt=''>", default: "Body" },
    });
    expect(wrapper.get(".n-card-media img").attributes("src")).toBe("/a.png");
    expect(wrapper.element.firstElementChild?.className).toBe("n-card-media");
  });

  it("omits empty sections and supports `as` and `variant`", () => {
    const wrapper = mount(NCard, {
      props: { as: "article", variant: "soft" },
      slots: { default: "Body" },
    });
    expect(wrapper.element.tagName).toBe("ARTICLE");
    expect(wrapper.attributes("data-variant")).toBe("soft");
    expect(wrapper.attributes("data-color")).toBe("neutral");
    expect(wrapper.find(".n-card-header").exists()).toBe(false);
    expect(wrapper.find(".n-card-footer").exists()).toBe(false);
  });
});

describe("NStat", () => {
  it("renders label, value (including 0) and description", () => {
    const wrapper = mount(NStat, {
      props: { label: "Users", value: 0, description: "since Monday" },
    });
    expect(wrapper.get(".n-stat-label").text()).toBe("Users");
    expect(wrapper.get(".n-stat-value").text()).toBe("0");
    expect(wrapper.get(".n-stat-description").text()).toBe("since Monday");
    expect(wrapper.attributes("data-color")).toBe("primary");
    expect(wrapper.find(".n-stat-trend").exists()).toBe(false);
    expect(wrapper.find(".n-stat-icon").exists()).toBe(false);
  });

  it("shows a trend arrow and an icon tile", () => {
    const wrapper = mount(NStat, {
      props: {
        label: "Churn",
        value: "2%",
        description: "-1%",
        trend: "down",
        icon: "i-lucide-users",
        color: "info",
      },
    });
    expect(wrapper.attributes("data-trend")).toBe("down");
    expect(wrapper.attributes("data-color")).toBe("info");
    expect(wrapper.get(".n-stat-trend").classes()).toContain(
      "i-lucide-trending-down",
    );
    expect(wrapper.get(".n-stat-icon span").classes()).toContain(
      "i-lucide-users",
    );
  });

  it("prefers slots over props", () => {
    const wrapper = mount(NStat, {
      props: { label: "x", value: 1 },
      slots: { label: "Custom", default: "42" },
    });
    expect(wrapper.get(".n-stat-label").text()).toBe("Custom");
    expect(wrapper.get(".n-stat-value").text()).toBe("42");
  });
});
