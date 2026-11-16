import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NHeroPage } from "../src";

describe("NHeroPage", () => {
  it("renders vertical text parts with defaults", () => {
    const wrapper = mount(NHeroPage, {
      props: {
        eyebrow: "New",
        title: "Build faster",
        description: "A full-stack Vue framework.",
      },
    });
    expect(wrapper.element.tagName).toBe("SECTION");
    expect(wrapper.attributes("data-layout")).toBe("vertical");
    expect(wrapper.attributes("data-reverse")).toBeUndefined();
    expect(wrapper.get(".n-hero-page-eyebrow").text()).toBe("New");
    expect(wrapper.get(".n-hero-page-title").element.tagName).toBe("H1");
    expect(wrapper.get(".n-hero-page-title").text()).toBe("Build faster");
    expect(wrapper.get(".n-hero-page-description").text()).toBe(
      "A full-stack Vue framework.",
    );
    expect(wrapper.find(".n-hero-page-media").exists()).toBe(false);
    expect(wrapper.find(".n-hero-page-actions").exists()).toBe(false);
  });

  it("renders the image in the horizontal layout, optionally reversed", () => {
    const wrapper = mount(NHeroPage, {
      props: {
        title: "Hi",
        image: "/hero.png",
        imageAlt: "Dashboard",
        layout: "horizontal",
        reverse: true,
        headingAs: "h2",
      },
    });
    expect(wrapper.attributes("data-layout")).toBe("horizontal");
    expect(wrapper.attributes("data-reverse")).toBe("true");
    expect(wrapper.get(".n-hero-page-title").element.tagName).toBe("H2");
    const img = wrapper.get(".n-hero-page-image");
    expect(img.attributes("src")).toBe("/hero.png");
    expect(img.attributes("alt")).toBe("Dashboard");
  });

  it("prefers slots over props and renders actions and media", () => {
    const wrapper = mount(NHeroPage, {
      props: { title: "Prop title", image: "/hero.png" },
      slots: {
        title: "Slot title",
        actions: "<button>Go</button>",
        media: "<video />",
      },
    });
    expect(wrapper.get(".n-hero-page-title").text()).toBe("Slot title");
    expect(wrapper.get(".n-hero-page-actions button").text()).toBe("Go");
    expect(wrapper.find(".n-hero-page-image").exists()).toBe(false);
    expect(wrapper.find(".n-hero-page-media video").exists()).toBe(true);
  });
});
