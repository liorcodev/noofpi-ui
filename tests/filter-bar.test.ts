import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NFilterBar, type FilterBarValue } from "../src";

const filters = [
  {
    key: "status",
    label: "Status",
    type: "multiselect" as const,
    options: [
      { label: "Open", value: "open" },
      { label: "Closed", value: "closed" },
      { label: "Archived", value: "archived" },
    ],
  },
  {
    key: "owner",
    label: "Owner",
    type: "select" as const,
    options: [
      { label: "Ada", value: 1 },
      { label: "Grace", value: 2 },
    ],
  },
  { key: "title", label: "Title", type: "text" as const },
  { key: "created", label: "Created", type: "date" as const },
];

const sortOptions = [
  { key: "title", label: "Title" },
  { key: "created", label: "Created" },
];

type Bar = VueWrapper<InstanceType<typeof NFilterBar>>;

// Applies what the bar emits, like `v-model` does
function mountBar(props: Record<string, unknown> = {}): Bar {
  const wrapper: Bar = mount(NFilterBar, {
    props: {
      filters,
      modelValue: { search: "", filters: {}, sort: null },
      ...props,
      "onUpdate:modelValue": (value: FilterBarValue | undefined) =>
        wrapper.setProps({ modelValue: value }),
      "onUpdate:view": (value: string | number | null) =>
        wrapper.setProps({ view: value }),
    },
    attachTo: document.body,
  });
  return wrapper;
}

const emitted = (wrapper: Bar) =>
  wrapper.emitted("update:modelValue") as FilterBarValue[][];

const last = (wrapper: Bar) => emitted(wrapper).at(-1)![0]!;

const panel = () => document.body.querySelector<HTMLElement>(".n-popover")!;

const menuItem = (label: string) =>
  Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ).find((item) => item.textContent?.includes(label))!;

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("NFilterBar", () => {
  it("debounces the search, and applies it at once on Enter and when cleared", async () => {
    vi.useFakeTimers();
    const wrapper = mountBar({ debounce: 300 });
    const input = wrapper.get("input");

    await input.setValue("bug");
    vi.advanceTimersByTime(299);
    expect(wrapper.emitted("search")).toBeUndefined();
    vi.advanceTimersByTime(1);
    expect(wrapper.emitted("search")).toEqual([["bug"]]);
    expect(last(wrapper).search).toBe("bug");

    await input.setValue("bugs");
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("search")).toEqual([["bug"], ["bugs"]]);
    expect(last(wrapper).search).toBe("bugs");

    await wrapper.get(".n-filter-bar-search-clear").trigger("click");
    expect(wrapper.emitted("search")?.at(-1)).toEqual([""]);
    expect(last(wrapper).search).toBe("");
    expect((input.element as HTMLInputElement).value).toBe("");
    // Nothing is left waiting
    vi.advanceTimersByTime(1000);
    expect(wrapper.emitted("search")).toHaveLength(3);
    wrapper.unmount();
  });

  it("sets filters in the panel, shows them as chips and keeps the search that was still waiting", async () => {
    vi.useFakeTimers();
    const wrapper = mountBar();
    await wrapper.get("input").setValue("crash");

    await wrapper.get(".n-filter-bar-filters").trigger("click");
    const boxes = panel().querySelectorAll<HTMLInputElement>(
      "input[type=checkbox]",
    );
    boxes[0]!.click();
    await nextTick();
    boxes[1]!.click();
    await nextTick();

    expect(last(wrapper)).toEqual({
      search: "crash",
      filters: { status: ["open", "closed"] },
      sort: null,
    });
    expect(wrapper.emitted("search")).toEqual([["crash"]]);
    expect(wrapper.get(".n-filter-bar-count").text()).toBe("1");
    expect(wrapper.get(".n-filter-bar-chip").text()).toContain(
      "Status: Open, Closed",
    );

    // The select filter picks one value, which is not stringified
    panel().querySelectorAll<HTMLInputElement>("input[type=radio]")[1]!.click();
    await nextTick();
    expect(last(wrapper).filters).toEqual({
      status: ["open", "closed"],
      owner: 2,
    });
    wrapper.unmount();
  });

  it("removes a chip and clears everything but the sort, without mutating the model", async () => {
    const modelValue: FilterBarValue = {
      search: "crash",
      filters: { status: ["open"], owner: 1, created: "2026-03-05" },
      sort: { key: "title", direction: "desc" },
    };
    const wrapper = mountBar({ modelValue });
    const chips = wrapper.findAll(".n-filter-bar-chip");
    expect(chips.map((chip) => chip.text())).toEqual([
      "Status: Open",
      "Owner: Ada",
      expect.stringMatching(/^Created: .*2026/),
    ]);

    await chips[1]!.get(".n-filter-bar-chip-remove").trigger("click");
    expect(last(wrapper).filters).toEqual({
      status: ["open"],
      created: "2026-03-05",
    });
    expect(modelValue.filters).toHaveProperty("owner", 1);

    await wrapper.get(".n-filter-bar-clear").trigger("click");
    expect(last(wrapper)).toEqual({
      search: "",
      filters: {},
      sort: { key: "title", direction: "desc" },
    });
    expect(wrapper.emitted("clear")).toHaveLength(1);
    expect(wrapper.emitted("search")).toEqual([[""]]);
    expect(wrapper.find(".n-filter-bar-chip").exists()).toBe(false);
    wrapper.unmount();
  });

  it("edits a text filter from its chip and applies it on Enter", async () => {
    const wrapper = mountBar({
      modelValue: { search: "", filters: { title: "login" }, sort: null },
    });
    await wrapper.get(".n-filter-bar-chip-edit").trigger("click");
    const field = panel().querySelector<HTMLInputElement>("input")!;
    expect(field.value).toBe("login");

    field.value = "  logout ";
    field.dispatchEvent(new Event("input"));
    await nextTick();
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(last(wrapper).filters).toEqual({ title: "logout" });

    // Emptying it takes the filter off
    field.value = "";
    field.dispatchEvent(new Event("input"));
    field.dispatchEvent(new Event("change"));
    await nextTick();
    expect(last(wrapper).filters).toEqual({});
    wrapper.unmount();
  });

  it("sorts from the menu: key, direction, and back to the default order", async () => {
    const wrapper = mountBar({ sortOptions });
    await wrapper.get(".n-filter-bar-sort button").trigger("click");
    menuItem("Created").click();
    await nextTick();
    expect(last(wrapper).sort).toEqual({ key: "created", direction: "asc" });
    expect(wrapper.get(".n-filter-bar-sort button").text()).toBe(
      "Sort: Created",
    );

    await wrapper.get(".n-filter-bar-sort button").trigger("click");
    menuItem("Descending").click();
    await nextTick();
    expect(last(wrapper).sort).toEqual({ key: "created", direction: "desc" });

    await wrapper.get(".n-filter-bar-sort button").trigger("click");
    menuItem("Default order").click();
    await nextTick();
    expect(last(wrapper).sort).toBeNull();
    wrapper.unmount();
  });

  it("switches to a saved view, forgets it when the value is edited, and emits save-view", async () => {
    const views = [
      {
        id: "mine",
        label: "My bugs",
        value: {
          search: "bug",
          filters: { owner: 1 },
          sort: { key: "created", direction: "desc" as const },
        },
      },
    ];
    const wrapper = mountBar({ views, saveable: true });

    await wrapper.get(".n-filter-bar-views button").trigger("click");
    menuItem("My bugs").click();
    await nextTick();
    expect(last(wrapper)).toEqual(views[0]!.value);
    expect(last(wrapper).filters).not.toBe(views[0]!.value.filters);
    expect(wrapper.emitted("update:view")).toEqual([["mine"]]);
    expect(wrapper.get<HTMLInputElement>("input").element.value).toBe("bug");
    expect(wrapper.get(".n-filter-bar-views button").text()).toBe("My bugs");

    await wrapper.get(".n-filter-bar-chip-remove").trigger("click");
    expect(wrapper.emitted("update:view")?.at(-1)).toEqual([null]);

    await wrapper.get(".n-filter-bar-views button").trigger("click");
    menuItem("Save current view").click();
    await nextTick();
    expect(wrapper.emitted("save-view")).toEqual([
      [
        {
          search: "bug",
          filters: {},
          sort: { key: "created", direction: "desc" },
        },
      ],
    ]);
    wrapper.unmount();
  });

  it("replaces a chip's text and a filter's editor with slots, and formats values", async () => {
    const wrapper = mount(NFilterBar, {
      props: {
        filters: [
          ...filters,
          { key: "score", label: "Score", type: "number" as const },
        ],
        modelValue: {
          search: "",
          filters: { score: 1500, owner: 2 },
          sort: null,
        },
        locale: "en-US",
        formatValue: (filter: { key: string }) =>
          filter.key === "owner" ? "Someone" : undefined,
      },
      slots: { "filter-score": '<p class="custom">Custom score editor</p>' },
      attachTo: document.body,
    });
    const chips = wrapper.findAll(".n-filter-bar-chip");
    expect(chips.map((chip) => chip.text())).toEqual([
      "Owner: Someone",
      "Score: 1,500",
    ]);

    await wrapper.get(".n-filter-bar-filters").trigger("click");
    expect(panel().querySelector(".custom")?.textContent).toBe(
      "Custom score editor",
    );
    expect(panel().querySelector(".n-number")).toBeNull();
    wrapper.unmount();
  });
});
