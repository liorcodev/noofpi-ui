import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";
import { NCommandPalette, NEmptyState, NFileUpload } from "../src";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("style");
});

describe("NEmptyState", () => {
  it("renders content and actions using the component color", async () => {
    const onClick = vi.fn();
    const wrapper = mount(NEmptyState, {
      props: {
        title: "No projects",
        description: "Create a project to get started.",
        icon: "i-lucide-folder",
        color: "success",
        actions: [{ label: "Create", onClick }],
      },
    });
    expect(wrapper.text()).toContain("No projects");
    expect(wrapper.attributes("data-color")).toBe("success");
    const action = wrapper.get("button");
    expect(action.attributes("data-color")).toBe("success");
    await action.trigger("click");
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("NCommandPalette", () => {
  const items = [
    {
      value: "new",
      label: "New project",
      description: "Start from scratch",
      group: "Actions",
      keywords: ["create"],
    },
    {
      value: "settings",
      label: "Open settings",
      group: "Navigation",
      disabled: true,
    },
    { value: "docs", label: "Documentation", group: "Navigation" },
  ];

  it("filters, navigates, selects, and closes on Escape", async () => {
    const wrapper = mount(NCommandPalette, {
      props: { open: true, items },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();

    const input = document.body.querySelector<HTMLInputElement>(
      'input[role="combobox"]',
    )!;
    input.value = "create";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    expect(document.body.querySelectorAll('[role="option"]')).toHaveLength(1);
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    await nextTick();
    expect(wrapper.emitted("select")?.[0]?.[0]).toMatchObject({
      label: "New project",
    });
    expect(wrapper.emitted("update:open")?.at(-1)).toEqual([false]);
    wrapper.unmount();
  });

  it("skips disabled commands and opens an initial palette", async () => {
    const wrapper = mount(NCommandPalette, {
      props: {
        open: true,
        items,
        "onUpdate:open": (open: boolean) => wrapper.setProps({ open }),
      },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();
    const input = document.body.querySelector<HTMLInputElement>(
      'input[role="combobox"]',
    )!;
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(input).toBe(document.activeElement);
    expect(input.getAttribute("aria-activedescendant")).toContain("0");

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
    await nextTick();
    expect(input.getAttribute("aria-activedescendant")).toContain("2");
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await nextTick();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });
});

describe("NFileUpload", () => {
  function files(input: HTMLInputElement, values: File[]) {
    Object.defineProperty(input, "files", {
      configurable: true,
      value: values,
    });
  }

  it("selects valid files, validates types, and removes files", async () => {
    const wrapper = mount(NFileUpload, {
      props: { multiple: true, accept: "image/*", maxFiles: 2 },
      attachTo: document.body,
    });
    const input = wrapper.get<HTMLInputElement>('input[type="file"]');
    files(input.element, [
      new File(["avatar"], "avatar.png", { type: "image/png" }),
    ]);
    await input.trigger("change");
    expect(wrapper.emitted("update:modelValue")?.at(-1)?.[0]).toHaveLength(1);
    expect(wrapper.text()).toContain("avatar.png");

    files(input.element, [
      new File(["nope"], "notes.txt", { type: "text/plain" }),
    ]);
    await input.trigger("change");
    expect(wrapper.emitted("error")?.at(-1)?.[0]).toMatchObject({
      type: "accept",
    });
    expect(wrapper.get('[role="alert"]').text()).toContain("not an accepted");
  });

  it("enforces per-file size and max count", async () => {
    const wrapper = mount(NFileUpload, {
      props: { multiple: true, maxSize: 4, maxFiles: 1 },
    });
    const input = wrapper.get<HTMLInputElement>('input[type="file"]');
    files(input.element, [
      new File(["12345"], "large.txt"),
      new File(["ok"], "ok.txt"),
    ]);
    await input.trigger("change");
    expect(
      wrapper.emitted("error")?.some(([error]) => error.type === "size"),
    ).toBe(true);
    files(input.element, [
      new File(["a"], "one.txt"),
      new File(["b"], "two.txt"),
    ]);
    await input.trigger("change");
    expect(wrapper.emitted("error")?.at(-1)?.[0]).toMatchObject({
      type: "count",
    });
    wrapper.unmount();
  });

  it("renders custom file content with a remove callback", async () => {
    const wrapper = mount(NFileUpload, {
      props: { modelValue: [new File(["x"], "one.txt")] },
      slots: {
        file: ({ file, remove }: { file: File; remove: () => void }) =>
          h("button", { onClick: remove }, file.name),
      },
    });
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([[]]);
  });

  it("cannot browse or remove files while disabled", async () => {
    const wrapper = mount(NFileUpload, {
      props: {
        disabled: true,
        modelValue: [new File(["x"], "one.txt")],
      },
    });
    expect(
      wrapper
        .get<HTMLInputElement>('input[type="file"]')
        .attributes("disabled"),
    ).toBeDefined();
    expect(wrapper.get("button").attributes("disabled")).toBeDefined();
  });
});
