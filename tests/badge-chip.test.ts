import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NBadge, NChip } from "../src";

describe("NBadge", () => {
  it("renders the label with defaults as data attributes", () => {
    const wrapper = mount(NBadge, { props: { label: "New" } });
    expect(wrapper.element.tagName).toBe("SPAN");
    expect(wrapper.text()).toBe("New");
    expect(wrapper.attributes("data-variant")).toBe("solid");
    expect(wrapper.attributes("data-color")).toBe("primary");
    expect(wrapper.attributes("data-size")).toBe("md");
    expect(wrapper.attributes("data-pill")).toBeUndefined();
  });

  it("renders a `0` label and the default slot over the label", () => {
    expect(mount(NBadge, { props: { label: 0 } }).text()).toBe("0");
    const wrapper = mount(NBadge, {
      props: { label: "ignored" },
      slots: { default: "Slot" },
    });
    expect(wrapper.text()).toBe("Slot");
  });

  it("exposes variant, color, size and pill", () => {
    const wrapper = mount(NBadge, {
      props: {
        label: "x",
        variant: "subtle",
        color: "error",
        size: "xl",
        pill: true,
      },
    });
    expect(wrapper.attributes("data-variant")).toBe("subtle");
    expect(wrapper.attributes("data-color")).toBe("error");
    expect(wrapper.attributes("data-size")).toBe("xl");
    expect(wrapper.attributes("data-pill")).toBe("");
  });

  it("renders icons on both sides, hidden from assistive tech", () => {
    const wrapper = mount(NBadge, {
      props: {
        label: "Beta",
        icon: "i-lucide-flask-conical",
        trailingIcon: "i-lucide-x",
      },
    });
    const icons = wrapper.findAll(".n-badge-icon");
    expect(icons).toHaveLength(2);
    expect(icons[0]!.classes()).toContain("i-lucide-flask-conical");
    expect(icons[1]!.classes()).toContain("i-lucide-x");
    expect(icons[0]!.attributes("aria-hidden")).toBe("true");
  });

  it("renders as another element", () => {
    const wrapper = mount(NBadge, {
      props: { as: "a", label: "Link" },
      attrs: { href: "/x" },
    });
    expect(wrapper.element.tagName).toBe("A");
    expect(wrapper.attributes("href")).toBe("/x");
  });
});

describe("NChip", () => {
  it("renders a decorative dot on the top right of its content", () => {
    const wrapper = mount(NChip, {
      slots: { default: "<button>Inbox</button>" },
    });
    expect(wrapper.find("button").exists()).toBe(true);
    const chip = wrapper.get(".n-chip-badge");
    expect(chip.attributes("data-position")).toBe("top-right");
    expect(chip.attributes("data-color")).toBe("primary");
    expect(chip.attributes("data-size")).toBe("md");
    expect(chip.attributes("data-text")).toBeUndefined();
    expect(chip.attributes("aria-hidden")).toBe("true");
  });

  it("shows `text` (including 0) and the `content` slot", () => {
    const zero = mount(NChip, { props: { text: 0 }, slots: { default: "x" } });
    expect(zero.get(".n-chip-badge").text()).toBe("0");
    expect(zero.get(".n-chip-badge").attributes("data-text")).toBe("");
    expect(zero.get(".n-chip-badge").attributes("aria-hidden")).toBeUndefined();

    const slotted = mount(NChip, {
      slots: { default: "x", content: "<b>9+</b>" },
    });
    expect(slotted.get(".n-chip-badge").text()).toBe("9+");
    expect(slotted.get(".n-chip-badge").attributes("data-text")).toBe("");
  });

  it("exposes position, size, color and inset", () => {
    const wrapper = mount(NChip, {
      props: {
        position: "bottom-left",
        size: "xl",
        color: "success",
        inset: true,
      },
      slots: { default: "x" },
    });
    const chip = wrapper.get(".n-chip-badge");
    expect(chip.attributes("data-position")).toBe("bottom-left");
    expect(chip.attributes("data-size")).toBe("xl");
    expect(chip.attributes("data-color")).toBe("success");
    expect(chip.attributes("data-inset")).toBe("");
  });

  it("hides the chip but keeps the content with `show: false`", () => {
    const wrapper = mount(NChip, {
      props: { show: false },
      slots: { default: "<i>kept</i>" },
    });
    expect(wrapper.find(".n-chip-badge").exists()).toBe(false);
    expect(wrapper.text()).toBe("kept");
  });

  it("renders only the chip when `standalone`", () => {
    const wrapper = mount(NChip, {
      props: { standalone: true, text: "New" },
      slots: { default: "ignored" },
    });
    expect(wrapper.classes()).toContain("n-chip-badge");
    expect(wrapper.find(".n-chip").exists()).toBe(false);
    expect(wrapper.text()).toBe("New");
    expect(wrapper.attributes("data-position")).toBeUndefined();
  });
});
