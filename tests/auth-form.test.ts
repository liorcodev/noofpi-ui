import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, reactive, ref } from "vue";
import { z } from "zod";
import { NAuthForm, NForm, NFormField, NInput } from "../src";
import type { NoofpiFormLike } from "../src";

const state = reactive({ email: "nope" });
const schema = z.object({ email: z.email("Enter a valid email") });

const Harness = defineComponent({
  setup: () => () =>
    h(NForm, { schema, state }, () =>
      h(
        NFormField,
        {
          name: "email",
          label: "Email",
          required: true,
          help: "We never share it",
        },
        () =>
          h(NInput, {
            modelValue: state.email,
            "onUpdate:modelValue": (value: string | number | undefined) =>
              (state.email = String(value ?? "")),
          }),
      ),
    ),
});

describe("NFormField", () => {
  it("shows the form's error for its name and wires the input to it", async () => {
    const wrapper = mount(Harness);
    expect(wrapper.find(".n-field-help").text()).toBe("We never share it");

    await wrapper.trigger("submit");
    const error = wrapper.find(".n-field-error");
    expect(error.text()).toBe("Enter a valid email");
    expect(error.attributes("role")).toBe("alert");
    expect(wrapper.find(".n-field-help").exists()).toBe(false);

    const input = wrapper.find("input");
    expect(wrapper.find("label").attributes("for")).toBe(
      input.attributes("id"),
    );
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(input.attributes("aria-describedby")).toBe(error.attributes("id"));
    expect(wrapper.find(".n-field").attributes("data-invalid")).toBe("");
  });

  it("lets the error prop override the form's", () => {
    const wrapper = mount(NFormField, {
      props: { name: "email", error: "Already registered" },
    });
    expect(wrapper.find(".n-field-error").text()).toBe("Already registered");
  });

  it("marks the field invalid without a message for `error: true`", () => {
    const wrapper = mount(NFormField, { props: { error: true } });
    expect(wrapper.attributes("data-invalid")).toBe("");
    expect(wrapper.find(".n-field-error").exists()).toBe(false);
  });
});

describe("NAuthForm", () => {
  const fields = [
    { name: "email", type: "email", label: "Email" },
    { name: "password", type: "password", label: "Password" },
    { name: "remember", type: "checkbox", label: "Remember me" },
  ] as const;
  const loginSchema = z.object({
    email: z.email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    remember: z.boolean(),
  });

  it("renders the header, fields and submit button", () => {
    const wrapper = mount(NAuthForm, {
      props: {
        fields: [...fields],
        title: "Sign in",
        description: "Welcome back",
        submitLabel: "Log in",
      },
      slots: { footer: "<a>Forgot?</a>" },
    });
    expect(wrapper.find(".n-auth-title").text()).toBe("Sign in");
    expect(wrapper.find(".n-auth-description").text()).toBe("Welcome back");
    expect(wrapper.find("input[type=email]").exists()).toBe(true);
    expect(wrapper.find("input[type=password]").exists()).toBe(true);
    expect(wrapper.find("input[type=checkbox]").exists()).toBe(true);
    expect(wrapper.find("button[type=submit]").text()).toBe("Log in");
    expect(wrapper.find(".n-auth-footer").text()).toBe("Forgot?");
  });

  it("validates with the schema and emits the parsed values", async () => {
    const wrapper = mount(NAuthForm, {
      props: { fields: [...fields], schema: loginSchema },
    });
    await wrapper.trigger("submit");
    expect(wrapper.emitted("submit")).toBeUndefined();
    expect(wrapper.emitted("error")![0]![0]).toMatchObject({
      email: ["Enter a valid email"],
      password: ["At least 8 characters"],
    });
    expect(wrapper.text()).toContain("Enter a valid email");

    await wrapper.find("input[type=email]").setValue("a@b.co");
    await wrapper.find("input[type=password]").setValue("hunter2hunter2");
    await wrapper.find("input[type=checkbox]").setValue(true);
    await wrapper.trigger("submit");
    expect(wrapper.emitted("submit")).toEqual([
      [{ email: "a@b.co", password: "hunter2hunter2", remember: true }],
    ]);
  });

  it("emits the plain values without a schema, and shows `error`", async () => {
    const wrapper = mount(NAuthForm, {
      props: { fields: [fields[0]], error: "Wrong email or password" },
    });
    await wrapper.find("input").setValue("x");
    await wrapper.trigger("submit");
    expect(wrapper.emitted("submit")).toEqual([[{ email: "x" }]]);
    expect(wrapper.find(".n-auth-alert").text()).toBe(
      "Wrong email or password",
    );
  });

  it("renders providers, calls their handler, and shows the separator", async () => {
    const onClick = vi.fn();
    const wrapper = mount(NAuthForm, {
      props: {
        fields: [fields[0]],
        providers: [{ label: "Continue with GitHub", onClick }],
      },
    });
    expect(wrapper.find(".n-auth-separator").text()).toBe("or");
    await wrapper.find(".n-auth-providers button").trigger("click");
    expect(onClick).toHaveBeenCalledOnce();
    expect(wrapper.emitted("submit")).toBeUndefined();
  });

  it("works through a useDoofpiForm result", async () => {
    const form = {
      values: reactive({ email: "", password: "" }),
      errors: ref({ email: ["Taken"] }),
      failure: ref<string | null>("Network down"),
      submitting: ref(false),
      submit: vi.fn(async () => ({ ok: true as const, result: "done" })),
      validate: () => true,
      reset: vi.fn(),
    } satisfies NoofpiFormLike & { values: object };
    const wrapper = mount(NAuthForm, {
      props: { fields: [fields[0], fields[1]], form },
    });
    expect(wrapper.text()).toContain("Taken");
    expect(wrapper.find(".n-auth-alert").text()).toBe("Network down");

    await wrapper.find("input[type=email]").setValue("a@b.co");
    expect(form.values.email).toBe("a@b.co");
    await wrapper.trigger("submit");
    expect(wrapper.emitted("submit")).toEqual([["done"]]);
  });
});
