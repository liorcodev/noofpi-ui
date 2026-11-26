import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NDateTimePicker } from "../src";

type Props = Record<string, unknown>;

function mountPicker(props: Props = {}) {
  const wrapper = mount(NDateTimePicker, {
    props: {
      locale: "en-US",
      open: true,
      ...props,
      "onUpdate:modelValue": (value: unknown) =>
        wrapper.setProps({ modelValue: value as string | null }),
    },
    attachTo: document.body,
  });
  return wrapper;
}

const day = (wrapper: ReturnType<typeof mount>, iso: string) =>
  wrapper.get(`[data-date="${iso}"]`);

const option = (
  wrapper: ReturnType<typeof mount>,
  list: string,
  text: string,
) =>
  wrapper
    .findAll(`[role=listbox][aria-label="${list}"] [role=option]`)
    .find((item) => item.text() === text)!;

const options = (wrapper: ReturnType<typeof mount>, list: string) =>
  wrapper.findAll(`[role=listbox][aria-label="${list}"] [role=option]`);

afterEach(() => {
  vi.useRealTimers();
});

describe("NDateTimePicker", () => {
  it("formats the value, submits it and gives a picked date the default time", async () => {
    const wrapper = mountPicker({
      modelValue: null,
      name: "when",
      defaultTime: "09:30",
      hour12: false,
    });
    expect(
      wrapper.get(".n-date-time-picker-trigger").attributes("data-placeholder"),
    ).toBe("");

    await wrapper.setProps({ modelValue: "2024-02-14T14:05" });
    expect(wrapper.get(".n-date-time-picker-value").text()).toBe(
      "Feb 14, 2024, 14:05",
    );
    expect(
      wrapper.get<HTMLInputElement>("input[type=hidden]").element.value,
    ).toBe("2024-02-14T14:05");

    await day(wrapper, "2024-02-20").trigger("click");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([
      "2024-02-20T14:05",
    ]);
    wrapper.unmount();
  });

  it("starts a first date at defaultTime, and 'now' rounds to the step", async () => {
    const wrapper = mountPicker({
      modelValue: null,
      defaultTime: "09:30",
      hour12: false,
    });
    const days = wrapper.findAll("[data-date]");
    await days.find((d) => d.text() === "20")!.trigger("click");
    const picked = wrapper.emitted("update:modelValue")!.at(-1)![0] as string;
    expect(picked).toMatch(/^\d{4}-\d{2}-20T09:30$/);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2024, 1, 14, 10, 52, 40));
    const now = mountPicker({
      modelValue: null,
      defaultTime: "now",
      minuteStep: 15,
      hour12: false,
    });
    await now.setProps({ open: false });
    await now.setProps({ open: true });
    await day(now, "2024-02-14").trigger("click");
    expect(now.emitted("update:modelValue")!.at(-1)).toEqual([
      "2024-02-14T10:45",
    ]);
    wrapper.unmount();
    now.unmount();
  });

  it("picks hours and minutes on a step, with seconds", async () => {
    const wrapper = mountPicker({
      modelValue: "2024-02-14T08:00:00",
      hour12: false,
      minuteStep: 15,
      seconds: true,
    });
    expect(options(wrapper, "Hours")).toHaveLength(24);
    expect(options(wrapper, "Minutes").map((o) => o.text())).toEqual([
      "00",
      "15",
      "30",
      "45",
    ]);
    expect(option(wrapper, "Hours", "08").attributes("aria-selected")).toBe(
      "true",
    );

    await option(wrapper, "Hours", "13").trigger("click");
    await option(wrapper, "Minutes", "45").trigger("click");
    await option(wrapper, "Seconds", "07").trigger("click");
    expect(wrapper.emitted("update:modelValue")!.map((e) => e[0])).toEqual([
      "2024-02-14T13:00:00",
      "2024-02-14T13:45:00",
      "2024-02-14T13:45:07",
    ]);
    wrapper.unmount();
  });

  it("uses a 12-hour clock with an AM/PM column", async () => {
    const wrapper = mountPicker({
      modelValue: "2024-02-14T00:30",
      hour12: true,
    });
    expect(
      options(wrapper, "Hours")
        .map((o) => o.text())
        .slice(0, 2),
    ).toEqual(["12", "1"]);
    expect(option(wrapper, "Hours", "12").attributes("aria-selected")).toBe(
      "true",
    );
    expect(option(wrapper, "AM/PM", "AM").attributes("aria-selected")).toBe(
      "true",
    );

    await option(wrapper, "AM/PM", "PM").trigger("click");
    await option(wrapper, "Hours", "3").trigger("click");
    expect(wrapper.emitted("update:modelValue")!.map((e) => e[0])).toEqual([
      "2024-02-14T12:30",
      "2024-02-14T15:30",
    ]);
    wrapper.unmount();
  });

  it("moves through a list with the arrow keys, skipping disabled times", async () => {
    const wrapper = mountPicker({
      modelValue: "2024-02-14T10:00",
      hour12: false,
      min: "2024-02-14T08:00",
      max: "2024-02-14T12:00",
    });
    expect(option(wrapper, "Hours", "07").attributes("aria-disabled")).toBe(
      "true",
    );
    expect(option(wrapper, "Hours", "13").attributes("aria-disabled")).toBe(
      "true",
    );

    const list = wrapper.get('[aria-label="Hours"]');
    await list
      .get('[aria-selected="true"]')
      .trigger("keydown", { key: "ArrowDown" });
    await list
      .get('[aria-selected="true"]')
      .trigger("keydown", { key: "ArrowDown" });
    await list
      .get('[aria-selected="true"]')
      .trigger("keydown", { key: "ArrowDown" });
    expect(wrapper.emitted("update:modelValue")!.map((e) => e[0])).toEqual([
      "2024-02-14T11:00",
      "2024-02-14T12:00",
    ]);

    await list
      .get('[aria-selected="true"]')
      .trigger("keydown", { key: "Home" });
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([
      "2024-02-14T08:00",
    ]);
    wrapper.unmount();
  });

  it("moves the time into min and max when the date changes", async () => {
    const wrapper = mountPicker({
      modelValue: "2024-02-14T10:30",
      hour12: false,
      minuteStep: 15,
      min: "2024-02-12T14:10",
      max: "2024-02-16T09:00",
    });
    expect(day(wrapper, "2024-02-11").attributes("aria-disabled")).toBe("true");

    await day(wrapper, "2024-02-12").trigger("click");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([
      "2024-02-12T14:15",
    ]);

    await day(wrapper, "2024-02-16").trigger("click");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([
      "2024-02-16T09:00",
    ]);
    expect(option(wrapper, "Hours", "10").attributes("aria-disabled")).toBe(
      "true",
    );
    wrapper.unmount();
  });

  it("picks now within the limits, clears and closes with Done", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2024, 5, 10, 16, 20, 30));
    const wrapper = mountPicker({
      modelValue: null,
      hour12: false,
      clearable: true,
      max: "2024-06-10T15:00",
    });
    const button = (label: string) =>
      wrapper.findAll("button").find((b) => b.text() === label)!;

    await button("Now").trigger("click");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([
      "2024-06-10T15:00",
    ]);

    await button("Clear").trigger("click");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([null]);

    await button("Done").trigger("click");
    expect(wrapper.emitted("update:open")!.at(-1)).toEqual([false]);
    wrapper.unmount();
  });

  it("shows the time zone name next to the time without converting it", async () => {
    const wrapper = mountPicker({
      modelValue: "2024-01-15T09:00",
      hour12: false,
      timeZone: "America/New_York",
    });
    expect(wrapper.get(".n-date-time-picker-value").text()).toMatch(
      /9:00.*EST$/,
    );
    expect(wrapper.get(".n-date-time-picker-time-text").text()).toMatch(
      /09:00.*EST$/,
    );
    wrapper.unmount();
  });
});
