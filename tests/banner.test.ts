import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NBanner } from "../src";

describe("NBanner", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("is a labelled region with the title, description and variant data", () => {
    const wrapper = mount(NBanner, {
      props: { title: "Sale", description: "Ends soon", color: "warning" },
    });
    expect(wrapper.get(".n-banner").attributes("role")).toBe("region");
    expect(wrapper.get(".n-banner").attributes("aria-label")).toBe(
      "Announcement",
    );
    expect(wrapper.get(".n-banner").attributes("data-variant")).toBe("solid");
    expect(wrapper.get(".n-banner").attributes("data-color")).toBe("warning");
    expect(wrapper.get(".n-banner-title").text()).toBe("Sale");
    expect(wrapper.get(".n-banner-description").text()).toBe("Ends soon");
    expect(wrapper.find(".n-banner-icon").exists()).toBe(false);
  });

  it("turns the message into a link, with rel for a new tab", () => {
    expect(
      mount(NBanner, { props: { title: "x" } })
        .find("a")
        .exists(),
    ).toBe(false);

    const wrapper = mount(NBanner, {
      props: { title: "x", href: "/news", target: "_blank" },
    });
    const link = wrapper.get("a.n-banner-link");
    expect(link.attributes("href")).toBe("/news");
    expect(link.attributes("rel")).toBe("noopener noreferrer");
    expect(link.find(".i-lucide-arrow-right").exists()).toBe(true);

    const plain = mount(NBanner, { props: { to: "/a", linkIcon: false } });
    expect(plain.get("a").attributes("rel")).toBeUndefined();
    expect(plain.find(".n-banner-link-icon").exists()).toBe(false);
  });

  it("hands `to` to a custom link component", () => {
    const Link = {
      props: ["to"],
      template: '<a class="router" :data-to="to"><slot /></a>',
    };
    const wrapper = mount(NBanner, {
      props: { title: "x", to: "/pricing", linkAs: Link },
    });
    expect(wrapper.get(".router").attributes("data-to")).toBe("/pricing");
  });

  it("renders actions and calls their click handlers", async () => {
    const onClick = vi.fn();
    const wrapper = mount(NBanner, {
      props: { title: "x", actions: [{ label: "Learn more", onClick }] },
    });
    const button = wrapper.get(".n-banner-actions button");
    expect(button.text()).toBe("Learn more");
    await button.trigger("click");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("dismisses with the close button, updating v-model:open and emitting close", async () => {
    expect(
      mount(NBanner, { props: { title: "x" } })
        .find(".n-banner-close")
        .exists(),
    ).toBe(false);

    const wrapper = mount(NBanner, {
      props: {
        title: "x",
        close: true,
        closeLabel: "Hide",
        open: true,
        "onUpdate:open": (value: boolean) => wrapper.setProps({ open: value }),
      },
    });
    const button = wrapper.get(".n-banner-close button");
    expect(button.attributes("aria-label")).toBe("Hide");
    await button.trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
    expect(wrapper.emitted("update:open")?.[0]).toEqual([false]);
    expect(wrapper.find(".n-banner").exists()).toBe(false);

    await wrapper.setProps({ open: true });
    expect(wrapper.find(".n-banner").exists()).toBe(true);
  });

  it("remembers a dismissal under a namespaced key and hides after mount", async () => {
    const first = mount(NBanner, {
      props: { title: "x", close: true, persistKey: "promo" },
    });
    expect(first.find(".n-banner").exists()).toBe(true);
    await first.get(".n-banner-close button").trigger("click");
    expect(window.localStorage.getItem("noofpi-ui:banner:promo")).toBe("1");

    const second = mount(NBanner, {
      props: { title: "x", persistKey: "promo" },
    });
    await nextTick();
    expect(second.find(".n-banner").exists()).toBe(false);

    const other = mount(NBanner, {
      props: { title: "x", persistKey: "other" },
    });
    await nextTick();
    expect(other.find(".n-banner").exists()).toBe(true);
  });

  it("still dismisses when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const wrapper = mount(NBanner, {
      props: { title: "x", close: true, persistKey: "promo" },
    });
    await nextTick();
    expect(wrapper.find(".n-banner").exists()).toBe(true);
    await wrapper.get(".n-banner-close button").trigger("click");
    expect(wrapper.find(".n-banner").exists()).toBe(false);
  });

  it("lets slots replace the close button and add leading and trailing content", async () => {
    const wrapper = mount(NBanner, {
      props: { title: "x" },
      slots: {
        leading: '<i class="lead" />',
        trailing: '<b class="trail" />',
        close: `<template #close="{ dismiss }"><button class="mine" @click="dismiss">no</button></template>`,
      },
    });
    expect(wrapper.find(".lead").exists()).toBe(true);
    expect(wrapper.find(".trail").exists()).toBe(true);
    await wrapper.get(".mine").trigger("click");
    expect(wrapper.find(".n-banner").exists()).toBe(false);
  });

  it("exposes position, placement, align and size as data attributes", () => {
    const wrapper = mount(NBanner, {
      props: {
        position: "sticky",
        placement: "bottom",
        align: "start",
        size: "lg",
      },
    });
    expect(wrapper.get(".n-banner").attributes("data-position")).toBe("sticky");
    expect(wrapper.get(".n-banner").attributes("data-placement")).toBe(
      "bottom",
    );
    expect(wrapper.get(".n-banner").attributes("data-align")).toBe("start");
    expect(wrapper.get(".n-banner").attributes("data-size")).toBe("lg");
  });
});
