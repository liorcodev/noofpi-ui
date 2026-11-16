import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NMarquee } from "../src";

const items = [
  { src: "/a.svg", alt: "A", href: "https://a.test", target: "_blank" },
  { src: "/b.svg", alt: "B" },
  { label: "Acme" },
];

describe("NMarquee", () => {
  it("renders two groups with defaults, the copy hidden from assistive tech", () => {
    const wrapper = mount(NMarquee, { props: { items } });
    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.attributes("data-size")).toBe("md");
    expect(wrapper.attributes("data-orientation")).toBe("horizontal");
    expect(wrapper.attributes("data-pause")).toBeDefined();
    expect(wrapper.attributes("data-fade")).toBeDefined();
    expect(wrapper.attributes("data-grayscale")).toBeDefined();
    expect(wrapper.attributes("data-monochrome")).toBeUndefined();
    expect(wrapper.attributes("style")).toContain("--n-marquee-duration: 40s");

    const groups = wrapper.findAll(".n-marquee-group");
    expect(groups).toHaveLength(2);
    expect(groups[0]!.attributes("aria-hidden")).toBeUndefined();
    expect(groups[1]!.attributes("aria-hidden")).toBe("true");
    expect(groups[0]!.findAll(".n-marquee-item")).toHaveLength(3);
    expect(groups[1]!.findAll(".n-marquee-item")).toHaveLength(3);
  });

  it("renders links, alt text and label; the copy is not focusable and has empty alts", () => {
    const wrapper = mount(NMarquee, { props: { items } });
    const [real, clone] = wrapper.findAll(".n-marquee-group");
    const link = real!.get("a.n-marquee-item");
    expect(link.attributes("href")).toBe("https://a.test");
    expect(link.attributes("rel")).toBe("noopener noreferrer");
    expect(real!.get("img").attributes("alt")).toBe("A");
    expect(real!.findAll(".n-marquee-label")[0]!.text()).toBe("Acme");
    expect(clone!.get("a.n-marquee-item").attributes("tabindex")).toBe("-1");
    expect(clone!.get("img").attributes("alt")).toBe("");
  });

  it("applies props as data attributes, duration and label", () => {
    const wrapper = mount(NMarquee, {
      props: {
        items,
        reverse: true,
        pauseOnHover: false,
        fade: false,
        grayscale: false,
        size: "lg",
        orientation: "vertical",
        duration: 12,
        label: "Trusted by",
        as: "section",
      },
    });
    expect(wrapper.element.tagName).toBe("SECTION");
    expect(wrapper.attributes("data-size")).toBe("lg");
    expect(wrapper.attributes("data-orientation")).toBe("vertical");
    expect(wrapper.attributes("data-reverse")).toBeDefined();
    expect(wrapper.attributes("data-pause")).toBeUndefined();
    expect(wrapper.attributes("data-fade")).toBeUndefined();
    expect(wrapper.attributes("data-grayscale")).toBeUndefined();
    expect(wrapper.attributes("aria-label")).toBe("Trusted by");
    expect(wrapper.attributes("style")).toContain("--n-marquee-duration: 12s");
  });

  it("takes a size per breakpoint", () => {
    const wrapper = mount(NMarquee, {
      props: { items, size: { base: "sm", md: "lg" } },
    });
    expect(wrapper.attributes("data-size")).toBe("sm");
    expect(wrapper.classes()).toContain("md:n-marquee-size-lg");
  });

  it("renders the default slot in both groups instead of items", () => {
    const wrapper = mount(NMarquee, {
      props: { items },
      slots: { default: "<span class='logo'>X</span>" },
    });
    expect(wrapper.findAll(".n-marquee-group .logo")).toHaveLength(2);
    expect(wrapper.find(".n-marquee-item").exists()).toBe(false);
  });
});
