import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { reactive, ref } from "vue";
import { z } from "zod";
import { NAuthForm, NForm, NFormField, NInput } from "../src";
import type { NoofpiFormLike } from "../src";

const schema = z.object({
  email: z.email("Enter a valid email"),
  tags: z.array(z.string().min(2, "Too short")),
});

describe("NForm with schema and state", () => {
  it("emits the parsed data when the state is valid", async () => {
    const state = reactive({ email: "a@b.co", tags: ["ab"] });
    const wrapper = mount(NForm, { props: { schema, state } });
    await wrapper.trigger("submit");
    expect(wrapper.emitted("submit")).toEqual([
      [{ email: "a@b.co", tags: ["ab"] }],
    ]);
    expect(wrapper.emitted("error")).toBeUndefined();
  });

  it("emits errors by path and exposes them to the slot", async () => {
    const state = reactive({ email: "nope", tags: ["a"] });
    const wrapper = mount(NForm, {
      props: { schema, state },
      slots: {
        default: `<template #default="{ errors }"><p>{{ errors.email?.[0] }}</p><p>{{ errors["tags.0"]?.[0] }}</p></template>`,
      },
    });
    await wrapper.trigger("submit");
    expect(wrapper.emitted("submit")).toBeUndefined();
    expect(wrapper.emitted("error")![0]).toEqual([
      { email: ["Enter a valid email"], "tags.0": ["Too short"] },
    ]);
    expect(wrapper.text()).toContain("Enter a valid email");
    expect(wrapper.text()).toContain("Too short");
    expect(wrapper.attributes("data-invalid")).toBe("");
  });

  it("clears errors on reset and does not submit when disabled", async () => {
    const state = reactive({ email: "nope", tags: [] });
    const wrapper = mount(NForm, { props: { schema, state } });
    await wrapper.trigger("submit");
    expect(wrapper.attributes("data-invalid")).toBe("");
    await wrapper.trigger("reset");
    expect(wrapper.attributes("data-invalid")).toBeUndefined();

    await wrapper.setProps({ disabled: true });
    await wrapper.trigger("submit");
    expect(wrapper.emitted("error")).toHaveLength(1);
  });

  it("throws without a schema or a form", async () => {
    const wrapper = mount(NForm);
    await expect(
      (wrapper.vm as unknown as { submit(): Promise<void> }).submit(),
    ).rejects.toThrow("needs a `form`");
  });
});

describe("NForm with a useDoofpiForm result", () => {
  const makeForm = (outcome: Awaited<ReturnType<NoofpiFormLike["submit"]>>) => {
    const form: NoofpiFormLike = {
      errors: ref({}),
      failure: ref(null),
      submitting: ref(false),
      submit: vi.fn(async () => outcome),
      validate: () => true,
      reset: vi.fn(),
    };
    return form;
  };

  it("submits through the form and emits what onSubmit returned", async () => {
    const form = makeForm({ ok: true, result: { id: 1 } });
    const wrapper = mount(NForm, { props: { form } });
    await wrapper.trigger("submit");
    expect(form.submit).toHaveBeenCalledOnce();
    expect(wrapper.emitted("submit")).toEqual([[{ id: 1 }]]);
  });

  it("emits the form's errors and shows its state", async () => {
    const form = makeForm({ ok: false, errors: { email: ["Taken"] } });
    form.errors.value = { email: ["Taken"] };
    form.failure.value = "Network down";
    form.submitting.value = true;
    const wrapper = mount(NForm, {
      props: { form },
      slots: {
        default: `<template #default="{ errors, failure }">{{ errors.email[0] }} {{ failure }}</template>`,
      },
    });
    expect(wrapper.text()).toBe("Taken Network down");
    expect(wrapper.attributes("aria-busy")).toBe("true");

    await wrapper.trigger("submit");
    expect(wrapper.emitted("error")).toEqual([[{ email: ["Taken"] }]]);

    await wrapper.trigger("reset");
    expect(form.reset).toHaveBeenCalledOnce();
  });
});
