import type { ComputedRef, InjectionKey } from "vue";
import type { FormErrors } from "../types";

/** Provided by `NForm` to the `NFormField`s inside it */
export interface FormContext {
  errors: ComputedRef<FormErrors>;
}

/** Provided by `NFormField` to the control inside it (`NInput`) */
export interface FieldContext {
  id: string;
  invalid: ComputedRef<boolean>;
  describedBy: ComputedRef<string | undefined>;
}

export const FORM_KEY: InjectionKey<FormContext> = Symbol("n-form");
export const FIELD_KEY: InjectionKey<FieldContext | null> =
  Symbol("n-form-field");
