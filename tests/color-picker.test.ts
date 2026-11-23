import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NColorPicker } from "../src";
import { formatColor, parseColor } from "../src/utils/color";

describe("color utils", () => {
  it("reads hex, rgb and hsl", () => {
    expect(formatColor(parseColor("#f80")!, "hex")).toBe("#ff8800");
    expect(formatColor(parseColor("rgb(255 136 0)")!, "hex")).toBe("#ff8800");
    expect(formatColor(parseColor("hsl(120, 100%, 50%)")!, "hex")).toBe(
      "#00ff00",
    );
    expect(parseColor("nope")).toBeNull();
    expect(parseColor("rgb(1, 2)")).toBeNull();
  });

  it("writes every format and keeps a partial alpha", () => {
    const color = parseColor("#33669980")!;
    expect(formatColor(color, "hex")).toBe("#33669980");
    expect(formatColor(color, "rgb")).toBe("rgba(51, 102, 153, 0.5)");
    expect(formatColor(color, "hsl")).toBe("hsla(210, 50%, 40%, 0.5)");
    expect(formatColor(color, "hex", false)).toBe("#336699");
  });
});

describe("NColorPicker", () => {
  it("shows the value and opens the panel", async () => {
    const wrapper = mount(NColorPicker, {
      props: { modelValue: "#336699", name: "tint" },
      attachTo: document.body,
    });
    const trigger = wrapper.get("button.n-color-picker-trigger");
    expect(trigger.text()).toBe("#336699");
    expect(
      wrapper.get<HTMLInputElement>("input[type=hidden]").element.value,
    ).toBe("#336699");

    await trigger.trigger("click");
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(wrapper.find(".n-color-picker-area").exists()).toBe(true);
    wrapper.unmount();
  });

  it("shows the placeholder until a color is picked", async () => {
    const wrapper = mount(NColorPicker, {
      props: {
        placeholder: "Pick a color",
        inline: true,
        swatches: ["#ff0000"],
      },
    });
    wrapper.get(".n-color-picker-swatch").trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["#ff0000"]);

    const closed = mount(NColorPicker, { props: { placeholder: "Pick" } });
    expect(closed.get(".n-color-picker-value").text()).toBe("Pick");
  });

  it("moves with the arrow keys and keeps the hue of a gray", async () => {
    const wrapper = mount(NColorPicker, {
      props: { inline: true, modelValue: "#ff0000" },
    });
    const area = wrapper.get(".n-color-picker-area");
    await area.trigger("keydown", { key: "ArrowLeft", shiftKey: true });
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["#ff1919"]);

    await wrapper.get(".n-color-picker-hue").setValue("120");
    expect(wrapper.emitted("update:modelValue")!.at(-1)![0]).toMatch(/^#/);
  });

  it("commits a typed color and ignores an invalid one", async () => {
    const wrapper = mount(NColorPicker, {
      props: { inline: true, modelValue: "#ff0000", format: "rgb" },
    });
    const input = wrapper.get<HTMLInputElement>(".n-color-picker-text");
    expect(input.element.value).toBe("rgb(255, 0, 0)");

    await input.setValue("#00ff00");
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([
      "rgb(0, 255, 0)",
    ]);

    await input.setValue("banana");
    expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
  });

  it("adds an opacity slider with alpha", async () => {
    const wrapper = mount(NColorPicker, {
      props: { inline: true, alpha: true, modelValue: "#ff0000" },
    });
    await wrapper.get(".n-color-picker-alpha").setValue("50");
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["#ff000080"]);

    const plain = mount(NColorPicker, { props: { inline: true } });
    expect(plain.find(".n-color-picker-alpha").exists()).toBe(false);
  });
});
