import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NAlert, NSkeleton } from "../src";

describe("NAlert", () => {
  it("renders the title, description and a color icon with status semantics", () => {
    const wrapper = mount(NAlert, {
      props: { title: "Saved", description: "All good", color: "success" },
    });
    expect(wrapper.attributes("role")).toBe("status");
    expect(wrapper.attributes("data-variant")).toBe("soft");
    expect(wrapper.get(".n-alert-title").text()).toBe("Saved");
    expect(wrapper.get(".n-alert-description").text()).toBe("All good");
    expect(wrapper.get(".n-alert-icon").classes()).toContain(
      "i-lucide-circle-check",
    );
  });

  it("announces errors and warnings as alerts and lets an icon override the default", () => {
    const wrapper = mount(NAlert, {
      props: { title: "Oops", color: "error", icon: "i-lucide-bug" },
    });
    expect(wrapper.attributes("role")).toBe("alert");
    expect(wrapper.get(".n-alert-icon").classes()).toContain("i-lucide-bug");
    expect(
      mount(NAlert, { props: { color: "primary" } })
        .find(".n-alert-icon")
        .exists(),
    ).toBe(false);
  });

  it("emits close from the close button only when enabled", async () => {
    expect(
      mount(NAlert, { props: { title: "x" } })
        .find(".n-alert-close")
        .exists(),
    ).toBe(false);
    const wrapper = mount(NAlert, {
      props: { title: "x", close: true, closeLabel: "Dismiss" },
    });
    const button = wrapper.get(".n-alert-close");
    expect(button.attributes("aria-label")).toBe("Dismiss");
    await button.trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("renders actions and calls their click handlers", async () => {
    let clicked = 0;
    const wrapper = mount(NAlert, {
      props: {
        title: "x",
        actions: [{ label: "Undo", onClick: () => clicked++ }],
      },
    });
    await wrapper.get(".n-alert-actions button").trigger("click");
    expect(clicked).toBe(1);
  });
});

describe("NSkeleton", () => {
  it("is hidden from assistive technology unless labelled", () => {
    expect(mount(NSkeleton).attributes("aria-hidden")).toBe("true");
    const labelled = mount(NSkeleton, { props: { label: "Loading profile" } });
    expect(labelled.attributes("role")).toBe("status");
    expect(labelled.attributes("aria-label")).toBe("Loading profile");
    expect(labelled.attributes("aria-hidden")).toBeUndefined();
  });

  it("turns numbers into pixels and sets the size variables", () => {
    const style = mount(NSkeleton, {
      props: { width: 120, height: "2rem" },
    }).attributes("style");
    expect(style).toContain("--n-skeleton-w: 120px");
    expect(style).toContain("--n-skeleton-h: 2rem");
  });

  it("renders one line element per text line and ignores lines for other shapes", () => {
    const text = mount(NSkeleton, { props: { shape: "text", lines: 3 } });
    expect(text.findAll(".n-skeleton-line")).toHaveLength(3);
    expect(
      mount(NSkeleton, { props: { shape: "circle", lines: 3 } }).findAll(
        ".n-skeleton-line",
      ),
    ).toHaveLength(0);
  });

  it("can turn the pulse off", () => {
    expect(mount(NSkeleton).attributes("data-animated")).toBeDefined();
    expect(
      mount(NSkeleton, { props: { animated: false } }).attributes(
        "data-animated",
      ),
    ).toBeUndefined();
  });
});
