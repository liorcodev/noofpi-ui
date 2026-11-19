import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";
import { NFileExplorer } from "../src";
import type { FileItem, TreeValue } from "../src";

const MOVE = "application/x-noofpi-files";

const items: FileItem[] = [
  {
    value: "src",
    label: "src",
    type: "folder",
    children: [
      { value: "app", label: "App.vue", size: 2048 },
      { value: "assets", label: "assets", type: "folder", children: [] },
    ],
  },
  { value: "docs", label: "docs", type: "folder", children: [] },
  {
    value: "readme",
    label: "README.md",
    size: 1024,
    modified: "2026-01-02",
    url: "data:text/plain,readme",
  },
  { value: "notes", label: "notes.txt", size: 10, modified: "2026-03-04" },
];

// The wrapper is untyped on purpose: the props and events are checked by the component, not by the tests
type Wrapper = VueWrapper<any>;

// Keeps the three `v-model`s in step, like a parent would
function mountExplorer(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = {},
) {
  const wrapper: Wrapper = mount(NFileExplorer, {
    slots: slots as never,
    props: {
      items,
      current: undefined,
      selected: [],
      selecting: true,
      "onUpdate:current": (current: TreeValue | undefined) =>
        wrapper.setProps({ current }),
      "onUpdate:selected": (selected: TreeValue[]) =>
        wrapper.setProps({ selected }),
      "onUpdate:selecting": (selecting: boolean) =>
        wrapper.setProps({ selecting }),
      ...props,
    },
    attachTo: document.body,
  });
  return wrapper;
}

const row = (wrapper: Wrapper, value: string) =>
  wrapper.get(`.n-file-explorer-item[data-value="${value}"]`);
const names = (wrapper: Wrapper) =>
  wrapper.findAll(".n-file-explorer-label").map((label) => label.text());
// A button of the selection bar, by its label
const bar = (wrapper: Wrapper, label: string) =>
  wrapper
    .findAll(".n-file-explorer-selection button")
    .find((button) => button.text() === label)!;
// A button of the toolbar, by its label
const tool = (wrapper: Wrapper, label: string) =>
  wrapper
    .findAll(".n-file-explorer-tools button")
    .find((button) => button.text() === label)!;
const selectedValues = (wrapper: Wrapper) =>
  wrapper
    .findAll(".n-file-explorer-item[data-selected]")
    .map((entry) => entry.attributes("data-value"));
const drag = (types: string[], extra: Record<string, unknown> = {}) => ({
  dataTransfer: { types, files: [], getData: () => "", ...extra },
});
const payload = (...values: string[]) =>
  drag([MOVE], { getData: () => JSON.stringify(values) });

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("NFileExplorer navigation", () => {
  it("lists folders before files and switches between list and grid", async () => {
    const wrapper = mountExplorer();
    expect(names(wrapper)).toEqual(["docs", "src", "notes.txt", "README.md"]);
    expect(wrapper.attributes("data-view")).toBe("list");

    const grid = wrapper.get('[aria-label="Grid view"]');
    await grid.trigger("click");
    expect(wrapper.attributes("data-view")).toBe("grid");
    expect(grid.attributes("aria-pressed")).toBe("true");
    wrapper.unmount();
  });

  it("opens a folder, and gets back to the top level in every way", async () => {
    const wrapper = mountExplorer();
    const reset = async () => {
      await wrapper.setProps({ current: "src" });
      expect(names(wrapper)).toEqual(["assets", "App.vue"]);
    };

    await row(wrapper, "src").trigger("dblclick");
    expect(wrapper.props("current")).toBe("src");
    expect(names(wrapper)).toEqual(["assets", "App.vue"]);
    const crumbs = () =>
      wrapper.findAll(".n-file-explorer-crumb").map((crumb) => crumb.text());
    expect(crumbs()).toEqual(["All files", "src"]);

    await wrapper.findAll(".n-file-explorer-crumb")[0]!.trigger("click");
    expect(wrapper.props("current")).toBeUndefined();

    await reset();
    await wrapper.get('[aria-label="Up one level"]').trigger("click");
    expect(wrapper.props("current")).toBeUndefined();

    await reset();
    await wrapper.get(".n-file-explorer-root").trigger("click");
    expect(wrapper.props("current")).toBeUndefined();

    await reset();
    await row(wrapper, "assets").trigger("keydown", {
      key: "ArrowUp",
      altKey: true,
    });
    expect(wrapper.props("current")).toBeUndefined();
    wrapper.unmount();
  });

  it("goes back to the top level when the open folder disappears", async () => {
    const wrapper = mountExplorer({ current: "src" });
    await wrapper.setProps({ items: items.slice(1) });
    expect(wrapper.emitted("update:current")?.at(-1)).toEqual([undefined]);
    wrapper.unmount();
  });

  it("lists only folders in the side tree, with an arrow only where there is more to open", () => {
    const wrapper = mountExplorer({
      items: [
        ...items,
        { value: "note", label: "note.md" },
        { value: "typed", label: "typed.md", type: "file", children: [] },
      ],
    });
    const tree = wrapper.get(".n-file-explorer-nav");
    expect(
      tree
        .findAll("[role='treeitem']")
        .map((node) => node.attributes("data-value")),
    ).toEqual(["src", "docs"]);
    expect(tree.find('[data-value="src"] .n-tree-chevron').exists()).toBe(true);
    expect(tree.find('[data-value="docs"] .n-tree-chevron').exists()).toBe(
      false,
    );
    expect(
      wrapper.get(".n-file-explorer-root").attributes("aria-current"),
    ).toBe("page");
    wrapper.unmount();
  });
});

describe("NFileExplorer selection", () => {
  it("selects one item, adds with Ctrl and selects a range with Shift", async () => {
    const wrapper = mountExplorer({ multiple: true });
    await row(wrapper, "docs").trigger("click");
    expect(selectedValues(wrapper)).toEqual(["docs"]);

    await row(wrapper, "notes").trigger("click", { ctrlKey: true });
    expect(selectedValues(wrapper)).toEqual(["docs", "notes"]);

    await row(wrapper, "src").trigger("click");
    await row(wrapper, "readme").trigger("click", { shiftKey: true });
    expect(selectedValues(wrapper)).toEqual(["src", "notes", "readme"]);
    wrapper.unmount();
  });

  it("selects nothing on a plain click until selection mode is on", async () => {
    const wrapper = mountExplorer({ selecting: false });
    await row(wrapper, "docs").trigger("click");
    await row(wrapper, "notes").trigger("click");
    expect(selectedValues(wrapper)).toEqual([]);
    expect(wrapper.props("current")).toBeUndefined();

    await tool(wrapper, "Select").trigger("click");
    expect(wrapper.attributes("data-selecting")).toBeDefined();
    expect(tool(wrapper, "Done").attributes("aria-pressed")).toBe("true");
    await row(wrapper, "notes").trigger("click");
    expect(selectedValues(wrapper)).toEqual(["notes"]);
    await row(wrapper, "notes").trigger("click");
    expect(selectedValues(wrapper)).toEqual([]);

    await row(wrapper, "docs").trigger("click");
    await tool(wrapper, "Done").trigger("click");
    expect(selectedValues(wrapper)).toEqual([]);
    expect(wrapper.attributes("data-selecting")).toBeUndefined();
    wrapper.unmount();
  });

  it("ignores Ctrl and Shift unless multiple", async () => {
    const wrapper = mountExplorer();
    await row(wrapper, "docs").trigger("click");
    await row(wrapper, "notes").trigger("click", { ctrlKey: true });
    expect(selectedValues(wrapper)).toEqual(["notes"]);
    wrapper.unmount();
  });

  it("clears the selection with the button, Escape and a click on the empty space", async () => {
    const wrapper = mountExplorer({ multiple: true });
    const select = async () => {
      await row(wrapper, "docs").trigger("click");
      await row(wrapper, "notes").trigger("click", { ctrlKey: true });
      expect(wrapper.get(".n-file-explorer-selection-count").text()).toBe(
        "2 selected",
      );
    };
    const cleared = () =>
      expect(wrapper.find(".n-file-explorer-selection").exists()).toBe(false);

    await select();
    await wrapper.get('[aria-label="Clear selection"]').trigger("click");
    cleared();

    await select();
    await row(wrapper, "notes").trigger("keydown", { key: "Escape" });
    cleared();

    await select();
    await wrapper.get(".n-file-explorer-items").trigger("click");
    cleared();
    wrapper.unmount();
  });

  it("selects everything with Ctrl+A when multiple", async () => {
    const wrapper = mountExplorer({ multiple: true });
    await row(wrapper, "docs").trigger("keydown", { key: "a", ctrlKey: true });
    expect(selectedValues(wrapper)).toHaveLength(4);
    wrapper.unmount();
  });

  it("drops the selection of items that went away", async () => {
    const wrapper = mountExplorer({ selected: ["readme", "notes"] });
    await wrapper.setProps({ items: items.filter((i) => i.value !== "notes") });
    expect(wrapper.emitted("update:selected")?.at(-1)).toEqual([["readme"]]);
    wrapper.unmount();
  });
});

describe("NFileExplorer rename and delete", () => {
  it("renames the single selected item, and not several", async () => {
    const wrapper = mountExplorer({ multiple: true });
    await row(wrapper, "readme").trigger("click");
    await row(wrapper, "notes").trigger("click");
    const rename = bar(wrapper, "Rename");
    expect(rename.attributes("disabled")).toBeDefined();

    await row(wrapper, "notes").trigger("click");
    await bar(wrapper, "Rename").trigger("click");
    const input = wrapper.get(".n-file-explorer-rename");
    await input.setValue("GUIDE.md");
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("rename")?.[0]).toEqual([items[2], "GUIDE.md"]);
    expect(wrapper.find(".n-file-explorer-rename").exists()).toBe(false);
    wrapper.unmount();
  });

  it("cancels a rename with Escape and ignores an unchanged name", async () => {
    const wrapper = mountExplorer();
    await row(wrapper, "readme").trigger("click");
    await row(wrapper, "readme").trigger("keydown", { key: "F2" });
    await wrapper.get(".n-file-explorer-rename").setValue("other");
    await wrapper
      .get(".n-file-explorer-rename")
      .trigger("keydown", { key: "Escape" });
    expect(wrapper.find(".n-file-explorer-rename").exists()).toBe(false);

    await row(wrapper, "readme").trigger("keydown", { key: "F2" });
    await wrapper
      .get(".n-file-explorer-rename")
      .trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("rename")).toBeUndefined();
    wrapper.unmount();
  });

  it("deletes the selection from the bar and with the Delete key", async () => {
    const wrapper = mountExplorer({ multiple: true });
    await row(wrapper, "readme").trigger("click");
    await row(wrapper, "notes").trigger("click", { ctrlKey: true });
    await bar(wrapper, "Delete").trigger("click");
    expect(wrapper.emitted("delete")?.[0]).toEqual([[items[2], items[3]]]);

    await row(wrapper, "notes").trigger("keydown", { key: "Delete" });
    expect(wrapper.emitted("delete")).toHaveLength(2);
    wrapper.unmount();
  });

  it("does nothing when disabled", async () => {
    const wrapper = mountExplorer({ disabled: true, selected: ["readme"] });
    await row(wrapper, "readme").trigger("keydown", { key: "Delete" });
    expect(wrapper.emitted("delete")).toBeUndefined();
    await row(wrapper, "docs").trigger("drop", payload("readme"));
    expect(wrapper.emitted("move")).toBeUndefined();
    wrapper.unmount();
  });
});

describe("NFileExplorer lazy folders", () => {
  const lazy: FileItem[] = [{ value: "cloud", label: "Cloud", type: "folder" }];

  it("shows that it is loading, then the folder, and reports it once", async () => {
    let finish!: (children: FileItem[]) => void;
    const loadChildren = vi.fn(
      () => new Promise<FileItem[]>((resolve) => (finish = resolve)),
    );
    const wrapper = mountExplorer({ items: lazy, loadChildren });
    expect(row(wrapper, "cloud").get(".n-file-explorer-size").text()).toBe("—");

    await row(wrapper, "cloud").trigger("dblclick");
    expect(wrapper.get('[role="status"]').text()).toBe("Loading…");

    const children = [{ value: "remote", label: "remote.txt", size: 12 }];
    finish(children);
    await vi.waitFor(() => expect(names(wrapper)).toEqual(["remote.txt"]));
    expect(loadChildren).toHaveBeenCalledOnce();
    expect(wrapper.emitted("load")?.[0]).toEqual([lazy[0], children]);
    wrapper.unmount();
  });

  it("offers a retry when loading fails", async () => {
    const error = new Error("offline");
    const loadChildren = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce([{ value: "remote", label: "remote.txt" }]);
    const wrapper = mountExplorer({ items: lazy, loadChildren });

    await row(wrapper, "cloud").trigger("dblclick");
    await vi.waitFor(() =>
      expect(wrapper.find('[role="alert"]').exists()).toBe(true),
    );
    expect(wrapper.emitted("load-error")?.[0]).toEqual([error, lazy[0]]);

    await wrapper.get('[role="alert"] button').trigger("click");
    await vi.waitFor(() => expect(names(wrapper)).toEqual(["remote.txt"]));
    expect(loadChildren).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
});

describe("NFileExplorer dragging", () => {
  it("says where files from the computer would be uploaded", async () => {
    const wrapper = mountExplorer({ showUpload: true });
    await wrapper.trigger("dragover", drag(["Files"]));
    expect(wrapper.get(".n-file-explorer-hint").text()).toBe(
      "Upload to All files",
    );

    await row(wrapper, "src").trigger("dragover", drag(["Files"]));
    expect(wrapper.get(".n-file-explorer-hint").text()).toBe("Upload to src");
    expect(row(wrapper, "src").attributes("data-drop")).toBeDefined();

    await row(wrapper, "readme").trigger("dragover", drag(["Files"]));
    expect(wrapper.get(".n-file-explorer-hint").text()).toBe(
      "Upload to All files",
    );
    expect(row(wrapper, "src").attributes("data-drop")).toBeUndefined();
    wrapper.unmount();
  });

  it("shows no upload hint for moved items, or without upload", async () => {
    const wrapper = mountExplorer({ showUpload: true });
    await wrapper.trigger("dragover", drag([MOVE]));
    expect(wrapper.find(".n-file-explorer-hint").exists()).toBe(false);
    await wrapper.setProps({ showUpload: false });
    await wrapper.trigger("dragover", drag(["Files"]));
    expect(wrapper.find(".n-file-explorer-hint").exists()).toBe(false);
    wrapper.unmount();
  });

  it("uploads dropped files to the folder they land on, or to the open folder", async () => {
    const file = new File(["hi"], "hi.txt");
    const wrapper = mountExplorer({ showUpload: true });
    await row(wrapper, "docs").trigger(
      "drop",
      drag(["Files"], { files: [file] }),
    );
    expect(wrapper.emitted("upload")?.[0]).toEqual([[file], items[1]]);

    await wrapper.trigger("drop", drag(["Files"], { files: [file] }));
    expect(wrapper.emitted("upload")?.[1]).toEqual([[file], undefined]);

    await wrapper.setProps({ current: "src" });
    await wrapper.trigger("drop", drag(["Files"], { files: [file] }));
    expect(wrapper.emitted("upload")?.[2]).toEqual([[file], items[0]]);
    wrapper.unmount();
  });

  it("starts a drag with the selection, or with the item if it isn't selected", async () => {
    const setData = vi.fn();
    const setDragImage = vi.fn();
    const wrapper = mountExplorer({ multiple: true });
    await row(wrapper, "readme").trigger("click");
    await row(wrapper, "notes").trigger("click", { ctrlKey: true });
    await row(wrapper, "notes").trigger(
      "dragstart",
      drag([], { setData, setDragImage }),
    );
    expect(setData).toHaveBeenLastCalledWith(MOVE, '["readme","notes"]');
    expect(setDragImage).toHaveBeenCalledOnce();
    expect(setDragImage.mock.calls[0]![0].textContent).toBe("2 items");

    await row(wrapper, "docs").trigger(
      "dragstart",
      drag([], { setData, setDragImage }),
    );
    expect(setData).toHaveBeenLastCalledWith(MOVE, '["docs"]');
    expect(setDragImage).toHaveBeenCalledOnce();
    expect(selectedValues(wrapper)).toEqual(["notes", "readme"]);
    wrapper.unmount();
  });

  it("clears the selection when a tool is used", async () => {
    const wrapper = mountExplorer({ multiple: true });
    await row(wrapper, "readme").trigger("click");
    expect(selectedValues(wrapper)).toEqual(["readme"]);
    await tool(wrapper, "New folder").trigger("click");
    expect(selectedValues(wrapper)).toEqual([]);

    await row(wrapper, "readme").trigger("click");
    await wrapper.get('[aria-label="Grid view"]').trigger("click");
    expect(selectedValues(wrapper)).toEqual([]);
    wrapper.unmount();
  });

  it("says what a move would do while hovering a folder", async () => {
    const wrapper = mountExplorer();
    await row(wrapper, "readme").trigger(
      "dragstart",
      drag([], { setData: vi.fn() }),
    );
    await row(wrapper, "docs").trigger("dragover", drag([MOVE]));
    expect(wrapper.get(".n-file-explorer-hint").text()).toBe(
      "Move 1 item to docs",
    );

    await row(wrapper, "readme").trigger("dragend");
    expect(wrapper.find(".n-file-explorer-hint").exists()).toBe(false);
    wrapper.unmount();
  });

  it("moves items dropped on a folder, the top level, a breadcrumb or the side tree", async () => {
    const wrapper = mountExplorer();
    await row(wrapper, "docs").trigger("drop", payload("readme"));
    expect(wrapper.emitted("move")?.[0]).toEqual([[items[2]], items[1]]);

    await wrapper
      .get('.n-file-explorer-nav [data-value="src"]')
      .trigger("drop", payload("notes"));
    expect(wrapper.emitted("move")?.[1]).toEqual([[items[3]], items[0]]);

    await wrapper.setProps({ current: "src" });
    await wrapper.get(".n-file-explorer-root").trigger("drop", payload("app"));
    const app = (items[0]!.children as FileItem[])[0];
    expect(wrapper.emitted("move")?.[2]).toEqual([[app], undefined]);

    // From the folder "assets" (inside "src"): the first breadcrumb is the top level, the second is "src"
    await wrapper.setProps({ current: "assets" });
    const crumbs = wrapper.findAll(".n-file-explorer-crumb");
    expect(crumbs.map((crumb) => crumb.text())).toEqual([
      "All files",
      "src",
      "assets",
    ]);
    await crumbs[0]!.trigger("drop", payload("app"));
    expect(wrapper.emitted("move")?.[3]).toEqual([[app], undefined]);
    await crumbs[1]!.trigger("drop", payload("readme"));
    expect(wrapper.emitted("move")?.[4]).toEqual([[items[2]], items[0]]);
    wrapper.unmount();
  });

  it("refuses moves that make no sense", async () => {
    const wrapper = mountExplorer();
    // Into itself, and to where it already is
    await row(wrapper, "src").trigger("drop", payload("src"));
    await wrapper
      .get(".n-file-explorer-root")
      .trigger("drop", payload("readme"));
    expect(wrapper.emitted("move")).toBeUndefined();

    // A folder into one of its own folders
    await wrapper
      .get('.n-file-explorer-nav [data-value="src"]')
      .trigger("drop", payload("src"));
    await wrapper.setProps({ current: "src" });
    await row(wrapper, "assets").trigger("drop", payload("assets"));
    expect(wrapper.emitted("move")).toBeUndefined();
    wrapper.unmount();
  });
});

describe("NFileExplorer keyboard", () => {
  it("moves between items with the arrows and keeps a single tab stop", async () => {
    const wrapper = mountExplorer();
    const tabs = () =>
      wrapper
        .findAll(".n-file-explorer-item")
        .filter((entry) => entry.attributes("tabindex") === "0");
    expect(tabs()).toHaveLength(1);
    expect(tabs()[0]!.attributes("data-value")).toBe("docs");

    (row(wrapper, "docs").element as HTMLElement).focus();
    await row(wrapper, "docs").trigger("keydown", { key: "ArrowDown" });
    await nextTick();
    expect(document.activeElement).toBe(row(wrapper, "src").element);
    expect(tabs()[0]!.attributes("data-value")).toBe("src");

    await row(wrapper, "src").trigger("keydown", { key: "End" });
    await nextTick();
    expect(document.activeElement).toBe(row(wrapper, "readme").element);
    wrapper.unmount();
  });

  it("opens a folder with Enter and reports a file", async () => {
    const wrapper = mountExplorer();
    await row(wrapper, "src").trigger("keydown", { key: "Enter" });
    expect(wrapper.props("current")).toBe("src");
    await wrapper.setProps({ current: undefined });
    await row(wrapper, "readme").trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("open")?.[0]).toEqual([items[2]]);
    wrapper.unmount();
  });
});

describe("NFileExplorer sorting", () => {
  const sortIs = (wrapper: Wrapper, key: string, direction: string) =>
    expect(wrapper.emitted("update:sort")?.at(-1)).toEqual([
      { key, direction },
    ]);

  it("sorts by name, ascending, with folders first", () => {
    const wrapper = mountExplorer();
    expect(names(wrapper)).toEqual(["docs", "src", "notes.txt", "README.md"]);
    expect(
      wrapper.get('[role="columnheader"][aria-sort="ascending"]').text(),
    ).toBe("Name");
    wrapper.unmount();
  });

  it("counts the numbers in names as numbers", () => {
    const wrapper = mountExplorer({
      items: ["file10", "file2", "file1"].map((label) => ({
        value: label,
        label,
      })),
    });
    expect(names(wrapper)).toEqual(["file1", "file2", "file10"]);
    wrapper.unmount();
  });

  it("sorts by a column from its header, and reverses on the second click", async () => {
    const wrapper = mountExplorer();
    const header = (label: string) =>
      wrapper
        .findAll(".n-file-explorer-sort-button")
        .find((button) => button.text() === label)!;

    await header("Name").trigger("click");
    sortIs(wrapper, "name", "desc");
    expect(names(wrapper)).toEqual(["src", "docs", "README.md", "notes.txt"]);

    await header("Size").trigger("click");
    sortIs(wrapper, "size", "asc");
    expect(names(wrapper)).toEqual(["docs", "src", "notes.txt", "README.md"]);
    await header("Size").trigger("click");
    sortIs(wrapper, "size", "desc");
    expect(names(wrapper)).toEqual(["docs", "src", "README.md", "notes.txt"]);

    await header("Modified").trigger("click");
    expect(names(wrapper).slice(2)).toEqual(["README.md", "notes.txt"]);
    await header("Modified").trigger("click");
    expect(names(wrapper).slice(2)).toEqual(["notes.txt", "README.md"]);
    expect(
      wrapper.get('[role="columnheader"][aria-sort="descending"]').text(),
    ).toBe("Modified");
    wrapper.unmount();
  });

  it("follows the `sort` it is given", () => {
    const wrapper = mountExplorer({
      sort: { key: "size", direction: "desc" },
    });
    expect(names(wrapper).slice(2)).toEqual(["README.md", "notes.txt"]);
    wrapper.unmount();
  });

  it("sorts the grid from the toolbar menu", async () => {
    const wrapper = mountExplorer({ view: "grid" });
    await wrapper.get(".n-file-explorer-sort button").trigger("click");
    const choose = async (label: string) => {
      const entry = wrapper
        .findAll('[role="menuitem"]')
        .find((item) => item.text() === label)!;
      await entry.trigger("click");
    };
    await choose("Modified");
    sortIs(wrapper, "modified", "asc");

    await wrapper.get(".n-file-explorer-sort button").trigger("click");
    await choose("Descending");
    sortIs(wrapper, "modified", "desc");
    expect(names(wrapper).slice(2)).toEqual(["notes.txt", "README.md"]);
    wrapper.unmount();
  });
});

describe("NFileExplorer new folder", () => {
  const editor = (wrapper: Wrapper) =>
    wrapper.get('input[aria-label="New folder name"]');

  it("names a new folder in place and reports it", async () => {
    const wrapper = mountExplorer();
    await tool(wrapper, "New folder").trigger("click");
    expect((editor(wrapper).element as HTMLInputElement).value).toBe(
      "New folder",
    );

    await editor(wrapper).setValue("Photos");
    await editor(wrapper).trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("create-folder")?.[0]).toEqual([
      "Photos",
      undefined,
    ]);
    expect(wrapper.find(".n-file-explorer-rename").exists()).toBe(false);
    wrapper.unmount();
  });

  it("creates it inside the open folder", async () => {
    const wrapper = mountExplorer({ current: "src" });
    await tool(wrapper, "New folder").trigger("click");
    await editor(wrapper).trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("create-folder")?.[0]).toEqual([
      "New folder",
      items[0],
    ]);
    wrapper.unmount();
  });

  it("suggests a name that is free", async () => {
    const wrapper = mountExplorer({
      items: [
        { value: "a", label: "New folder", type: "folder", children: [] },
      ],
    });
    await tool(wrapper, "New folder").trigger("click");
    expect((editor(wrapper).element as HTMLInputElement).value).toBe(
      "New folder 2",
    );
    wrapper.unmount();
  });

  it("cancels with Escape, an empty name, or leaving with a name that is taken", async () => {
    const wrapper = mountExplorer();
    await tool(wrapper, "New folder").trigger("click");
    await editor(wrapper).trigger("keydown", { key: "Escape" });
    expect(wrapper.find(".n-file-explorer-rename").exists()).toBe(false);

    await tool(wrapper, "New folder").trigger("click");
    await editor(wrapper).setValue("   ");
    await editor(wrapper).trigger("keydown", { key: "Enter" });
    expect(wrapper.find(".n-file-explorer-rename").exists()).toBe(false);

    await tool(wrapper, "New folder").trigger("click");
    await editor(wrapper).setValue("docs");
    await editor(wrapper).trigger("blur");
    expect(wrapper.find(".n-file-explorer-rename").exists()).toBe(false);
    expect(wrapper.emitted("create-folder")).toBeUndefined();
    wrapper.unmount();
  });

  it("explains a taken name, whatever its case, and lets it be fixed", async () => {
    const wrapper = mountExplorer();
    await tool(wrapper, "New folder").trigger("click");
    await editor(wrapper).setValue("DOCS");
    await editor(wrapper).trigger("keydown", { key: "Enter" });
    expect(wrapper.get('[role="alert"]').text()).toContain("already exists");
    expect(editor(wrapper).attributes("aria-invalid")).toBe("true");
    expect(wrapper.emitted("create-folder")).toBeUndefined();

    await editor(wrapper).setValue("docs 2");
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    await editor(wrapper).trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("create-folder")?.[0]).toEqual([
      "docs 2",
      undefined,
    ]);
    wrapper.unmount();
  });

  it("holds a rename to the same rule", async () => {
    const wrapper = mountExplorer();
    await row(wrapper, "readme").trigger("keydown", { key: "F2" });
    // F2 needs a selection; a click gives it one
    await row(wrapper, "readme").trigger("click");
    await row(wrapper, "readme").trigger("keydown", { key: "F2" });
    const input = wrapper.get(".n-file-explorer-rename");
    await input.setValue("Notes.TXT");
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.get('[role="alert"]').text()).toContain("already exists");
    expect(wrapper.emitted("rename")).toBeUndefined();

    await input.setValue("GUIDE.md");
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("rename")?.[0]).toEqual([items[2], "GUIDE.md"]);
    wrapper.unmount();
  });
});

describe("NFileExplorer download", () => {
  const clicked: HTMLAnchorElement[] = [];
  const saved = () =>
    clicked.map((link) => [link.getAttribute("href"), link.download]);

  const spy = () => {
    clicked.length = 0;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this);
    });
  };

  it("saves the files that have a url, and reports every item", async () => {
    spy();
    const wrapper = mountExplorer({ multiple: true });
    await row(wrapper, "readme").trigger("click");
    await row(wrapper, "notes").trigger("click", { ctrlKey: true });
    await row(wrapper, "src").trigger("click", { ctrlKey: true });
    await bar(wrapper, "Download").trigger("click");

    // Only README.md has a url; a folder has to be handled by the app
    expect(saved()).toEqual([["data:text/plain,readme", "README.md"]]);
    expect(wrapper.emitted("download")?.[0]).toEqual([
      [items[2], items[3], items[0]],
    ]);
    wrapper.unmount();
  });

  it("downloads from the menu of an item", async () => {
    spy();
    const wrapper = mountExplorer();
    await row(wrapper, "readme")
      .get('[aria-label="Actions for README.md"]')
      .trigger("click");
    await wrapper
      .findAll('[role="menuitem"]')
      .find((item) => item.text() === "Download")!
      .trigger("click");
    expect(saved()).toHaveLength(1);
    expect(wrapper.emitted("download")?.[0]).toEqual([[items[2]]]);
    wrapper.unmount();
  });
});

describe("NFileExplorer copy, cut and paste", () => {
  const pasteButton = (wrapper: Wrapper) => tool(wrapper, "Paste");
  const canPaste = (wrapper: Wrapper) =>
    pasteButton(wrapper).attributes("disabled") === undefined;

  it("pastes a copy into another folder, and again", async () => {
    const wrapper = mountExplorer();
    expect(canPaste(wrapper)).toBe(false);

    await row(wrapper, "readme").trigger("click");
    await bar(wrapper, "Copy").trigger("click");
    await wrapper.setProps({ current: "docs" });
    expect(canPaste(wrapper)).toBe(true);

    await pasteButton(wrapper).trigger("click");
    await pasteButton(wrapper).trigger("click");
    expect(wrapper.emitted("copy")).toEqual([
      [[items[2]], items[1]],
      [[items[2]], items[1]],
    ]);
    wrapper.unmount();
  });

  it("lets a copy land in the folder it came from, but not a cut", async () => {
    const wrapper = mountExplorer();
    await row(wrapper, "notes").trigger("click");
    await bar(wrapper, "Copy").trigger("click");
    expect(canPaste(wrapper)).toBe(true);
    await pasteButton(wrapper).trigger("click");
    expect(wrapper.emitted("copy")?.[0]).toEqual([[items[3]], undefined]);

    await row(wrapper, "notes").trigger("click");
    await bar(wrapper, "Cut").trigger("click");
    expect(canPaste(wrapper)).toBe(false);
    wrapper.unmount();
  });

  it("moves what was cut, once, and shows it as waiting", async () => {
    const wrapper = mountExplorer();
    await row(wrapper, "notes").trigger("click");
    await bar(wrapper, "Cut").trigger("click");
    expect(row(wrapper, "notes").attributes("data-cut")).toBeDefined();

    await wrapper.setProps({ current: "docs" });
    await pasteButton(wrapper).trigger("click");
    expect(wrapper.emitted("move")?.[0]).toEqual([[items[3]], items[1]]);
    expect(canPaste(wrapper)).toBe(false);
    wrapper.unmount();
  });

  it("never pastes a folder into itself or one of its folders", async () => {
    const wrapper = mountExplorer();
    await row(wrapper, "src").trigger("click");
    await bar(wrapper, "Copy").trigger("click");
    await wrapper.setProps({ current: "src" });
    expect(canPaste(wrapper)).toBe(false);
    await wrapper.setProps({ current: "assets" });
    expect(canPaste(wrapper)).toBe(false);
    await wrapper.setProps({ current: "docs" });
    expect(canPaste(wrapper)).toBe(true);
    wrapper.unmount();
  });

  it("works from the keyboard, and Escape lets go of it in two steps", async () => {
    const wrapper = mountExplorer();
    await row(wrapper, "readme").trigger("click");
    await row(wrapper, "readme").trigger("keydown", {
      key: "c",
      ctrlKey: true,
    });
    await wrapper.setProps({ current: "docs" });
    await wrapper.trigger("keydown", { key: "v", ctrlKey: true });
    expect(wrapper.emitted("copy")).toHaveLength(1);

    await wrapper.setProps({ current: undefined });
    await row(wrapper, "readme").trigger("keydown", { key: "Escape" });
    expect(wrapper.find(".n-file-explorer-selection").exists()).toBe(false);
    expect(canPaste(wrapper)).toBe(true);
    await wrapper.trigger("keydown", { key: "Escape" });
    expect(canPaste(wrapper)).toBe(false);
    wrapper.unmount();
  });

  it("acts on the whole selection from a menu, and pastes into a folder from its menu", async () => {
    const wrapper = mountExplorer({ multiple: true });
    await row(wrapper, "readme").trigger("click");
    await row(wrapper, "notes").trigger("click", { ctrlKey: true });
    const menu = async (value: string, label: string) => {
      await row(wrapper, value).get(".n-menu-trigger button").trigger("click");
      await wrapper
        .findAll('[role="menuitem"]')
        .find((item) => item.text() === label)!
        .trigger("click");
    };

    await menu("readme", "Copy");
    await menu("src", "Paste into folder");
    expect(wrapper.emitted("copy")?.[0]).toEqual([
      [items[2], items[3]],
      items[0],
    ]);
    wrapper.unmount();
  });

  it("cuts and copies nothing while disabled", async () => {
    const wrapper = mountExplorer({ disabled: true, selected: ["readme"] });
    await row(wrapper, "readme").trigger("keydown", {
      key: "c",
      ctrlKey: true,
    });
    expect(canPaste(wrapper)).toBe(false);
    wrapper.unmount();
  });
});

describe("NFileExplorer actions and slots", () => {
  it("offers only the actions it is given", async () => {
    const wrapper = mountExplorer({ actions: ["rename"] });
    const labels = () =>
      wrapper
        .findAll(".n-file-explorer-tools button")
        .map((button) => button.text());
    expect(labels()).not.toContain("New folder");
    expect(labels()).not.toContain("Paste");

    await row(wrapper, "readme").trigger("click");
    expect(
      wrapper
        .findAll(".n-file-explorer-selection button")
        .map((button) => button.text())
        .filter(Boolean),
    ).toEqual(["Rename"]);

    await row(wrapper, "readme").get(".n-menu-trigger button").trigger("click");
    expect(
      wrapper.findAll('[role="menuitem"]').map((item) => item.text()),
    ).toEqual(["Open", "Rename"]);
    wrapper.unmount();
  });

  it("replaces the selection bar with the toolbar slot", async () => {
    const wrapper = mountExplorer(
      {},
      {
        toolbar: (slot: { selectedItems: FileItem[]; clear: () => void }) =>
          h(
            "button",
            { class: "mine", onClick: slot.clear },
            `${slot.selectedItems.length} picked`,
          ),
      },
    );
    await row(wrapper, "readme").trigger("click");
    expect(wrapper.find(".n-file-explorer-selection").exists()).toBe(false);
    expect(wrapper.get(".mine").text()).toBe("1 picked");

    await wrapper.get(".mine").trigger("click");
    expect(wrapper.find(".mine").exists()).toBe(false);
    wrapper.unmount();
  });

  it("replaces the empty text with the empty slot", () => {
    const plain = mountExplorer({ items: [] });
    expect(plain.get(".n-file-explorer-state").text()).toContain(
      "This folder is empty",
    );
    plain.unmount();

    const custom = mountExplorer(
      { items: [] },
      { empty: () => h("p", { class: "mine" }, "Nothing here yet") },
    );
    expect(custom.get(".mine").text()).toBe("Nothing here yet");
    expect(custom.text()).not.toContain("This folder is empty");
    custom.unmount();
  });
});
