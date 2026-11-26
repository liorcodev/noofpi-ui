import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NKanban, type KanbanColumn } from "../src";

const board = (): KanbanColumn[] => [
  {
    id: "todo",
    title: "To do",
    limit: 2,
    items: [
      { id: 1, title: "Write docs" },
      { id: 2, title: "Fix login", badge: "bug", assignee: "Ada Lovelace" },
      { id: 3, title: "Plan release" },
    ],
  },
  { id: "doing", title: "Doing", items: [{ id: 4, title: "Review PR" }] },
  { id: "done", title: "Done", limit: 1, items: [{ id: 5, title: "Ship" }] },
];

type Wrapper = VueWrapper;

const mountBoard = (props: Record<string, unknown> = {}) => {
  const wrapper: Wrapper = mount(NKanban, {
    attachTo: document.body,
    props: {
      columns: board(),
      "onUpdate:columns": (columns: KanbanColumn[] | undefined) => {
        wrapper.setProps({ columns });
      },
      ...props,
    },
  });
  return wrapper;
};

const card = (wrapper: Wrapper, id: number) =>
  wrapper.get(`[data-item-id="${id}"]`);
const titles = (wrapper: Wrapper, column: number) =>
  wrapper
    .findAll(".n-kanban-column")
    [column]!.findAll(".n-kanban-card-title")
    .map((el) => el.text());

afterEach(() => {
  document.body.innerHTML = "";
});

describe("NKanban", () => {
  it("renders the columns with their counts and flags an exceeded limit", () => {
    const wrapper = mountBoard({ label: "Sprint" });
    expect(wrapper.attributes("aria-label")).toBe("Sprint");
    const columns = wrapper.findAll(".n-kanban-column");
    expect(columns.map((c) => c.find(".n-kanban-count").text())).toEqual([
      "3/2",
      "1",
      "1/1",
    ]);
    expect(columns[0]!.attributes("data-exceeded")).toBeDefined();
    expect(columns[2]!.attributes("data-exceeded")).toBeUndefined();
    expect(titles(wrapper, 0)).toEqual([
      "Write docs",
      "Fix login",
      "Plan release",
    ]);
    expect(wrapper.find(".n-kanban-card-meta").text()).toContain(
      "Ada Lovelace",
    );
  });

  it("shows the empty text and the slots", () => {
    const wrapper = mount(NKanban, {
      props: {
        columns: [{ id: "a", title: "Empty", items: [] }],
        addable: true,
      },
      slots: {
        empty: "<i>Nothing here</i>",
        "column-footer": "<span class='extra'>footer</span>",
      },
    });
    expect(wrapper.find(".n-kanban-empty i").text()).toBe("Nothing here");
    expect(wrapper.find(".extra").exists()).toBe(true);
  });

  it("emits `add` with the column from the built-in button", async () => {
    const wrapper = mountBoard({ addable: true });
    await wrapper.findAll(".n-kanban-footer button")[1]!.trigger("click");
    expect(wrapper.emitted("add")![0]![0]).toMatchObject({ id: "doing" });
  });

  it("moves a card with the keyboard, then announces and emits `move`", async () => {
    const wrapper = mountBoard();
    const first = card(wrapper, 1);
    (first.element as HTMLElement).focus();
    await first.trigger("keydown", { key: " " });
    expect(wrapper.get("[role=status]").text()).toContain(
      "Picked up Write docs",
    );
    expect(first.attributes("data-lifted")).toBeDefined();

    await first.trigger("keydown", { key: "ArrowRight" });
    await first.trigger("keydown", { key: "ArrowDown" });
    expect(wrapper.get("[role=status]").text()).toBe("Doing, position 2 of 2");
    expect(wrapper.findAll(".n-kanban-indicator")).toHaveLength(1);
    await first.trigger("keydown", { key: "Enter" });

    expect(wrapper.emitted("move")).toEqual([
      [
        {
          item: { id: 1, title: "Write docs" },
          from: { column: "todo", index: 0 },
          to: { column: "doing", index: 1 },
        },
      ],
    ]);
    expect(titles(wrapper, 0)).toEqual(["Fix login", "Plan release"]);
    expect(titles(wrapper, 1)).toEqual(["Review PR", "Write docs"]);
    expect(wrapper.get("[role=status]").text()).toContain("Dropped Write docs");
  });

  it("cancels a keyboard move with Escape and leaves the model alone", async () => {
    const wrapper = mountBoard();
    const first = card(wrapper, 1);
    await first.trigger("keydown", { key: "Enter" });
    await first.trigger("keydown", { key: "ArrowRight" });
    await first.trigger("keydown", { key: "Escape" });
    expect(wrapper.emitted("move")).toBeUndefined();
    expect(wrapper.emitted("update:columns")).toBeUndefined();
    expect(first.attributes("data-lifted")).toBeUndefined();
    expect(wrapper.get("[role=status]").text()).toContain("Move cancelled");
  });

  it("walks between cards and columns with the arrow keys when nothing is lifted", async () => {
    const wrapper = mountBoard();
    await card(wrapper, 1).trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(card(wrapper, 2).element);
    await card(wrapper, 2).trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(card(wrapper, 4).element);
    expect(card(wrapper, 1).attributes("tabindex")).toBe("-1");
    expect(card(wrapper, 4).attributes("tabindex")).toBe("0");
  });

  it("skips a full column with `enforceLimit` and keeps the card in place", async () => {
    const wrapper = mountBoard({ enforceLimit: true });
    const ship = card(wrapper, 4);
    await ship.trigger("keydown", { key: "Enter" });
    await ship.trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.get("[role=status]").text()).toBe("Done is full");
    await ship.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("move")).toBeUndefined();
  });

  it("reorders inside a column, and drops where it started without a `move`", async () => {
    const wrapper = mountBoard();
    const first = card(wrapper, 1);
    await first.trigger("keydown", { key: " " });
    await first.trigger("keydown", { key: "End" });
    await first.trigger("keydown", { key: " " });
    expect(titles(wrapper, 0)).toEqual([
      "Fix login",
      "Plan release",
      "Write docs",
    ]);
    expect(wrapper.emitted("move")![0]![0]).toMatchObject({
      from: { column: "todo", index: 0 },
      to: { column: "todo", index: 2 },
    });

    const again = card(wrapper, 2);
    await again.trigger("keydown", { key: " " });
    await again.trigger("keydown", { key: " " });
    expect(wrapper.emitted("move")).toHaveLength(1);
  });

  it("does not lift cards on a disabled board, a locked column or a disabled card", async () => {
    const disabled = mountBoard({ disabled: true });
    await card(disabled, 1).trigger("keydown", { key: "Enter" });
    expect(card(disabled, 1).attributes("data-lifted")).toBeUndefined();

    const columns = board();
    columns[0]!.items[1]!.disabled = true;
    columns[1]!.disabled = true;
    const wrapper = mountBoard({ columns });
    await card(wrapper, 2).trigger("keydown", { key: "Enter" });
    await card(wrapper, 4).trigger("keydown", { key: "Enter" });
    expect(wrapper.findAll("[data-lifted]")).toHaveLength(0);

    await card(wrapper, 1).trigger("keydown", { key: "Enter" });
    await card(wrapper, 1).trigger("keydown", { key: "ArrowRight" });
    await card(wrapper, 1).trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("move")![0]![0]).toMatchObject({
      to: { column: "done", index: 0 },
    });
  });

  it("works with a plain v-model", async () => {
    const wrapper: Wrapper = mount(NKanban, {
      attachTo: document.body,
      props: {
        modelValue: board(),
        "onUpdate:modelValue": (value: KanbanColumn[] | undefined) => {
          wrapper.setProps({ modelValue: value });
        },
      },
    });
    const first = card(wrapper, 1);
    await first.trigger("keydown", { key: "Enter" });
    await first.trigger("keydown", { key: "ArrowRight" });
    await first.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
    expect(wrapper.findAll(".n-kanban-column")[1]!.text()).toContain(
      "Write docs",
    );
  });

  describe("pointer", () => {
    const rects = {
      spy: undefined as ReturnType<typeof vi.spyOn> | undefined,
    };

    beforeEach(() => {
      rects.spy = vi
        .spyOn(HTMLElement.prototype, "getBoundingClientRect")
        .mockImplementation(function (this: HTMLElement) {
          const box = (
            left: number,
            top: number,
            width: number,
            height: number,
          ) =>
            ({
              left,
              top,
              width,
              height,
              right: left + width,
              bottom: top + height,
            }) as DOMRect;
          if (this.classList.contains("n-kanban-column")) {
            const index = [...this.parentElement!.children].indexOf(this);
            return box(index * 200, 0, 180, 400);
          }
          if (this.dataset.itemId) {
            const column = this.closest(".n-kanban-column")!;
            const index = [...this.parentElement!.children]
              .filter((el) => (el as HTMLElement).dataset.itemId)
              .indexOf(this);
            const x = column.getBoundingClientRect().left;
            return box(x, 40 + index * 60, 180, 50);
          }
          return box(0, 0, 600, 400);
        });
    });

    afterEach(() => rects.spy?.mockRestore());

    const fire = (type: string, x: number, y: number, el: EventTarget) => {
      const Ctor = window.PointerEvent ?? window.MouseEvent;
      el.dispatchEvent(
        new Ctor(type, {
          bubbles: true,
          clientX: x,
          clientY: y,
          button: 0,
          isPrimary: true,
        }),
      );
    };

    it("drags a card into another column at the pointer position", async () => {
      const wrapper = mountBoard();
      const first = card(wrapper, 1).element;
      fire("pointerdown", 20, 60, first);
      fire("pointermove", 22, 61, window);
      expect(wrapper.find(".n-kanban-ghost").exists()).toBe(false);

      fire("pointermove", 230, 60, window);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".n-kanban-ghost").exists()).toBe(true);
      expect(first.hasAttribute("data-dragging")).toBe(true);
      expect(
        wrapper.findAll(".n-kanban-column")[1]!.attributes("data-over"),
      ).toBeDefined();

      fire("pointermove", 230, 120, window);
      fire("pointerup", 230, 120, window);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".n-kanban-ghost").exists()).toBe(false);
      expect(wrapper.emitted("move")![0]![0]).toMatchObject({
        from: { column: "todo", index: 0 },
        to: { column: "doing", index: 1 },
      });
      expect(titles(wrapper, 1)).toEqual(["Review PR", "Write docs"]);
    });

    it("refuses a drop into a full column with `enforceLimit`, and cancels outside the board", async () => {
      const wrapper = mountBoard({ enforceLimit: true });
      const first = card(wrapper, 1).element;
      fire("pointerdown", 20, 60, first);
      fire("pointermove", 430, 60, window);
      await wrapper.vm.$nextTick();
      expect(
        wrapper.findAll(".n-kanban-column")[2]!.attributes("data-refused"),
      ).toBeDefined();
      fire("pointerup", 430, 60, window);

      fire("pointerdown", 20, 60, first);
      fire("pointermove", 230, 60, window);
      fire("pointermove", 230, 900, window);
      fire("pointerup", 230, 900, window);
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted("move")).toBeUndefined();
      expect(titles(wrapper, 0)).toHaveLength(3);
    });

    it("leaves presses on buttons inside a card to the button", async () => {
      const wrapper = mount(NKanban, {
        attachTo: document.body,
        props: { columns: board() },
        slots: { card: "<button class='inner'>Open</button>" },
      });
      fire("pointerdown", 20, 60, wrapper.get(".inner").element);
      fire("pointermove", 230, 60, window);
      expect(wrapper.find(".n-kanban-ghost").exists()).toBe(false);
    });
  });
});
