import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";
import { NTree } from "../src";
import type { TreeItem, TreeValue } from "../src";

const items: TreeItem[] = [
  {
    value: "src",
    label: "src",
    icon: "i-lucide-folder",
    children: [
      { value: "components", label: "components" },
      {
        value: "pages",
        label: "pages",
        children: [{ value: "index", label: "index.vue" }],
      },
    ],
  },
  { value: "readme", label: "README.md", description: "Project guide" },
  { value: "secret", label: "secret", disabled: true },
];

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("NTree", () => {
  it("expands nodes and supports single and multiple selection", async () => {
    let selected: TreeValue | TreeValue[] | undefined = [];
    let wrapper: ReturnType<typeof mount>;
    wrapper = mount(NTree, {
      props: {
        items,
        expanded: [],
        selection: "multiple" as const,
        selected,
        "onUpdate:expanded": (value: TreeValue[]) =>
          wrapper.setProps({ expanded: value }),
        "onUpdate:selected": (value: TreeValue | TreeValue[] | undefined) => {
          selected = value;
          return wrapper.setProps({ selected: value });
        },
      },
    });
    const root = wrapper.get('[role="tree"]');
    expect(root.attributes("aria-multiselectable")).toBe("true");
    expect(wrapper.findAll('[role="treeitem"]')).toHaveLength(3);

    await wrapper.get(".n-tree-toggle").trigger("click");
    expect(wrapper.findAll('[role="treeitem"]')).toHaveLength(5);
    const source = wrapper.get('[data-value="src"]');
    expect(source.attributes("aria-expanded")).toBe("true");

    await wrapper.get('[data-value="components"]').trigger("click");
    await wrapper.get('[data-value="readme"]').trigger("click");
    expect(selected).toEqual(["components", "readme"]);
    expect(wrapper.findAll('[aria-selected="true"]')).toHaveLength(2);
    wrapper.unmount();
  });

  it("checks a whole branch and exposes an indeterminate parent", async () => {
    const wrapper = mount(NTree, {
      props: {
        items,
        expanded: ["src"],
        checkable: true,
        checked: ["components"],
        "onUpdate:checked": (value: TreeValue[]) =>
          wrapper.setProps({ checked: value }),
      },
    });
    const source = wrapper.get('[data-value="src"]');
    expect(source.attributes("aria-checked")).toBe("mixed");

    await wrapper.get('[data-value="src"] > .n-tree-checkbox').setValue(true);
    expect(wrapper.props("checked")).toEqual([
      "components",
      "src",
      "pages",
      "index",
    ]);
    expect(source.attributes("aria-checked")).toBe("true");
    wrapper.unmount();
  });

  it("filters descendants while retaining matching ancestors", async () => {
    const wrapper = mount(NTree, {
      props: { items, searchable: true, search: "" },
    });
    await wrapper.get('input[type="search"]').setValue("index");
    expect(wrapper.findAll('[role="treeitem"]')).toHaveLength(3);
    expect(wrapper.get('[data-value="src"]').attributes("aria-expanded")).toBe(
      "true",
    );
    expect(wrapper.text()).toContain("index.vue");

    await wrapper.get('input[type="search"]').setValue("missing");
    expect(wrapper.find('[role="tree"]').exists()).toBe(false);
    expect(wrapper.get('[role="status"]').text()).toBe("No items found");
    wrapper.unmount();
  });

  it("supports arrow navigation and selection from the keyboard", async () => {
    let selected: TreeValue | TreeValue[] | undefined;
    let wrapper: ReturnType<typeof mount>;
    wrapper = mount(NTree, {
      props: {
        items,
        expanded: ["src"],
        "onUpdate:selected": (value: TreeValue | TreeValue[] | undefined) => {
          selected = value;
          return wrapper.setProps({ selected: value });
        },
      },
      attachTo: document.body,
    });
    const rows = wrapper.findAll('[role="treeitem"]');
    (rows[0]!.element as HTMLElement).focus();
    await rows[0]!.trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows[1]!.element);
    await rows[1]!.trigger("keydown", { key: "Enter" });
    expect(selected).toBe("components");

    await rows[1]!.trigger("keydown", { key: "ArrowLeft" });
    expect(document.activeElement).toBe(rows[0]!.element);
    wrapper.unmount();
  });

  it("loads children once and reports failures", async () => {
    const loadChildren = vi.fn(async () => [
      { value: "remote", label: "Remote file" },
    ]);
    const lazy: TreeItem[] = [{ value: "remote-root", label: "Remote" }];
    const wrapper = mount(NTree, {
      props: {
        items: lazy,
        loadChildren,
        expanded: [],
        "onUpdate:expanded": (value: TreeValue[]) =>
          wrapper.setProps({ expanded: value }),
      },
    });

    await wrapper.get(".n-tree-toggle").trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("Remote file"));
    expect(loadChildren).toHaveBeenCalledOnce();
    await wrapper.get(".n-tree-toggle").trigger("click");
    await wrapper.get(".n-tree-toggle").trigger("click");
    expect(loadChildren).toHaveBeenCalledOnce();

    const error = new Error("offline");
    const failed = mount(NTree, {
      props: {
        items: lazy,
        loadChildren: vi.fn(async () => {
          throw error;
        }),
      },
    });
    await failed.get(".n-tree-toggle").trigger("click");
    await nextTick();
    expect(failed.emitted("load-error")?.[0]).toEqual([error, lazy[0]]);
    failed.unmount();
    wrapper.unmount();
  });

  it("checks lazily loaded descendants of a checked branch", async () => {
    const wrapper = mount(NTree, {
      props: {
        items: [{ value: "remote-root", label: "Remote" }],
        checked: ["remote-root"],
        loadChildren: async () => [
          { value: "remote-child", label: "Remote child" },
        ],
      },
    });
    await wrapper.get(".n-tree-toggle").trigger("click");
    await vi.waitFor(() =>
      expect(wrapper.emitted("update:checked")?.at(-1)?.[0]).toEqual([
        "remote-root",
        "remote-child",
      ]),
    );
    wrapper.unmount();
  });

  it("uses custom item and icon slots", () => {
    const wrapper = mount(NTree, {
      props: { items },
      slots: {
        icon: ({ item }: { item: TreeItem }) => h("span", `icon-${item.value}`),
        item: ({ item }: { item: TreeItem }) => h("strong", item.label),
      },
    });
    expect(wrapper.get(".n-tree-row strong").text()).toBe("src");
    expect(wrapper.get(".n-tree-row").text()).toContain("icon-src");
    wrapper.unmount();
  });

  it("shows an arrow only on nodes that can reveal children", async () => {
    const wrapper = mount(NTree, {
      props: {
        items: [
          { value: "empty", label: "Empty", children: [] },
          { value: "lazy", label: "Lazy" },
          {
            value: "full",
            label: "Full",
            children: [{ value: "a", label: "a" }],
          },
        ],
        loadChildren: async () => [],
      },
    });
    const arrow = (value: string) =>
      wrapper.find(`[data-value="${value}"] .n-tree-chevron`).exists();
    expect(arrow("empty")).toBe(false);
    expect(arrow("lazy")).toBe(true);
    expect(arrow("full")).toBe(true);

    await wrapper.get('[data-value="lazy"] .n-tree-toggle').trigger("click");
    await vi.waitFor(() => expect(arrow("lazy")).toBe(false));
    wrapper.unmount();
  });

  it("accepts drops on rows only when droppable", async () => {
    const wrapper = mount(NTree, { props: { items, droppable: true } });
    const row = wrapper.get('[data-value="src"]');
    await row.trigger("dragover");
    expect(row.attributes("data-drop")).toBeDefined();
    await row.trigger("drop");
    expect(row.attributes("data-drop")).toBeUndefined();
    expect(wrapper.emitted("drop")?.[0]?.[0]).toMatchObject({ value: "src" });

    await wrapper.setProps({ droppable: false });
    await wrapper.get('[data-value="readme"]').trigger("drop");
    expect(wrapper.emitted("drop")).toHaveLength(1);
    wrapper.unmount();
  });
});
