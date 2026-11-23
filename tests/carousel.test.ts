import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NCarousel } from "../src";

const items = [
  { src: "/a.png", alt: "A", title: "First", description: "One" },
  { src: "/b.png", title: "Second" },
  { src: "/c.png" },
  { src: "/d.png" },
];

afterEach(() => vi.useRealTimers());

describe("NCarousel", () => {
  it("renders labelled slides, captions and one dot per slide", () => {
    const wrapper = mount(NCarousel, { props: { items, label: "Gallery" } });
    expect(wrapper.attributes("aria-roledescription")).toBe("carousel");
    expect(wrapper.attributes("aria-label")).toBe("Gallery");
    const slides = wrapper.findAll(".n-carousel-slide");
    expect(slides).toHaveLength(4);
    expect(slides[1]!.attributes("aria-label")).toBe("2 of 4");
    expect(slides[0]!.attributes("aria-hidden")).toBeUndefined();
    expect(slides[1]!.attributes("aria-hidden")).toBe("true");
    expect(wrapper.get(".n-carousel-title").text()).toBe("First");
    expect(wrapper.get("img").attributes("alt")).toBe("A");
    expect(wrapper.findAll(".n-carousel-indicator")).toHaveLength(4);
  });

  it("moves with the arrows, the dots and the keyboard, and updates v-model", async () => {
    const wrapper = mount(NCarousel, { props: { items } });
    const arrows = wrapper.findAll(".n-carousel-arrow");
    expect(arrows[0]!.attributes("disabled")).toBeDefined();

    await arrows[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([1]);
    await wrapper.setProps({ modelValue: 1 });
    expect(
      wrapper.findAll(".n-carousel-indicator")[1]!.attributes("aria-current"),
    ).toBe("true");

    await wrapper.findAll(".n-carousel-indicator")[3]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([3]);
    await wrapper.setProps({ modelValue: 3 });
    expect(arrows[1]!.attributes("disabled")).toBeDefined();

    await wrapper
      .get(".n-carousel-viewport")
      .trigger("keydown", { key: "Home" });
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([0]);
  });

  it("wraps around with loop", async () => {
    const wrapper = mount(NCarousel, { props: { items, loop: true } });
    const [prev, next] = wrapper.findAll(".n-carousel-arrow");
    expect(prev!.attributes("disabled")).toBeUndefined();
    await prev!.trigger("click");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([3]);
    await wrapper.setProps({ modelValue: 3 });
    await next!.trigger("click");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([0]);
  });

  it("with perView, shows several slides and has a dot per position", () => {
    const wrapper = mount(NCarousel, { props: { items, perView: 2 } });
    expect(wrapper.findAll(".n-carousel-indicator")).toHaveLength(3);
    expect(wrapper.attributes("style")).toContain("--n-carousel-per-view: 2");
    const hidden = wrapper
      .findAll(".n-carousel-slide")
      .map((slide) => slide.attributes("aria-hidden") === "true");
    expect(hidden).toEqual([false, false, true, true]);
  });

  it("hides the controls when everything fits", () => {
    const wrapper = mount(NCarousel, { props: { items: items.slice(0, 1) } });
    expect(wrapper.find(".n-carousel-arrow").exists()).toBe(false);
    expect(wrapper.find(".n-carousel-indicators").exists()).toBe(false);
  });

  it("autoplays, pauses on hover and with the toggle button", async () => {
    vi.useFakeTimers();
    const wrapper = mount(NCarousel, { props: { items, autoplay: 1000 } });
    await vi.advanceTimersByTimeAsync(1000);
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([1]);

    await wrapper.trigger("pointerenter");
    await vi.advanceTimersByTimeAsync(3000);
    expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
    await wrapper.trigger("pointerleave");

    await wrapper.get(".n-carousel-toggle").trigger("click");
    expect(wrapper.get(".n-carousel-toggle").attributes("aria-label")).toBe(
      "Start slideshow",
    );
    await vi.advanceTimersByTimeAsync(3000);
    expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
    wrapper.unmount();
  });
});
