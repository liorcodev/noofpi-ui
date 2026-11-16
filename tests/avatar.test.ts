import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NAvatar } from "../src";

describe("NAvatar", () => {
  it("renders the image with `alt`", () => {
    const wrapper = mount(NAvatar, {
      props: { src: "/me.png", alt: "Jane Doe" },
    });
    const img = wrapper.get("img");
    expect(img.attributes("src")).toBe("/me.png");
    expect(img.attributes("alt")).toBe("Jane Doe");
    expect(wrapper.attributes("role")).toBeUndefined();
  });

  it("falls back to the initials of `alt` when the image fails", async () => {
    const wrapper = mount(NAvatar, {
      props: { src: "/broken.png", alt: "Jane Mary Doe" },
    });
    await wrapper.get("img").trigger("error");
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.text()).toBe("JD");
    expect(wrapper.attributes("role")).toBe("img");
    expect(wrapper.attributes("aria-label")).toBe("Jane Mary Doe");
  });

  it("prefers `text` over the initials and shows the icon without either", () => {
    const withText = mount(NAvatar, { props: { text: "AB", alt: "Zed" } });
    expect(withText.text()).toBe("AB");

    const bare = mount(NAvatar);
    expect(bare.get(".n-avatar-icon").classes()).toContain("i-lucide-user");
    expect(bare.attributes("aria-hidden")).toBe("true");

    const custom = mount(NAvatar, { props: { icon: "i-lucide-bot" } });
    expect(custom.get(".n-avatar-icon").classes()).toContain("i-lucide-bot");
  });

  it("exposes size, shape and color as data attributes", () => {
    const wrapper = mount(NAvatar, {
      props: { size: "xl", shape: "square", color: "primary" },
    });
    expect(wrapper.attributes("data-size")).toBe("xl");
    expect(wrapper.attributes("data-shape")).toBe("square");
    expect(wrapper.attributes("data-color")).toBe("primary");
    expect(wrapper.attributes("data-bordered")).toBeUndefined();
  });

  it("marks a `bordered` avatar", () => {
    const wrapper = mount(NAvatar, { props: { bordered: true } });
    expect(wrapper.attributes("data-bordered")).toBe("");
  });
});
