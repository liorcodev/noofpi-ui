import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NDataList, NProgress } from "../src";

describe("NProgress", () => {
  it("exposes progressbar semantics and the width as a percentage", () => {
    const wrapper = mount(NProgress, {
      props: { value: 30, max: 60, label: "Upload", showValue: true },
    });
    const track = wrapper.get("[role=progressbar]");
    expect(track.attributes("aria-valuenow")).toBe("30");
    expect(track.attributes("aria-valuemax")).toBe("60");
    expect(track.attributes("aria-labelledby")).toBe(
      wrapper.get(".n-progress-label").attributes("id"),
    );
    expect(wrapper.get(".n-progress-bar").attributes("style")).toContain(
      "width: 50%",
    );
    expect(wrapper.get(".n-progress-value").text()).toBe("50%");
    expect(wrapper.attributes("data-color")).toBe("primary");
    expect(wrapper.attributes("data-size")).toBe("md");
  });

  it("clamps the value into 0..max", () => {
    const over = mount(NProgress, { props: { value: 250 } });
    expect(over.get("[role=progressbar]").attributes("aria-valuenow")).toBe(
      "100",
    );
    expect(over.get(".n-progress-bar").attributes("style")).toContain(
      "width: 100%",
    );
    const under = mount(NProgress, { props: { value: -5 } });
    expect(under.get(".n-progress-bar").attributes("style")).toContain(
      "width: 0%",
    );
  });

  it("is indeterminate without a value", () => {
    const wrapper = mount(NProgress, {
      props: { label: "Loading", showValue: true },
    });
    expect(wrapper.attributes("data-indeterminate")).toBeDefined();
    const track = wrapper.get("[role=progressbar]");
    expect(track.attributes("aria-valuenow")).toBeUndefined();
    expect(wrapper.get(".n-progress-bar").attributes("style")).toBeUndefined();
    expect(wrapper.find(".n-progress-value").exists()).toBe(false);
  });
});

describe("NDataList", () => {
  const items = [
    { label: "Users", value: "3 days" },
    { label: "Devices", value: 0 },
  ];

  it("renders a description list with a row per item", () => {
    const wrapper = mount(NDataList, { props: { items } });
    expect(wrapper.find(".n-data-list-head").exists()).toBe(false);
    expect(wrapper.get("dl").element.tagName).toBe("DL");
    const rows = wrapper.findAll(".n-data-list-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.get("dt").text()).toBe("Users");
    expect(rows[0]!.get("dd").text()).toBe("3 days");
    expect(rows[1]!.get("dd").text()).toBe("0");
    expect(wrapper.attributes("data-divided")).toBeDefined();
    expect(wrapper.attributes("data-size")).toBe("md");
  });

  it("shows the title with an icon tile and supports no dividers", () => {
    const wrapper = mount(NDataList, {
      props: {
        items,
        title: "Session length",
        icon: "i-lucide-timer",
        color: "info",
        divided: false,
      },
    });
    expect(wrapper.get(".n-data-list-title").text()).toBe("Session length");
    expect(wrapper.get(".n-data-list-icon span").classes()).toContain(
      "i-lucide-timer",
    );
    expect(wrapper.attributes("data-color")).toBe("info");
    expect(wrapper.attributes("data-divided")).toBeUndefined();
  });

  it("prefers label and value slots", () => {
    const wrapper = mount(NDataList, {
      props: { items },
      slots: {
        value: `<template #value="{ item, index }">{{ index }}:{{ item.label }}</template>`,
      },
    });
    expect(wrapper.findAll("dd").map((dd) => dd.text())).toEqual([
      "0:Users",
      "1:Devices",
    ]);
  });
});
