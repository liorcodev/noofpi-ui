import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NTable, type TableColumn } from "../src";

const columns: TableColumn[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "age", label: "Age", sortable: true, align: "end" },
  { key: "city", label: "City", hideBelow: "md", width: "8rem" },
];

const data = [
  { id: "a", name: "Carol", age: 30, city: "Paris" },
  { id: "b", name: "alice", age: 4, city: "Rome" },
  { id: "c", name: "Bob", age: null, city: "Oslo" },
];

const names = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll(".n-table-row").map((row) => row.find("td").text());

describe("NTable", () => {
  it("renders headers, rows and column options", () => {
    const wrapper = mount(NTable, { props: { columns, data } });
    expect(wrapper.findAll("th").map((th) => th.text())).toEqual([
      "Name",
      "Age",
      "City",
    ]);
    expect(names(wrapper)).toEqual(["Carol", "alice", "Bob"]);
    const age = wrapper.findAll("th")[1]!;
    expect(age.attributes("data-align")).toBe("end");
    const city = wrapper.findAll("th")[2]!;
    expect(city.attributes("data-hide-below")).toBe("md");
    expect(city.attributes("style")).toContain("width: 8rem");
    expect(wrapper.findAll("td")[0]!.attributes("data-label")).toBe("Name");
  });

  it("renders cell and header slots", () => {
    const wrapper = mount(NTable, {
      props: { columns, data },
      slots: {
        "cell-name": `<template #cell-name="{ row, value, index }"><b>{{ index }}:{{ value }}:{{ row.city }}</b></template>`,
        "header-city": `<template #header-city="{ column }">[{{ column.key }}]</template>`,
      },
    });
    expect(wrapper.findAll("td")[0]!.text()).toBe("0:Carol:Paris");
    expect(wrapper.findAll("th")[2]!.text()).toBe("[city]");
  });

  it("sorts ascending, descending, then back to the original order", async () => {
    const wrapper = mount(NTable, { props: { columns, data } });
    const nameHeader = () => wrapper.findAll("th")[0]!;

    await nameHeader().get("button").trigger("click");
    expect(names(wrapper)).toEqual(["alice", "Bob", "Carol"]);
    expect(nameHeader().attributes("aria-sort")).toBe("ascending");

    await nameHeader().get("button").trigger("click");
    expect(names(wrapper)).toEqual(["Carol", "Bob", "alice"]);
    expect(nameHeader().attributes("aria-sort")).toBe("descending");

    await nameHeader().get("button").trigger("click");
    expect(names(wrapper)).toEqual(["Carol", "alice", "Bob"]);
    expect(nameHeader().attributes("aria-sort")).toBe("none");
    expect(wrapper.findAll("th")[2]!.attributes("aria-sort")).toBeUndefined();
  });

  it("sorts numbers numerically and keeps empty values last", async () => {
    const wrapper = mount(NTable, {
      props: { columns, data, sort: { key: "age", direction: "asc" } },
    });
    expect(names(wrapper)).toEqual(["alice", "Carol", "Bob"]);
    await wrapper.setProps({ sort: { key: "age", direction: "desc" } });
    expect(names(wrapper)).toEqual(["Carol", "alice", "Bob"]);
  });

  it("emits update:sort and leaves the order alone with manualSort", async () => {
    const wrapper = mount(NTable, {
      props: { columns, data, manualSort: true },
    });
    await wrapper.findAll("th")[0]!.get("button").trigger("click");
    expect(wrapper.emitted("update:sort")![0]).toEqual([
      { key: "name", direction: "asc" },
    ]);
    expect(names(wrapper)).toEqual(["Carol", "alice", "Bob"]);
  });

  it("shows the empty text or slot, and a spinner while loading", async () => {
    const wrapper = mount(NTable, { props: { columns, data: [] } });
    expect(wrapper.get(".n-table-status").text()).toBe("No data");
    expect(wrapper.get(".n-table-status td").attributes("colspan")).toBe("3");

    await wrapper.setProps({ loading: true });
    expect(wrapper.get(".n-table-status").text()).toBe("Loading…");
    expect(wrapper.find(".n-table-spinner").exists()).toBe(true);
    expect(wrapper.get("table").attributes("aria-busy")).toBe("true");

    const custom = mount(NTable, {
      props: { columns, data: [] },
      slots: { empty: "Nothing here" },
    });
    expect(custom.get(".n-table-status").text()).toBe("Nothing here");
  });

  it("stacks below a breakpoint, limits height and names the region", () => {
    const wrapper = mount(NTable, {
      props: {
        columns,
        data,
        caption: "People",
        stackBelow: "md",
        maxHeight: "10rem",
        striped: true,
      },
    });
    expect(wrapper.classes()).toContain("max-md:n-table-stacked");
    expect(wrapper.attributes("data-striped")).toBeDefined();
    expect(wrapper.attributes("style")).toContain("--n-table-max-h: 10rem");
    expect(wrapper.get(".n-table-scroll").attributes("aria-label")).toBe(
      "People",
    );
    expect(wrapper.get(".n-table-scroll").attributes("data-limited")).toBe("");
    expect(wrapper.get("caption").text()).toBe("People");
  });

  it("emits rowClick for clickable rows, but not for clicks on controls", async () => {
    const wrapper = mount(NTable, {
      props: { columns, data, clickable: true, rowKey: "id" },
      slots: {
        "cell-city": `<template #cell-city><button>Go</button></template>`,
      },
    });
    const row = wrapper.findAll(".n-table-row")[1]!;
    await row.trigger("click");
    expect(wrapper.emitted("rowClick")![0]![0]).toEqual(data[1]);
    expect(wrapper.emitted("rowClick")![0]![1]).toBe(1);

    await row.get("button").trigger("click");
    await row.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("rowClick")).toHaveLength(2);

    const plain = mount(NTable, { props: { columns, data } });
    await plain.get(".n-table-row").trigger("click");
    expect(plain.emitted("rowClick")).toBeUndefined();
  });

  it("sets the border strength", () => {
    const table = (border?: "none" | "sm" | "md" | "lg") =>
      mount(NTable, { props: { columns, data, border } });
    expect(table().attributes("data-border")).toBe("sm");
    expect(table("lg").attributes("data-border")).toBe("lg");
    expect(table("none").attributes("data-border")).toBe("none");
  });

  it("renders a footer slot outside the scroll area", () => {
    const wrapper = mount(NTable, {
      props: { columns, data },
      slots: { footer: "Page 1" },
    });
    expect(wrapper.get(".n-table-footer").text()).toBe("Page 1");
    expect(wrapper.find(".n-table-scroll .n-table-footer").exists()).toBe(
      false,
    );
  });
});
