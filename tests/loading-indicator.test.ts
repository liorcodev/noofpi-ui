import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NLoadingIndicator } from "../src";

const mountIt = (props: Record<string, unknown>) =>
  mount(NLoadingIndicator, {
    props,
    global: { stubs: { transition: false } },
  });

describe("NLoadingIndicator", () => {
  afterEach(() => vi.useRealTimers());

  it("starts, trickles and completes with `loading`", async () => {
    vi.useFakeTimers();
    const wrapper = mountIt({ loading: false, color: "info" });
    expect(wrapper.find("[role=progressbar]").exists()).toBe(false);

    await wrapper.setProps({ loading: true });
    const bar = wrapper.get("[role=progressbar]");
    expect(bar.attributes("data-color")).toBe("info");
    expect(bar.attributes("aria-label")).toBe("Loading page");
    expect(Number(bar.attributes("aria-valuenow"))).toBe(8);

    await vi.advanceTimersByTimeAsync(1000);
    const trickled = Number(bar.attributes("aria-valuenow"));
    expect(trickled).toBeGreaterThan(8);
    expect(trickled).toBeLessThan(92);

    await wrapper.setProps({ loading: false });
    expect(wrapper.get("[role=progressbar]").attributes("aria-valuenow")).toBe(
      "100",
    );
    await vi.advanceTimersByTimeAsync(400);
    expect(wrapper.find("[role=progressbar]").exists()).toBe(false);
    wrapper.unmount();
  });

  it("is controlled by `value`", async () => {
    vi.useFakeTimers();
    const wrapper = mountIt({ value: 40 });
    expect(wrapper.get("[role=progressbar]").attributes("aria-valuenow")).toBe(
      "40",
    );
    await vi.advanceTimersByTimeAsync(1000);
    expect(wrapper.get("[role=progressbar]").attributes("aria-valuenow")).toBe(
      "40",
    );

    await wrapper.setProps({ value: 100 });
    await vi.advanceTimersByTimeAsync(400);
    expect(wrapper.find("[role=progressbar]").exists()).toBe(false);
    wrapper.unmount();
  });
});
