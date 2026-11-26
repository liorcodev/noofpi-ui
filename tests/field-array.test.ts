import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, nextTick, reactive, ref } from "vue";
import { z } from "zod";
import { NFieldArray, NForm, NFormField, NInput } from "../src";

const components = { NFieldArray, NForm, NFormField, NInput };

const rows = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll(".n-field-array-row");
const inputs = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll<HTMLInputElement>("input");
const action = (
  wrapper: ReturnType<typeof mount>,
  index: number,
  name: "up" | "down" | "remove",
) => rows(wrapper)[index]!.find(`[data-action="${name}"]`);

function harness(
  template: string,
  initial: unknown[],
  extra: Record<string, unknown> = {},
) {
  return mount(
    defineComponent({
      components,
      setup: () => ({ items: ref(initial), ...extra }),
      template,
    }),
    { attachTo: document.body },
  );
}

const names = (wrapper: ReturnType<typeof mount>) =>
  inputs(wrapper).map((input) => input.element.value);

describe("NFieldArray", () => {
  it("renders a row per item in a named group and updates primitives", async () => {
    const wrapper = harness(
      `<NFieldArray v-model="items" label="Tags"><template #default="{ item, update }"><input :value="item" @input="update($event.target.value)" /></template></NFieldArray>`,
      ["a", "b"],
    );
    const group = wrapper.get("fieldset");
    expect(group.attributes("aria-label")).toBe("Tags");
    expect(names(wrapper)).toEqual(["a", "b"]);

    const second = inputs(wrapper)[1]!.element;
    await inputs(wrapper)[1]!.setValue("bb");
    expect(names(wrapper)).toEqual(["a", "bb"]);
    // The row is kept while it is edited
    expect(inputs(wrapper)[1]!.element).toBe(second);
    wrapper.unmount();
  });

  it("adds a fresh default item per click, emits it and focuses the new row", async () => {
    const wrapper = mount(NFieldArray, {
      attachTo: document.body,
      props: {
        modelValue: [] as { name: string }[],
        defaultItem: () => ({ name: "" }),
        "onUpdate:modelValue": (value: unknown) =>
          wrapper.setProps({ modelValue: value as { name: string }[] }),
      },
      slots: { default: `<input class="f" />` },
    });
    await wrapper.find(".n-field-array-add button").trigger("click");
    await wrapper.find(".n-field-array-add button").trigger("click");
    const [first, second] = wrapper.props("modelValue") as { name: string }[];
    expect(first).not.toBe(second);
    expect(wrapper.emitted("add")).toEqual([
      [{ name: "" }, 0],
      [{ name: "" }, 1],
    ]);
    await nextTick();
    expect(document.activeElement).toBe(wrapper.findAll(".f")[1]!.element);
    wrapper.unmount();
  });

  it("keeps rows between min and max without padding the model", async () => {
    const wrapper = harness(
      `<NFieldArray v-model="items" :min="1" :max="2" max-label="That's all"><template #default="{ item }"><input :value="item" /></template></NFieldArray>`,
      ["a"],
    );
    expect(rows(wrapper)).toHaveLength(1);
    expect(action(wrapper, 0, "remove")!.attributes("disabled")).toBeDefined();

    await wrapper.get(".n-field-array-add button").trigger("click");
    expect(rows(wrapper)).toHaveLength(2);
    expect(
      wrapper.get(".n-field-array-add button").attributes("disabled"),
    ).toBeDefined();
    expect(wrapper.get(".n-field-array-hint").text()).toBe("That's all");
    expect(
      action(wrapper, 0, "remove")!.attributes("disabled"),
    ).toBeUndefined();

    const empty = mount(NFieldArray, { props: { modelValue: [], min: 2 } });
    expect(empty.emitted("update:modelValue")).toBeUndefined();
    wrapper.unmount();
  });

  it("keeps each row's DOM, and the focus on the moved button, when rows move or go", async () => {
    const wrapper = harness(
      `<NFieldArray v-model="items" sortable><template #default="{ item }"><input :value="item" /></template></NFieldArray>`,
      ["a", "b", "c"],
    );
    const [a, b, c] = inputs(wrapper).map((input) => input.element);
    expect(action(wrapper, 0, "up")!.attributes("disabled")).toBeDefined();
    expect(action(wrapper, 2, "down")!.attributes("disabled")).toBeDefined();
    expect(action(wrapper, 1, "up")!.attributes("aria-label")).toBe(
      "Move up Item 2",
    );

    await action(wrapper, 0, "down")!.trigger("click");
    expect(inputs(wrapper).map((input) => input.element)).toEqual([b, a, c]);
    expect(document.activeElement).toBe(action(wrapper, 1, "down")!.element);

    await action(wrapper, 0, "remove")!.trigger("click");
    expect(inputs(wrapper).map((input) => input.element)).toEqual([a, c]);
    await nextTick();
    expect(document.activeElement).toBe(a);
    wrapper.unmount();
  });

  it("moves a row with Alt+ArrowUp and Alt+ArrowDown on its buttons", async () => {
    const wrapper = mount(NFieldArray, {
      attachTo: document.body,
      props: { modelValue: ["a", "b", "c"], sortable: true },
      slots: { default: `<template #default="{ item }">{{ item }}</template>` },
    });
    const actions = wrapper.findAll(".n-field-array-actions");
    await actions[1]!.trigger("keydown", { key: "ArrowUp" });
    expect(wrapper.emitted("move")).toBeUndefined();
    await actions[1]!.trigger("keydown", { key: "ArrowUp", altKey: true });
    await actions[2]!.trigger("keydown", { key: "ArrowDown", altKey: true });
    expect(wrapper.emitted("move")).toEqual([[1, 0]]);
    expect(wrapper.emitted("update:modelValue")).toEqual([[["b", "a", "c"]]]);
    wrapper.unmount();
  });

  it("falls back to the add button when the last row is removed", async () => {
    const wrapper = harness(
      `<NFieldArray v-model="items"><template #default="{ item }"><input :value="item" /></template></NFieldArray>`,
      ["a"],
    );
    await action(wrapper, 0, "remove")!.trigger("click");
    await nextTick();
    expect(rows(wrapper)).toHaveLength(0);
    expect(document.activeElement).toBe(
      wrapper.get(".n-field-array-add button").element,
    );
    wrapper.unmount();
  });

  it("shows errors given by row, and for the whole list", () => {
    const wrapper = mount(NFieldArray, {
      props: {
        modelValue: ["a", "b"],
        errors: ["Too short", undefined],
      },
      slots: {
        default: `<template #default="{ errors }"><em>{{ errors['']?.[0] }}</em></template>`,
      },
    });
    expect(rows(wrapper)[0]!.attributes("data-invalid")).toBe("");
    expect(rows(wrapper)[1]!.attributes("data-invalid")).toBeUndefined();
    expect(wrapper.find("em").text()).toBe("Too short");

    const record = mount(NFieldArray, {
      props: { modelValue: ["a"], errors: { "": ["Add one more"] } },
    });
    expect(record.get("[role=alert]").text()).toBe("Add one more");
    expect(record.get("fieldset").attributes("aria-invalid")).toBe("true");
  });
});

describe("NFieldArray inside an NForm", () => {
  const schema = z.object({
    contacts: z
      .array(
        z.object({
          name: z.string().min(1, "Name is required"),
          email: z.email("Enter a valid email"),
        }),
      )
      .min(1, "Add a contact"),
  });

  const make = (contacts: { name: string; email: string }[]) => {
    const state = reactive({ contacts });
    const wrapper = mount(
      defineComponent({
        components,
        setup: () => ({ state, schema }),
        template: `
          <NForm :schema="schema" :state="state">
            <NFieldArray v-model="state.contacts" name="contacts" :default-item="() => ({ name: '', email: '' })">
              <template #default="{ item, index, errors }">
                <NFormField :name="'contacts.' + index + '.email'">
                  <NInput v-model="item.email" />
                </NFormField>
                <p class="name-error">{{ errors.name?.[0] }}</p>
              </template>
            </NFieldArray>
          </NForm>`,
      }),
      { attachTo: document.body },
    );
    return { state, wrapper };
  };

  it("shows each row's errors from the schema paths", async () => {
    const { wrapper } = make([
      { name: "Ann", email: "ann@example.com" },
      { name: "", email: "nope" },
    ]);
    await wrapper.get("form").trigger("submit");
    await nextTick();
    const all = rows(wrapper);
    expect(all[0]!.text()).toBe("");
    expect(all[0]!.attributes("data-invalid")).toBeUndefined();
    expect(all[1]!.find(".n-field-error").text()).toBe("Enter a valid email");
    expect(all[1]!.get(".name-error").text()).toBe("Name is required");
    expect(all[1]!.attributes("data-invalid")).toBe("");
    wrapper.unmount();
  });

  it("shows the list's own error and submits what was added", async () => {
    const { wrapper, state } = make([]);
    await wrapper.get("form").trigger("submit");
    expect(wrapper.get(".n-field-array-error").text()).toBe("Add a contact");
    expect(wrapper.get("fieldset").attributes("aria-invalid")).toBe("true");

    await wrapper.get(".n-field-array-add button").trigger("click");
    await wrapper.get("input").setValue("a@b.co");
    state.contacts[0]!.name = "A";
    await wrapper.get("form").trigger("submit");
    await nextTick();
    expect(wrapper.find(".n-field-array-error").exists()).toBe(false);
    expect(wrapper.findComponent(NForm).emitted("submit")).toEqual([
      [{ contacts: [{ name: "A", email: "a@b.co" }] }],
    ]);
    wrapper.unmount();
  });
});
