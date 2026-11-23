import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NCopyButton } from "../src";

describe("NCopyButton", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });
  afterEach(() => vi.useRealTimers());

  it("copies the text, shows the check, then goes back", async () => {
    const wrapper = mount(NCopyButton, { props: { text: "sk-123" } });
    expect(wrapper.find(".i-lucide-copy").exists()).toBe(true);
    expect(wrapper.attributes("aria-label")).toBe("Copy");

    await wrapper.trigger("click");
    await nextTick();
    expect(writeText).toHaveBeenCalledWith("sk-123");
    expect(wrapper.emitted("copy")).toEqual([["sk-123"]]);
    expect(wrapper.attributes("data-copied")).toBe("");
    expect(wrapper.find(".i-lucide-check").exists()).toBe(true);
    expect(wrapper.attributes("aria-label")).toBe("Copied");

    vi.advanceTimersByTime(2000);
    await nextTick();
    expect(wrapper.attributes("data-copied")).toBeUndefined();
    expect(wrapper.find(".i-lucide-copy").exists()).toBe(true);
  });

  it("swaps the label while copied", async () => {
    const wrapper = mount(NCopyButton, {
      props: { text: "x", label: "Copy key" },
    });
    expect(wrapper.text()).toBe("Copy key");
    await wrapper.trigger("click");
    await nextTick();
    expect(wrapper.text()).toBe("Copied");
  });

  it("emits `error` and shows no check when copying fails", async () => {
    const failure = new Error("denied");
    writeText.mockRejectedValue(failure);
    const wrapper = mount(NCopyButton, { props: { text: "x" } });
    await wrapper.trigger("click");
    await nextTick();
    expect(wrapper.emitted("error")).toEqual([[failure]]);
    expect(wrapper.emitted("copy")).toBeUndefined();
    expect(wrapper.attributes("data-copied")).toBeUndefined();
  });
});
