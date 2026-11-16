import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NPageHeader } from "../src";

describe("NPageHeader", () => {
  it("renders icon tile, title and description with defaults", () => {
    const wrapper = mount(NPageHeader, {
      props: {
        title: "Settings",
        description: "Manage your account.",
        icon: "i-lucide-settings",
      },
    });
    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.attributes("data-size")).toBe("md");
    expect(wrapper.attributes("data-color")).toBe("primary");
    expect(wrapper.get(".n-page-header-title").element.tagName).toBe("H1");
    expect(wrapper.get(".n-page-header-title").text()).toBe("Settings");
    expect(wrapper.get(".n-page-header-description").text()).toBe(
      "Manage your account.",
    );
    expect(wrapper.get(".n-page-header-icon span").classes()).toContain(
      "i-lucide-settings",
    );
    expect(wrapper.find(".n-page-header-actions").exists()).toBe(false);
  });

  it("omits empty parts and supports heading level, color and size", () => {
    const wrapper = mount(NPageHeader, {
      props: { title: "Billing", headingAs: "h2", color: "info", size: "lg" },
    });
    expect(wrapper.get(".n-page-header-title").element.tagName).toBe("H2");
    expect(wrapper.attributes("data-color")).toBe("info");
    expect(wrapper.attributes("data-size")).toBe("lg");
    expect(wrapper.find(".n-page-header-icon").exists()).toBe(false);
    expect(wrapper.find(".n-page-header-description").exists()).toBe(false);
  });

  it("prefers slots over props and renders actions", () => {
    const wrapper = mount(NPageHeader, {
      props: { title: "x", icon: "i-lucide-user" },
      slots: {
        title: "Custom",
        icon: "<b>I</b>",
        actions: "<button>Go</button>",
      },
    });
    expect(wrapper.get(".n-page-header-title").text()).toBe("Custom");
    expect(wrapper.find(".n-page-header-icon").exists()).toBe(false);
    expect(wrapper.find("b").exists()).toBe(true);
    expect(wrapper.get(".n-page-header-actions button").text()).toBe("Go");
  });
});
