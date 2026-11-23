import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NFormField, NRating } from "../src";

const stars = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll(".n-rating-item");

describe("NRating", () => {
  it("renders `max` stars as a slider and fills them up to the value", () => {
    const wrapper = mount(NRating, {
      props: { modelValue: 2.5, max: 4, label: "Quality" },
    });
    expect(stars(wrapper)).toHaveLength(4);
    expect(wrapper.attributes("role")).toBe("slider");
    expect(wrapper.attributes("aria-label")).toBe("Quality");
    expect(wrapper.attributes("aria-valuenow")).toBe("2.5");
    expect(wrapper.attributes("aria-valuemax")).toBe("4");
    expect(
      stars(wrapper).map((s) => (s.element as HTMLElement).style.cssText),
    ).toEqual([
      "--n-rating-fill: 1;",
      "--n-rating-fill: 1;",
      "--n-rating-fill: 0.5;",
      "--n-rating-fill: 0;",
    ]);
  });

  it("sets the value of a clicked star, and resets it when clearable", async () => {
    const wrapper = mount(NRating, { props: { modelValue: 1 } });
    await stars(wrapper)[2]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[3]]);

    const clearable = mount(NRating, {
      props: { modelValue: 3, clearable: true },
    });
    await stars(clearable)[2]!.trigger("click");
    expect(clearable.emitted("update:modelValue")).toEqual([[0]]);
  });

  it("picks half a point from the half of the star that is clicked", async () => {
    const wrapper = mount(NRating, { props: { allowHalf: true } });
    const star = stars(wrapper)[1]!;
    star.element.getBoundingClientRect = () =>
      ({ left: 0, width: 20 }) as DOMRect;
    await star.trigger("click", { clientX: 4 });
    await star.trigger("click", { clientX: 16 });
    expect(wrapper.emitted("update:modelValue")).toEqual([[1.5], [2]]);
  });

  it("moves with the keyboard and stays within its range", async () => {
    const wrapper = mount(NRating, {
      props: {
        modelValue: 5,
        "onUpdate:modelValue": (value: number | undefined) =>
          wrapper.setProps({ modelValue: value }),
      },
    });
    await wrapper.trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    await wrapper.trigger("keydown", { key: "ArrowDown" });
    await wrapper.trigger("keydown", { key: "Home" });
    await wrapper.trigger("keydown", { key: "ArrowDown" });
    await wrapper.trigger("keydown", { key: "End" });
    expect(wrapper.emitted("update:modelValue")).toEqual([[4], [1], [5]]);

    const clearable = mount(NRating, {
      props: { modelValue: 3, clearable: true },
    });
    await clearable.trigger("keydown", { key: "Home" });
    expect(clearable.emitted("update:modelValue")).toEqual([[0]]);
  });

  it("does not change when read-only or disabled", async () => {
    const readonly = mount(NRating, {
      props: { modelValue: 3, readonly: true, label: "Score" },
    });
    expect(readonly.attributes("role")).toBe("img");
    expect(readonly.attributes("aria-label")).toBe("Score: 3/5");
    expect(readonly.attributes("tabindex")).toBeUndefined();
    await stars(readonly)[0]!.trigger("click");
    await readonly.trigger("keydown", { key: "ArrowRight" });
    expect(readonly.emitted("update:modelValue")).toBeUndefined();

    const disabled = mount(NRating, { props: { disabled: true } });
    await stars(disabled)[0]!.trigger("click");
    expect(disabled.emitted("update:modelValue")).toBeUndefined();
    expect(disabled.attributes("aria-disabled")).toBe("true");
  });

  it("takes its id and invalid state from an NFormField and submits a hidden input", () => {
    const wrapper = mount({
      components: { NFormField, NRating },
      template: `<NFormField label="Review" error="Pick one"><NRating name="review" :model-value="4" /></NFormField>`,
    });
    const rating = wrapper.find(".n-rating");
    expect(rating.attributes("id")).toBeTruthy();
    expect(rating.attributes("aria-invalid")).toBe("true");
    expect(wrapper.find("input[type=hidden]").attributes("value")).toBe("4");
  });
});
