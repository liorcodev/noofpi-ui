import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NCalendar, NDatePicker } from "../src";

const day = (wrapper: ReturnType<typeof mount>, iso: string) =>
  wrapper.get(`[data-date="${iso}"]`);

describe("NCalendar", () => {
  it("shows the month of the value and navigates", async () => {
    const wrapper = mount(NCalendar, {
      props: { modelValue: "2024-02-14", locale: "en-US" },
    });
    expect(wrapper.get(".n-calendar-title").text()).toBe("February 2024");
    expect(day(wrapper, "2024-02-14").attributes("data-selected")).toBe("");

    await wrapper.get('[aria-label="Next month"]').trigger("click");
    expect(wrapper.get(".n-calendar-title").text()).toBe("March 2024");
    expect(wrapper.findAll("tbody tr")).toHaveLength(6);
  });

  it("starts the week on weekStart", () => {
    const wrapper = mount(NCalendar, {
      props: { modelValue: "2024-02-14", locale: "en-US", weekStart: 1 },
    });
    expect(wrapper.findAll("th")[0]!.attributes("abbr")).toBe("Monday");
  });

  it("selects a date and skips disabled ones", async () => {
    const wrapper = mount(NCalendar, {
      props: { modelValue: "2024-02-14", min: "2024-02-10", max: "2024-02-20" },
    });
    await day(wrapper, "2024-02-05").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    await day(wrapper, "2024-02-16").trigger("click");
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["2024-02-16"]);
  });

  it("moves with the arrow keys across months", async () => {
    const wrapper = mount(NCalendar, {
      props: { modelValue: "2024-01-31", locale: "en-US" },
      attachTo: document.body,
    });
    await day(wrapper, "2024-01-31").trigger("keydown", { key: "ArrowDown" });
    expect(wrapper.get(".n-calendar-title").text()).toBe("February 2024");
    expect(day(wrapper, "2024-02-07").attributes("tabindex")).toBe("0");

    await day(wrapper, "2024-02-07").trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["2024-02-07"]);
    wrapper.unmount();
  });

  it("picks a range and orders its ends", async () => {
    const wrapper = mount(NCalendar, {
      props: { range: true, modelValue: { start: null, end: null } },
    });
    await wrapper.setProps({ modelValue: { start: "2024-02-10", end: null } });
    await day(wrapper, "2024-02-14").trigger("mouseenter");
    expect(
      day(wrapper, "2024-02-12").element.parentElement!.hasAttribute(
        "data-in-range",
      ),
    ).toBe(true);

    await day(wrapper, "2024-02-05").trigger("click");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([
      { start: "2024-02-05", end: "2024-02-10" },
    ]);
  });
});

describe("NDatePicker", () => {
  it("opens, picks a date, closes and formats it", async () => {
    const wrapper = mount(NDatePicker, {
      props: {
        modelValue: "2024-02-14",
        locale: "en-US",
        name: "when",
        placeholder: "Pick a date",
      },
      attachTo: document.body,
    });
    const trigger = wrapper.get("button.n-date-picker-trigger");
    expect(trigger.text()).toBe("Feb 14, 2024");
    expect(
      wrapper.get<HTMLInputElement>("input[type=hidden]").element.value,
    ).toBe("2024-02-14");

    await trigger.trigger("click");
    expect(trigger.attributes("aria-expanded")).toBe("true");

    await day(wrapper, "2024-02-20").trigger("click");
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["2024-02-20"]);
    expect(wrapper.emitted("update:open")!.at(-1)).toEqual([false]);
    wrapper.unmount();
  });

  it("stays open until a range has both dates", async () => {
    const wrapper = mount(NDatePicker, {
      props: {
        range: true,
        open: true,
        modelValue: { start: "2024-02-10", end: null },
        locale: "en-US",
      },
      attachTo: document.body,
    });
    expect(wrapper.get(".n-date-picker-value").text()).toBe("Feb 10, 2024 –");

    await wrapper.setProps({
      modelValue: { start: "2024-02-10", end: "2024-02-12" },
    });
    expect(wrapper.emitted("update:open")!.at(-1)).toEqual([false]);
    wrapper.unmount();
  });
});
