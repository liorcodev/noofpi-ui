import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { NChat, type ChatMessage } from "../src";

const participants = {
  me: { name: "Me" },
  ada: { name: "Ada" },
  bob: { name: "Bob" },
};

const at = (daysAgo: number, hours: number, minutes = 0) =>
  new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate() - daysAgo,
    hours,
    minutes,
  );

const messages: ChatMessage[] = [
  { id: 1, sender: "ada", text: "Hi", time: at(1, 9, 0) },
  { id: 2, sender: "ada", text: "Are you there?", time: at(1, 9, 1) },
  { id: 3, sender: "me", text: "Yes!", time: at(0, 8, 0), status: "read" },
  { id: 4, sender: "ada", text: "Great", time: at(0, 8, 30) },
];

const mountChat = (props: Record<string, unknown> = {}) =>
  mount(NChat, { props: { messages, participants, self: "me", ...props } });

// jsdom doesn't lay out, so the thread's geometry is faked: every message is 100px tall
function mockScroll(wrapper: ReturnType<typeof mount>, top: number) {
  const el = wrapper.find<HTMLElement>(".n-chat-scroller").element;
  let scrollTop = top;
  Object.defineProperties(el, {
    scrollHeight: {
      configurable: true,
      get: () => el.querySelectorAll(".n-chat-message").length * 100,
    },
    clientHeight: { configurable: true, value: 300 },
    scrollTo: {
      configurable: true,
      value: ({ top }: { top: number }) => (scrollTop = top),
    },
    scrollTop: {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => (scrollTop = value),
    },
  });
  return el;
}

describe("NChat", () => {
  it("renders the thread as a log, others at the start and mine at the end", () => {
    const wrapper = mountChat({ title: "Support" });
    const log = wrapper.find("[role=log]");
    expect(log.attributes("aria-live")).toBe("polite");
    expect(wrapper.find(".n-chat-title").text()).toBe("Support");

    const items = wrapper.findAll(".n-chat-message");
    expect(items).toHaveLength(4);
    expect(items.map((i) => i.attributes("data-mine") !== undefined)).toEqual([
      false,
      false,
      true,
      false,
    ]);
  });

  it("groups consecutive messages: one name, joined corners, time under the group", () => {
    const wrapper = mountChat();
    const items = wrapper.findAll(".n-chat-message");
    expect(items.map((i) => i.attributes("data-position"))).toEqual([
      "first",
      "last",
      "single",
      "single",
    ]);
    expect(items[0]!.find(".n-chat-name").text()).toBe("Ada");
    expect(items[1]!.find(".n-chat-name").exists()).toBe(false);
    expect(items[0]!.find(".n-chat-meta").exists()).toBe(false);
    expect(items[1]!.find(".n-chat-meta time").exists()).toBe(true);
  });

  it("starts a new group when the gap exceeds `groupWindow`", () => {
    const spaced: ChatMessage[] = [
      { id: 1, sender: "ada", text: "a", time: at(0, 8, 0) },
      { id: 2, sender: "ada", text: "b", time: at(0, 8, 20) },
    ];
    const wrapper = mountChat({ messages: spaced });
    expect(wrapper.findAll(".n-chat-name")).toHaveLength(2);
    const wide = mountChat({ messages: spaced, groupWindow: 30 });
    expect(wide.findAll(".n-chat-name")).toHaveLength(1);
  });

  it("separates days with Today and Yesterday labels", () => {
    const wrapper = mountChat({ locale: "en" });
    expect(wrapper.findAll(".n-chat-date").map((d) => d.text())).toEqual([
      "Yesterday",
      "Today",
    ]);
    const older = mountChat({
      locale: "en",
      messages: [{ id: 1, sender: "ada", text: "x", time: at(40, 9) }],
      todayLabel: "Hoy",
    });
    expect(older.find(".n-chat-date").text()).not.toMatch(/today|hoy/i);
  });

  it("renders text as plain text and keeps line breaks", () => {
    const wrapper = mountChat({
      messages: [{ id: 1, sender: "ada", text: "<b>bold</b>\nsecond line" }],
    });
    expect(wrapper.find(".n-chat-text b").exists()).toBe(false);
    expect(wrapper.find(".n-chat-text").element.textContent).toBe(
      "<b>bold</b>\nsecond line",
    );
  });

  it("shows a caret while streaming and dots before the first token", () => {
    const wrapper = mountChat({
      messages: [{ id: 1, sender: "ada", text: "Hel", streaming: true }],
    });
    expect(wrapper.find(".n-chat-text").attributes("data-streaming")).toBe("");
    expect(wrapper.find("[role=log]").attributes("aria-busy")).toBe("true");

    const empty = mountChat({
      messages: [{ id: 1, sender: "ada", streaming: true }],
    });
    expect(empty.find(".n-chat-dots").exists()).toBe(true);
  });

  it("shows the typing indicator, ignoring yourself in a list of ids", () => {
    const wrapper = mountChat({ typing: ["ada"] });
    expect(wrapper.find(".n-chat-typing").text()).toContain("Ada");
    expect(wrapper.find(".n-chat-typing .n-avatar").exists()).toBe(true);
    expect(
      mountChat({ typing: ["me"] })
        .find(".n-chat-typing")
        .exists(),
    ).toBe(false);
    expect(mountChat({ typing: true }).find(".n-chat-typing").exists()).toBe(
      true,
    );
  });

  it("sends on Enter, clears the draft, and adds a line on Shift+Enter", async () => {
    const wrapper = mountChat({ modelValue: "Hello" });
    const textarea = wrapper.find("textarea");
    await textarea.trigger("keydown", { key: "Enter", shiftKey: true });
    expect(wrapper.emitted("send")).toBeUndefined();

    await textarea.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("send")).toEqual([["Hello", []]]);
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([""]);
  });

  it("ignores Enter while an IME is composing, and blank drafts", async () => {
    const wrapper = mountChat({ modelValue: "こん" });
    await wrapper
      .find("textarea")
      .trigger("keydown", { key: "Enter", isComposing: true });
    expect(wrapper.emitted("send")).toBeUndefined();

    const blank = mountChat({ modelValue: "   " });
    await blank.find("textarea").trigger("keydown", { key: "Enter" });
    expect(blank.emitted("send")).toBeUndefined();
    expect(
      blank.find("button[type=submit]").attributes("disabled"),
    ).toBeDefined();
  });

  it("needs Ctrl+Enter when `sendOnEnter` is off, and respects `sending`", async () => {
    const wrapper = mountChat({ modelValue: "Hi", sendOnEnter: false });
    const textarea = wrapper.find("textarea");
    await textarea.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("send")).toBeUndefined();
    await textarea.trigger("keydown", { key: "Enter", ctrlKey: true });
    expect(wrapper.emitted("send")).toHaveLength(1);

    const sending = mountChat({ modelValue: "Hi", sending: true });
    await sending.find("form").trigger("submit");
    expect(sending.emitted("send")).toBeUndefined();
  });

  it("stages picked files, emits `attach` and sends them with the text", async () => {
    const wrapper = mountChat({ attachable: true });
    const file = new File(["x"], "notes.txt", { type: "text/plain" });
    const input = wrapper.find<HTMLInputElement>("input[type=file]");
    Object.defineProperty(input.element, "files", { value: [file] });
    await input.trigger("change");
    expect(wrapper.emitted("attach")).toEqual([[[file]]]);
    expect(wrapper.find(".n-chat-staged").text()).toContain("notes.txt");

    // A file alone is enough to send
    await wrapper.find("form").trigger("submit");
    expect(wrapper.emitted("send")).toEqual([["", [file]]]);
    expect(wrapper.find(".n-chat-staged").exists()).toBe(false);
  });

  it("renders attachments, but not links that run script", () => {
    const wrapper = mountChat({
      messages: [
        {
          id: 1,
          sender: "ada",
          attachments: [
            { name: "a.pdf", url: "https://x.test/a.pdf", size: 2048 },
            { name: "evil", url: "javascript:alert(1)" },
          ],
        },
      ],
    });
    const items = wrapper.findAll(".n-chat-attachment");
    expect(items[0]!.element.tagName).toBe("A");
    expect(items[0]!.text()).toContain("2 KB");
    expect(items[1]!.element.tagName).toBe("SPAN");
  });

  it("shows status for your messages and emits `retry` for a failed one", async () => {
    const failed: ChatMessage = {
      id: 9,
      sender: "me",
      text: "oops",
      status: "error",
    };
    const wrapper = mountChat({ messages: [failed] });
    expect(wrapper.find(".n-chat-status").text()).toBe("Failed to send");
    await wrapper.find(".n-chat-retry").trigger("click");
    expect(wrapper.emitted("retry")).toEqual([[failed]]);
  });

  it("keeps the thread pinned only near the bottom, otherwise offers a jump button", async () => {
    const wrapper = mountChat({ hasMore: false });
    const el = mockScroll(wrapper, 0);
    await wrapper.find(".n-chat-scroller").trigger("scroll");
    expect(wrapper.find(".n-chat-jump").exists()).toBe(false);

    await wrapper.setProps({
      messages: [...messages, { id: 5, sender: "bob", text: "New" }],
    });
    await nextTick();
    expect(wrapper.find(".n-chat-jump").text()).toBe("New messages");
    expect(el.scrollTop).toBe(0);

    await wrapper.find(".n-chat-jump").trigger("click");
    expect(el.scrollTop).toBe(el.scrollHeight);
    await wrapper.find(".n-chat-scroller").trigger("scroll");
    expect(wrapper.find(".n-chat-jump").exists()).toBe(false);

    // Pinned: a new message scrolls along
    await wrapper.setProps({
      messages: [
        ...messages,
        { id: 5, sender: "bob" },
        { id: 6, sender: "bob" },
      ],
    });
    await nextTick();
    expect(el.scrollTop).toBe(el.scrollHeight);
  });

  it("emits `loadMore` once at the top and keeps the scroll position when older messages arrive", async () => {
    const wrapper = mountChat();
    const el = mockScroll(wrapper, 0);
    await wrapper.find(".n-chat-scroller").trigger("scroll");
    await wrapper.find(".n-chat-scroller").trigger("scroll");
    expect(wrapper.emitted("loadMore")).toHaveLength(1);

    const older: ChatMessage[] = [
      { id: -2, sender: "bob", text: "old 1" },
      { id: -1, sender: "bob", text: "old 2" },
    ];
    await wrapper.setProps({ messages: [...older, ...messages] });
    await nextTick();
    expect(el.scrollTop).toBe(older.length * 100);

    await wrapper.setProps({ hasMore: false });
    el.scrollTop = 0;
    await wrapper.find(".n-chat-scroller").trigger("scroll");
    expect(wrapper.emitted("loadMore")).toHaveLength(1);
  });

  it("scrolls to the bottom on demand through `scrollToBottom`", () => {
    const wrapper = mountChat();
    const el = mockScroll(wrapper, 0);
    (wrapper.vm as unknown as { scrollToBottom: () => void }).scrollToBottom();
    expect(el.scrollTop).toBe(el.scrollHeight);
  });

  it("shows the empty state, which a slot can replace", () => {
    const empty = mountChat({ messages: [] });
    expect(empty.find(".n-chat-empty").text()).toBe("No messages yet");

    const wrapper = mount(NChat, {
      props: { messages: [], participants },
      slots: { empty: "<p class='custom'>Say hi</p>" },
    });
    expect(wrapper.find(".custom").exists()).toBe(true);
    expect(wrapper.find(".n-chat-empty-icon").exists()).toBe(false);
  });
});
