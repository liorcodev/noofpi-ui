import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NTimeline } from "../src";

describe("NTimeline", () => {
  const items = [
    { title: "Created", date: "Mar 2026", description: "Repo created" },
    { title: "Released", icon: "i-lucide-rocket", color: "success" as const },
    { title: "Archived" },
  ];

  it("renders a labeled list with one item per entry", () => {
    const wrapper = mount(NTimeline, { props: { items } });
    expect(wrapper.element.tagName).toBe("OL");
    expect(wrapper.attributes("aria-label")).toBe("Timeline");
    expect(wrapper.findAll(".n-timeline-item")).toHaveLength(3);
    expect(wrapper.find(".n-timeline-date").text()).toBe("Mar 2026");
    expect(wrapper.find(".n-timeline-description").text()).toBe("Repo created");
  });

  it("draws a connector between items but not after the last", () => {
    const wrapper = mount(NTimeline, { props: { items } });
    expect(wrapper.findAll(".n-timeline-connector")).toHaveLength(2);
    expect(
      wrapper
        .findAll(".n-timeline-item")[2]!
        .find(".n-timeline-connector")
        .exists(),
    ).toBe(false);
  });

  it("applies per-item color and icon", () => {
    const wrapper = mount(NTimeline, { props: { items, color: "info" } });
    const rows = wrapper.findAll(".n-timeline-item");
    expect(wrapper.attributes("data-color")).toBe("info");
    expect(rows[0]!.attributes("data-color")).toBeUndefined();
    expect(rows[1]!.attributes("data-color")).toBe("success");
    expect(
      rows[1]!.find(".n-timeline-indicator").attributes("data-icon"),
    ).toBeDefined();
    expect(
      rows[0]!.find(".n-timeline-indicator").attributes("data-icon"),
    ).toBeUndefined();
  });

  it("supports orientation and slots", () => {
    const wrapper = mount(NTimeline, {
      props: { items, orientation: "horizontal" },
      slots: {
        title: `<template #title="{ item }">{{ item.title }}!</template>`,
      },
    });
    expect(wrapper.attributes("data-orientation")).toBe("horizontal");
    expect(wrapper.find(".n-timeline-title").text()).toBe("Created!");
  });
});
