<script setup lang="ts">
import { computed, inject, ref, useId, type PropType } from "vue";
import { FIELD_KEY } from "../internal/form-context";
import type { ButtonIcon, FileUploadError } from "../types";
import NButton from "./NButton.vue";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NFileUpload" });

const props = defineProps({
  accept: { type: String, default: undefined },
  multiple: { type: Boolean, default: false },
  maxSize: { type: Number, default: undefined },
  maxFiles: { type: Number, default: undefined },
  disabled: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  label: { type: String, default: "Choose files" },
  browseLabel: { type: String, default: "Browse files" },
  dropLabel: { type: String, default: "Drop files here, or" },
  description: { type: String, default: undefined },
  invalid: { type: Boolean, default: false },
  removeLabel: { type: String, default: "Remove file" },
  icon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: "i-lucide-upload-cloud",
  },
});

const model = defineModel<File[]>({ default: () => [] });
const emit = defineEmits<{
  error: [error: FileUploadError];
}>();

defineSlots<{
  dropzone?: () => unknown;
  file?: (props: { file: File; index: number; remove: () => void }) => unknown;
}>();

const input = ref<HTMLInputElement>();
const dragging = ref(false);
const error = ref<FileUploadError | null>(null);
const field = inject(FIELD_KEY, null);
const id = useId();
const describedBy = computed(
  () =>
    [
      field?.describedBy.value,
      props.description ? `${id}-help` : "",
      error.value ? `${id}-error` : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined,
);
const isInvalid = computed(
  () => props.invalid || !!field?.invalid.value || Boolean(error.value),
);

function accepted(file: File) {
  if (!props.accept) return true;
  return props.accept
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .some((pattern) => {
      if (pattern.startsWith("."))
        return file.name.toLowerCase().endsWith(pattern);
      if (pattern.endsWith("/*"))
        return file.type.toLowerCase().startsWith(pattern.slice(0, -1));
      return file.type.toLowerCase() === pattern;
    });
}

function fail(type: FileUploadError["type"], file?: File, max?: number) {
  const message =
    type === "accept"
      ? `${file?.name ?? "This file"} is not an accepted file type.`
      : type === "size"
        ? `${file?.name ?? "This file"} is too large.`
        : `You can upload at most ${max} file${max === 1 ? "" : "s"}.`;
  error.value = { type, file, message };
  emit("error", error.value);
}

function add(incoming: File[]) {
  if (props.disabled) return;
  error.value = null;
  const current = props.multiple ? [...model.value] : [];
  let changed = false;
  for (const file of incoming) {
    if (!accepted(file)) {
      fail("accept", file);
      continue;
    }
    if (props.maxSize != null && file.size > props.maxSize) {
      fail("size", file);
      continue;
    }
    const exists = current.some(
      (entry) =>
        entry.name === file.name &&
        entry.size === file.size &&
        entry.lastModified === file.lastModified,
    );
    if (exists) continue;
    if (
      !props.multiple ||
      (props.maxFiles != null && current.length >= props.maxFiles)
    ) {
      if (props.multiple) fail("count", file, props.maxFiles);
      else {
        current.splice(0, current.length, file);
        changed = true;
      }
      break;
    }
    current.push(file);
    changed = true;
  }
  if (props.multiple || changed) model.value = current;
  if (input.value) input.value.value = "";
}

function onChange(event: Event) {
  add(Array.from((event.target as HTMLInputElement).files ?? []));
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  dragging.value = false;
  add(Array.from(event.dataTransfer?.files ?? []));
}

function remove(index: number) {
  if (props.disabled) return;
  model.value = model.value.filter((_, fileIndex) => fileIndex !== index);
  error.value = null;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
</script>

<template>
  <div
    class="n-file-upload"
    :data-disabled="disabled ? '' : undefined"
    :data-dragging="dragging ? '' : undefined"
    :data-invalid="isInvalid ? '' : undefined"
  >
    <input
      :id="field?.id ?? id"
      ref="input"
      class="n-file-upload-input"
      type="file"
      :name="name"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      :aria-label="label"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-describedby="describedBy"
      @change="onChange"
    />
    <label
      class="n-file-upload-dropzone"
      :for="field?.id ?? id"
      @dragenter.prevent="!disabled && (dragging = true)"
      @dragover.prevent
      @dragleave.prevent="dragging = false"
      @drop="onDrop"
    >
      <slot name="dropzone">
        <span class="n-file-upload-icon-wrap">
          <NIcon v-if="icon" :name="icon" class="n-file-upload-icon" />
        </span>
        <span class="n-file-upload-copy">
          <span>
            {{ dropLabel }}
            <strong>{{ browseLabel }}</strong>
          </span>
          <span
            v-if="description"
            :id="`${id}-help`"
            class="n-file-upload-description"
          >
            {{ description }}
          </span>
          <span
            v-if="error"
            :id="`${id}-error`"
            class="n-file-upload-error"
            role="alert"
          >
            {{ error.message }}
          </span>
        </span>
      </slot>
    </label>

    <ul v-if="model.length" class="n-file-upload-list">
      <li
        v-for="(file, index) in model"
        :key="`${file.name}-${file.size}-${file.lastModified}`"
        class="n-file-upload-file"
      >
        <slot
          name="file"
          :file="file"
          :index="index"
          :remove="() => remove(index)"
        >
          <NIcon name="i-lucide-file" class="n-file-upload-file-icon" />
          <span class="n-file-upload-file-copy">
            <span class="n-file-upload-file-name">{{ file.name }}</span>
            <span class="n-file-upload-file-size">{{
              formatSize(file.size)
            }}</span>
          </span>
          <NButton
            type="button"
            variant="ghost"
            color="neutral"
            size="xs"
            shape="circle"
            icon="i-lucide-x"
            :disabled="disabled"
            :aria-label="`${removeLabel} ${file.name}`"
            @click.prevent="remove(index)"
          />
        </slot>
      </li>
    </ul>
  </div>
</template>
