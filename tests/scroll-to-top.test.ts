import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NScrollToTop } from "../src";

const scrollTo = vi.fn();

const scrollTo_ = async (y: number) => {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  window.dispatchEvent(new Event("scroll"));
  await Promise.resolve();
};

describe("NScrollToTop", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    scrollTo.mockReset();
  });

  it("shows past the threshold and scrolls to the top on click", async () => {
    window.scrollTo = scrollTo;
    await scrollTo_(0);
    const wrapper = mount(NScrollToTop, {
      props: { threshold: 100 },
      attrs: { color: "neutral" },
      global: { stubs: { transition: false } },
    });
    expect(wrapper.find("button").exists()).toBe(false);

    await scrollTo_(300);
    const button = wrapper.get("button");
    expect(button.attributes("aria-label")).toBe("Scroll to top");
    expect(button.attributes("data-color")).toBe("neutral");

    await button.trigger("click");
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });

    await scrollTo_(0);
    wrapper.unmount();
  });
});
