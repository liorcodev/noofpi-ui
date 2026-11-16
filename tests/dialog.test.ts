import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h, nextTick, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import { NButton, NDialog, NDrawer } from "../src";

const body = () => document.body;

const mountDialog = async (
  props = {},
  slots = {},
  stubs: Record<string, boolean> = {},
) => {
  const wrapper = mount(NDialog, {
    props: { open: true, title: "Delete", description: "Sure?", ...props },
    slots: { default: () => "Content", ...slots },
    attachTo: body(),
    global: { stubs },
  });
  await nextTick();
  await nextTick();
  return wrapper;
};

afterEach(() => {
  body().innerHTML = "";
  document.documentElement.removeAttribute("style");
});

describe("NDialog", () => {
  it("renders an accessible modal into the body only while open", async () => {
    const wrapper = await mountDialog({ open: false });
    expect(body().querySelector('[role="dialog"]')).toBeNull();

    await wrapper.setProps({ open: true });
    const dialog = body().querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(
      body().querySelector(`#${dialog.getAttribute("aria-labelledby")}`)
        ?.textContent,
    ).toContain("Delete");
    expect(
      body().querySelector(`#${dialog.getAttribute("aria-describedby")}`)
        ?.textContent,
    ).toContain("Sure?");
    wrapper.unmount();
  });

  it("closes from the close button, Escape and a backdrop click", async () => {
    const wrapper = await mountDialog({
      "onUpdate:open": (open: boolean) => wrapper.setProps({ open }),
    });
    const root = () => body().querySelector<HTMLElement>(".n-dialog")!;
    const reopen = async () => {
      await wrapper.setProps({ open: true });
      expect(root()).not.toBeNull();
    };

    body().querySelector<HTMLElement>(".n-dialog-close")!.click();
    await nextTick();
    expect(wrapper.props("open")).toBe(false);

    await reopen();
    root().dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await nextTick();
    expect(wrapper.props("open")).toBe(false);

    await reopen();
    root().dispatchEvent(new Event("pointerdown", { bubbles: true }));
    root().click();
    await nextTick();
    expect(wrapper.props("open")).toBe(false);
    wrapper.unmount();
  });

  it("ignores Escape and the backdrop when not dismissible, and ignores presses that start inside", async () => {
    const wrapper = await mountDialog({ dismissible: false });
    const root = body().querySelector<HTMLElement>(".n-dialog")!;
    root.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    root.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    root.click();
    expect(wrapper.emitted("update:open")).toBeUndefined();

    await wrapper.setProps({ dismissible: true });
    body()
      .querySelector<HTMLElement>(".n-dialog-panel")!
      .dispatchEvent(new Event("pointerdown", { bubbles: true }));
    root.click();
    expect(wrapper.emitted("update:open")).toBeUndefined();
    wrapper.unmount();
  });

  it("locks page scroll while open and restores focus on close", async () => {
    const opener = document.createElement("button");
    body().append(opener);
    opener.focus();

    const wrapper = await mountDialog(
      { open: false },
      {},
      { transition: false },
    );
    await wrapper.setProps({ open: true });
    await nextTick();
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.activeElement).toBe(
      body().querySelector(".n-dialog-panel"),
    );

    await wrapper.setProps({ open: false });
    await nextTick();
    expect(document.activeElement).toBe(opener);
    // Still locked while the dialog fades out, so the scrollbar doesn't pop back in
    expect(document.documentElement.style.overflow).toBe("hidden");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(document.documentElement.style.overflow).toBe("");
    wrapper.unmount();
  });

  it("keeps Tab inside the panel", async () => {
    const wrapper = await mountDialog(
      { close: false },
      { footer: () => [h("button", "A"), h("button", "B")] },
    );
    const a = body().querySelectorAll("button")[0]!;
    const b = body().querySelectorAll("button")[1]!;
    const root = body().querySelector<HTMLElement>(".n-dialog")!;

    b.focus();
    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    b.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(a);

    const back = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    root.dispatchEvent(back);
    expect(document.activeElement).toBe(b);
    wrapper.unmount();
  });

  it("renders nothing on the server, so the client can hydrate it", async () => {
    const html = await renderToString(
      createSSRApp({ render: () => h(NDialog, { open: true, title: "x" }) }),
    );
    expect(html).not.toContain("n-dialog");
    expect(html).not.toContain("teleport");
  });

  it("renders in place with `to` set to false", async () => {
    const wrapper = await mountDialog({ to: false });
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    wrapper.unmount();
  });
});

describe("NDrawer", () => {
  it("opens at the end by default and forwards props, slots and v-model", async () => {
    const open = ref(true);
    const Host = defineComponent({
      setup: () => () =>
        h(
          NDrawer,
          {
            open: open.value,
            "onUpdate:open": (value: boolean) => (open.value = value),
            title: "Menu",
            size: "sm",
          },
          { default: () => h(NButton, { label: "Go" }) },
        ),
    });
    const wrapper = mount(Host, { attachTo: body() });
    await nextTick();
    await nextTick();
    const root = body().querySelector(".n-dialog")!;
    expect(root.getAttribute("data-placement")).toBe("end");
    expect(root.getAttribute("data-size")).toBe("sm");
    expect(root.textContent).toContain("Menu");
    expect(root.textContent).toContain("Go");

    body().querySelector<HTMLElement>(".n-dialog-close")!.click();
    expect(open.value).toBe(false);
    wrapper.unmount();
  });
});
