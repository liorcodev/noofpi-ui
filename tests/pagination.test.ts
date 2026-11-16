import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NPagination } from "../src";

const labels = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .findAll(".n-pagination-item, .n-pagination-gap")
    .map((el) => el.text())
    .filter((text) => text !== "");

describe("NPagination", () => {
  it("derives the pages from total and pageSize and marks the current one", () => {
    const wrapper = mount(NPagination, {
      props: { total: 45, pageSize: 10, modelValue: 2 },
    });
    expect(labels(wrapper)).toEqual(["1", "2", "3", "4", "5"]);
    const active = wrapper.get("[aria-current=page]");
    expect(active.text()).toBe("2");
    expect(active.attributes("aria-label")).toBe("Page 2");
    expect(wrapper.attributes("aria-label")).toBe("Pagination");
  });

  it("collapses long ranges with a stable number of entries", () => {
    const at = (modelValue: number) =>
      labels(
        mount(NPagination, {
          props: { total: 1000, pageSize: 10, modelValue },
        }),
      );
    expect(at(1)).toEqual(["1", "2", "3", "4", "5", "…", "100"]);
    expect(at(50)).toEqual(["1", "…", "49", "50", "51", "…", "100"]);
    expect(at(100)).toEqual(["1", "…", "96", "97", "98", "99", "100"]);
  });

  it("changes pages through v-model and disables the ends", async () => {
    const wrapper = mount(NPagination, {
      props: {
        total: 30,
        modelValue: 1,
        "onUpdate:modelValue": (value: number) =>
          wrapper.setProps({ modelValue: value }),
      },
    });
    const prev = wrapper.get("[aria-label='Previous page']");
    const next = wrapper.get("[aria-label='Next page']");
    expect(prev.attributes("disabled")).toBeDefined();
    await next.trigger("click");
    expect(wrapper.props("modelValue")).toBe(2);
    await wrapper.get("[aria-label='Page 3']").trigger("click");
    expect(wrapper.props("modelValue")).toBe(3);
    expect(next.attributes("disabled")).toBeDefined();
  });

  it("shows edge buttons and jumps to the first and last page", async () => {
    const wrapper = mount(NPagination, {
      props: {
        total: 100,
        modelValue: 5,
        showEdges: true,
        "onUpdate:modelValue": (value: number) =>
          wrapper.setProps({ modelValue: value }),
      },
    });
    await wrapper.get("[aria-label='Last page']").trigger("click");
    expect(wrapper.props("modelValue")).toBe(10);
    await wrapper.get("[aria-label='First page']").trigger("click");
    expect(wrapper.props("modelValue")).toBe(1);
  });

  it("clamps an out of range page and ignores clicks when disabled", async () => {
    const wrapper = mount(NPagination, {
      props: { total: 30, modelValue: 99, disabled: true },
    });
    expect(wrapper.get("[aria-current=page]").text()).toBe("3");
    await wrapper.get("[aria-label='Page 1']").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
