import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NInfiniteScroll } from "../src";

class MockObserver {
  static instances: MockObserver[] = [];
  static visible = false;
  targets: Element[] = [];
  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {
    MockObserver.instances.push(this);
  }
  // Like the real one, observing reports the current state right away
  observe(target: Element) {
    this.targets.push(target);
    if (MockObserver.visible) this.report(true);
  }
  unobserve() {}
  disconnect() {}
  report(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

const latest = () => MockObserver.instances[MockObserver.instances.length - 1]!;

const mountScroll = (props: Record<string, unknown> = {}) =>
  mount(NInfiniteScroll, {
    props,
    slots: { default: '<div class="item">item</div>' },
    attachTo: document.body,
  });

describe("NInfiniteScroll", () => {
  beforeEach(() => {
    MockObserver.instances = [];
    MockObserver.visible = false;
    vi.stubGlobal("IntersectionObserver", MockObserver);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("emits `load` once per intersection and uses `distance` as the margin", () => {
    const wrapper = mountScroll({ distance: 120 });
    expect(latest().options?.rootMargin).toBe("0px 0px 120px 0px");
    expect(wrapper.emitted("load")).toBeUndefined();

    latest().report(true);
    latest().report(true);
    expect(wrapper.emitted("load")).toHaveLength(1);

    latest().report(false);
    latest().report(true);
    expect(wrapper.emitted("load")).toHaveLength(2);
  });

  it("does not load while loading, finished, disabled or failed", async () => {
    const wrapper = mountScroll({ loading: true });
    latest().report(true);
    expect(wrapper.attributes("aria-busy")).toBe("true");

    await wrapper.setProps({ loading: false, finished: true });
    latest().report(true);
    await wrapper.setProps({ finished: false, disabled: true });
    latest().report(true);
    await wrapper.setProps({ disabled: false, error: true });
    latest().report(true);
    expect(wrapper.emitted("load")).toBeUndefined();
  });

  it("asks again after loading ends while the edge is still in view", async () => {
    MockObserver.visible = true;
    const wrapper = mountScroll();
    expect(wrapper.emitted("load")).toHaveLength(1);

    await wrapper.setProps({ loading: true });
    expect(wrapper.get(".n-infinite-scroll-status").text()).toBe("Loading…");
    await wrapper.setProps({ loading: false });
    expect(wrapper.emitted("load")).toHaveLength(2);

    await wrapper.setProps({ finished: true });
    expect(wrapper.get(".n-infinite-scroll-status").text()).toBe(
      "No more items",
    );

    // A page that left the edge out of view stays quiet until `check()`
    MockObserver.visible = false;
    await wrapper.setProps({ finished: false });
    expect(wrapper.emitted("load")).toHaveLength(2);
    MockObserver.visible = true;
    (wrapper.vm as unknown as { check(): void }).check();
    expect(wrapper.emitted("load")).toHaveLength(3);
  });

  it("shows the error with a retry button that emits `retry` then `load`", async () => {
    MockObserver.visible = true;
    const wrapper = mountScroll({ error: "Network down" });
    expect(wrapper.emitted("load")).toBeUndefined();
    expect(wrapper.get(".n-infinite-scroll-status").text()).toContain(
      "Network down",
    );

    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("retry")).toHaveLength(1);
    expect(wrapper.emitted("load")).toHaveLength(1);

    // Clearing the error brings automatic loading back
    await wrapper.setProps({ error: false });
    expect(wrapper.emitted("load")).toHaveLength(2);
  });

  it("loads from a button when manual or without IntersectionObserver", async () => {
    const wrapper = mountScroll({ manual: true });
    expect(MockObserver.instances).toHaveLength(0);
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("load")).toHaveLength(1);
    wrapper.unmount();

    vi.stubGlobal("IntersectionObserver", undefined);
    const fallback = mountScroll();
    await flushPromises();
    expect(fallback.get("button").text()).toBe("Load more");
  });

  it("keeps the scroll position when items are prepended going up", async () => {
    let scrollHeight = 500;
    const wrapper = mountScroll({ direction: "up", height: 200 });
    const el = wrapper.element as HTMLElement;
    Object.defineProperty(el, "scrollHeight", {
      get: () => scrollHeight,
      configurable: true,
    });
    expect(el.style.height).toBe("200px");
    expect(latest().options?.root).toBe(el);
    expect(latest().options?.rootMargin).toBe("200px 0px 0px 0px");

    el.scrollTop = 20;
    latest().report(true);
    expect(wrapper.emitted("load")).toHaveLength(1);

    await wrapper.setProps({ loading: true });
    scrollHeight = 800;
    await wrapper.setProps({ loading: false });
    await flushPromises();
    expect(el.scrollTop).toBe(320);
  });
});
