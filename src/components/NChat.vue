<script setup lang="ts">
/**
 * A chat thread with a composer. Message text is rendered as plain text (escaped, line breaks kept):
 * rich or markdown content goes through the `content` slot.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
  type PropType,
} from "vue";
import type {
  ButtonColor,
  ChatAttachment,
  ChatMessage,
  ChatMessageStatus,
  ChatParticipant,
} from "../types";
import NAvatar from "./NAvatar.vue";
import NButton from "./NButton.vue";
import NTextarea from "./NTextarea.vue";

defineOptions({ name: "NChat" });

const props = defineProps({
  /** Oldest first */
  messages: {
    type: Array as PropType<ChatMessage[]>,
    default: () => [],
  },
  /** Senders by id. Unknown senders show their id */
  participants: {
    type: Object as PropType<Record<string, ChatParticipant>>,
    default: () => ({}),
  },
  /** Id of the current user: their messages sit at the end, in the accent color */
  self: { type: String, default: "me" },
  /** Shows the typing indicator. An array lists the ids of who is typing */
  typing: {
    type: [Boolean, Array] as PropType<boolean | string[]>,
    default: false,
  },
  /** Title of the optional header bar (also the `header` slot) */
  title: { type: String, default: undefined },
  /** Language of the dates and times. Default: the browser's */
  locale: { type: String, default: undefined },
  /** Color of your messages and the send button */
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  /** Messages of one sender closer than this many minutes form a group */
  groupWindow: { type: Number, default: 5 },
  /** Shows the sender's name above a group of others' messages */
  showNames: { type: Boolean, default: true },
  /** Shows the avatar of others at the start of a group */
  showAvatars: { type: Boolean, default: true },
  /** Shows the time under a group */
  showTime: { type: Boolean, default: true },
  /** Shows the delivery status of your messages */
  showStatus: { type: Boolean, default: true },
  /** Shows a spinner at the top while older messages load */
  loading: { type: Boolean, default: false },
  /** Set to `false` when there is no older history, so `loadMore` stops firing */
  hasMore: { type: Boolean, default: true },
  /** Distance (px) from the top at which `loadMore` fires */
  loadMoreThreshold: { type: Number, default: 48 },
  /** Distance (px) from the bottom within which new messages keep the thread pinned */
  stickThreshold: { type: Number, default: 80 },
  /** Enter sends and Shift+Enter adds a line. When `false`, Ctrl/Cmd+Enter sends */
  sendOnEnter: { type: Boolean, default: true },
  /** A message is being sent: disables the send button */
  sending: { type: Boolean, default: false },
  /** Disables the composer */
  disabled: { type: Boolean, default: false },
  /** Shows the attach button */
  attachable: { type: Boolean, default: false },
  /** `accept` of the file picker, e.g. `"image/*"` */
  accept: { type: String, default: undefined },
  /** Lets the picker select several files */
  multiple: { type: Boolean, default: true },
  /** Native `maxlength` of the composer */
  maxlength: { type: Number, default: undefined },
  /** Lines after which the composer scrolls */
  maxRows: { type: Number, default: 6 },
  placeholder: { type: String, default: "Type a message…" },
  /** Accessible name of the composer */
  inputLabel: { type: String, default: "Message" },
  sendLabel: { type: String, default: "Send" },
  attachLabel: { type: String, default: "Attach files" },
  removeAttachmentLabel: { type: String, default: "Remove" },
  newMessagesLabel: { type: String, default: "New messages" },
  /** Accessible name of the thread */
  logLabel: { type: String, default: "Messages" },
  typingLabel: { type: String, default: "Typing…" },
  loadingLabel: { type: String, default: "Loading earlier messages…" },
  emptyLabel: { type: String, default: "No messages yet" },
  retryLabel: { type: String, default: "Retry" },
  /** Default: the localized "Today" */
  todayLabel: { type: String, default: undefined },
  /** Default: the localized "Yesterday" */
  yesterdayLabel: { type: String, default: undefined },
  /** Texts of the delivery statuses (read by screen readers) */
  statusLabels: {
    type: Object as PropType<Partial<Record<ChatMessageStatus, string>>>,
    default: () => ({}),
  },
});

const draft = defineModel<string>({ default: "" });

const emit = defineEmits<{
  /** The composer was submitted with its text and the staged files */
  send: [text: string, attachments: File[]];
  /** Files were picked with the attach button */
  attach: [files: File[]];
  /** The thread was scrolled to the top: load older messages and prepend them */
  loadMore: [];
  /** The retry button of a failed message was clicked */
  retry: [message: ChatMessage];
}>();

const STATUS_ICONS: Record<ChatMessageStatus, string> = {
  sending: "i-lucide-clock",
  sent: "i-lucide-check",
  delivered: "i-lucide-check-check",
  read: "i-lucide-check-check",
  error: "i-lucide-circle-alert",
};

const DEFAULT_STATUS_LABELS: Record<ChatMessageStatus, string> = {
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  error: "Failed to send",
};

interface Entry {
  message: ChatMessage;
  mine: boolean;
  participant: ChatParticipant;
  grouped: boolean;
  first: boolean;
  last: boolean;
  position: "single" | "first" | "middle" | "last";
  date: Date | null;
  separator: string | undefined;
  timeLabel: string | undefined;
  status: ChatMessageStatus | undefined;
  showStatus: boolean;
}

const toDate = (time: ChatMessage["time"]) => {
  if (time === undefined || time === null || time === "") return null;
  const date = time instanceof Date ? time : new Date(time);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const participantOf = (id: string): ChatParticipant =>
  props.participants[id] ?? { name: String(id) };

function dayLabel(date: Date, today: Date) {
  const diff = Math.round((startOfDay(today) - startOfDay(date)) / 86_400_000);
  if (diff === 0 || diff === 1) {
    const custom = diff === 0 ? props.todayLabel : props.yesterdayLabel;
    if (custom) return custom;
    const relative = new Intl.RelativeTimeFormat(props.locale, {
      numeric: "auto",
    }).format(-diff, "day");
    return (
      relative.charAt(0).toLocaleUpperCase(props.locale) + relative.slice(1)
    );
  }
  return new Intl.DateTimeFormat(
    props.locale,
    date.getFullYear() === today.getFullYear()
      ? { weekday: "long", day: "numeric", month: "long" }
      : { dateStyle: "long" },
  ).format(date);
}

const timeFormat = computed(
  () => new Intl.DateTimeFormat(props.locale, { timeStyle: "short" }),
);
const fullFormat = computed(
  () =>
    new Intl.DateTimeFormat(props.locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }),
);

const entries = computed<Entry[]>(() => {
  const today = new Date();
  const windowMs = props.groupWindow * 60_000;
  const list: Entry[] = [];
  let previous: Entry | undefined;
  let lastDate: Date | null = null;

  for (const message of props.messages) {
    const date = toDate(message.time);
    const newDay =
      date !== null &&
      (lastDate === null || startOfDay(date) !== startOfDay(lastDate));
    const grouped =
      previous !== undefined &&
      !newDay &&
      previous.message.sender === message.sender &&
      (!date ||
        !previous.date ||
        date.getTime() - previous.date.getTime() <= windowMs);
    const mine = message.sender === props.self;
    const status = message.status;
    const entry: Entry = {
      message,
      mine,
      participant: participantOf(message.sender),
      grouped,
      first: !grouped,
      last: true,
      position: "single",
      date,
      separator: newDay && date ? dayLabel(date, today) : undefined,
      timeLabel: date ? timeFormat.value.format(date) : undefined,
      status,
      showStatus: false,
    };
    if (previous && grouped) previous.last = false;
    if (date) lastDate = date;
    list.push(entry);
    previous = entry;
  }

  for (const entry of list) {
    entry.position =
      entry.first && entry.last
        ? "single"
        : entry.first
          ? "first"
          : entry.last
            ? "last"
            : "middle";
    entry.showStatus =
      entry.mine &&
      props.showStatus &&
      entry.status !== undefined &&
      (entry.last || entry.status === "error");
  }
  return list;
});

const typingIds = computed(() =>
  Array.isArray(props.typing)
    ? props.typing.filter((id) => id !== props.self)
    : [],
);
const isTyping = computed(() =>
  Array.isArray(props.typing) ? typingIds.value.length > 0 : props.typing,
);
const typingParticipants = computed(() =>
  typingIds.value.map((id) => ({ id, ...participantOf(id) })),
);
const typingText = computed(() => {
  const names = typingParticipants.value.map((p) => p.name).join(", ");
  return names ? `${names}: ${props.typingLabel}` : props.typingLabel;
});

const isStreaming = computed(() => props.messages.some((m) => m.streaming));

const statusLabel = (status: ChatMessageStatus) =>
  props.statusLabels[status] ?? DEFAULT_STATUS_LABELS[status];

const fullTime = (date: Date | null) =>
  date ? fullFormat.value.format(date) : undefined;

const isImage = (attachment: ChatAttachment) =>
  Boolean(attachment.url) && Boolean(attachment.type?.startsWith("image/"));

// `javascript:` and `vbscript:` URLs would run on click
const safeUrl = (url: string | undefined) =>
  url && !/^\s*(javascript|vbscript):/i.test(url) ? url : undefined;

function formatSize(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const number = new Intl.NumberFormat(props.locale, {
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value);
  return `${number} ${units[unit]}`;
}

// Scrolling
const scroller = useTemplateRef<HTMLElement>("scroller");
const list = useTemplateRef<HTMLElement>("list");
const atBottom = ref(true);
const unread = ref(0);
let loadArmed = true;
let seen = {
  length: 0,
  first: undefined as unknown,
  last: undefined as unknown,
};
let before = { height: 0, top: 0, stuck: true };
let observer: ResizeObserver | undefined;

function scrollToBottom(behavior: ScrollBehavior = "auto") {
  const el = scroller.value;
  if (!el) return;
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (behavior === "smooth" && !reduce && typeof el.scrollTo === "function")
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  else el.scrollTop = el.scrollHeight;
  atBottom.value = true;
  unread.value = 0;
}

function onScroll() {
  const el = scroller.value;
  if (!el) return;
  atBottom.value =
    el.scrollHeight - el.scrollTop - el.clientHeight <= props.stickThreshold;
  if (atBottom.value) unread.value = 0;
  if (el.scrollTop > props.loadMoreThreshold) loadArmed = true;
  else if (loadArmed && props.hasMore && !props.loading) {
    loadArmed = false;
    emit("loadMore");
  }
}

const changes = () => {
  const last = props.messages[props.messages.length - 1];
  return [
    props.messages.length,
    props.messages[0]?.id,
    last?.id,
    last?.text?.length,
    last?.attachments?.length,
    last?.streaming,
    isTyping.value,
    typingIds.value.length,
  ];
};

// The scroll position and the pinned state, read before the DOM changes
watch(changes, () => {
  const el = scroller.value;
  before = {
    height: el?.scrollHeight ?? 0,
    top: el?.scrollTop ?? 0,
    stuck: atBottom.value,
  };
});

watch(
  changes,
  () => {
    const el = scroller.value;
    const { length } = props.messages;
    const last = props.messages[length - 1];
    const first = props.messages[0];
    if (el) {
      const appended = length > seen.length && last?.id !== seen.last;
      const prepended =
        seen.length > 0 &&
        length > seen.length &&
        first?.id !== seen.first &&
        last?.id === seen.last;
      if (prepended) {
        // Keeps what the user was reading in place
        el.scrollTop = before.top + el.scrollHeight - before.height;
        loadArmed = true;
      } else if (appended && last?.sender === props.self) scrollToBottom();
      else if (before.stuck) scrollToBottom();
      else if (appended) unread.value += length - seen.length;
    }
    seen = { length, first: first?.id, last: last?.id };
  },
  { flush: "post" },
);

watch(
  () => props.loading,
  (loading) => {
    if (!loading) loadArmed = true;
  },
);

onMounted(() => {
  seen = {
    length: props.messages.length,
    first: props.messages[0]?.id,
    last: props.messages[props.messages.length - 1]?.id,
  };
  scrollToBottom();
  if (typeof ResizeObserver === "undefined") return;
  // Late content (images, a growing composer) keeps a pinned thread at the bottom
  observer = new ResizeObserver(() => {
    const el = scroller.value;
    if (el && atBottom.value) el.scrollTop = el.scrollHeight;
  });
  if (scroller.value) observer.observe(scroller.value);
  if (list.value) observer.observe(list.value);
});

onBeforeUnmount(() => observer?.disconnect());

// Composer
const composer = useTemplateRef<HTMLElement>("composer");
const fileInput = useTemplateRef<HTMLInputElement>("fileInput");
const files = ref<File[]>([]);

const canSend = computed(
  () =>
    !props.disabled &&
    !props.sending &&
    (draft.value.trim().length > 0 || files.value.length > 0),
);

function focus() {
  composer.value?.querySelector("textarea")?.focus();
}

function submit() {
  if (!canSend.value) return;
  emit("send", draft.value.trim(), files.value.slice());
  draft.value = "";
  files.value = [];
  nextTick(focus);
}

function onKeydown(event: KeyboardEvent) {
  // keyCode 229 covers browsers that report the Enter confirming an IME candidate after `compositionend`
  if (event.key !== "Enter" || event.isComposing || event.keyCode === 229)
    return;
  const send = props.sendOnEnter
    ? !event.shiftKey
    : event.ctrlKey || event.metaKey;
  if (!send) return;
  event.preventDefault();
  submit();
}

function onPick(event: Event) {
  const input = event.target as HTMLInputElement;
  const picked = Array.from(input.files ?? []);
  input.value = "";
  if (!picked.length) return;
  files.value = props.multiple ? [...files.value, ...picked] : picked;
  emit("attach", picked);
}

function removeFile(index: number) {
  files.value.splice(index, 1);
  nextTick(focus);
}

defineExpose({ scrollToBottom, focus });
</script>

<template>
  <section class="n-chat" :data-color="color">
    <header v-if="title || $slots.header" class="n-chat-header">
      <slot name="header">
        <h2 class="n-chat-title">{{ title }}</h2>
      </slot>
    </header>

    <div class="n-chat-thread">
      <div
        ref="scroller"
        class="n-chat-scroller"
        role="log"
        aria-live="polite"
        tabindex="0"
        :aria-label="logLabel"
        :aria-busy="isStreaming ? 'true' : undefined"
        @scroll.passive="onScroll"
      >
        <div v-if="loading" class="n-chat-loading" role="status">
          <span
            class="n-chat-spinner i-lucide-loader-circle"
            aria-hidden="true"
          />
          {{ loadingLabel }}
        </div>

        <div v-if="!entries.length && !isTyping" class="n-chat-empty">
          <slot name="empty">
            <span
              class="n-chat-empty-icon i-lucide-message-square"
              aria-hidden="true"
            />
            <p>{{ emptyLabel }}</p>
          </slot>
        </div>

        <ol ref="list" class="n-chat-list">
          <template v-for="entry in entries" :key="entry.message.id">
            <li v-if="entry.separator" class="n-chat-date">
              <time :datetime="entry.date?.toISOString()">{{
                entry.separator
              }}</time>
            </li>
            <li
              class="n-chat-message"
              :data-mine="entry.mine ? '' : undefined"
              :data-grouped="entry.grouped ? '' : undefined"
              :data-position="entry.position"
              :data-status="entry.status"
            >
              <slot
                name="message"
                :message="entry.message"
                :mine="entry.mine"
                :grouped="entry.grouped"
                :participant="entry.participant"
                :last="entry.last"
              >
                <div v-if="!entry.mine && showAvatars" class="n-chat-avatar">
                  <slot
                    v-if="entry.first"
                    name="avatar"
                    :message="entry.message"
                    :participant="entry.participant"
                    :mine="entry.mine"
                  >
                    <NAvatar
                      size="sm"
                      :src="entry.participant.avatar"
                      :alt="entry.participant.name"
                      :color="entry.participant.color"
                    />
                  </slot>
                </div>
                <div class="n-chat-stack">
                  <span
                    v-if="entry.first && !entry.mine && showNames"
                    class="n-chat-name"
                  >
                    {{ entry.participant.name }}
                  </span>
                  <slot
                    name="bubble"
                    :message="entry.message"
                    :mine="entry.mine"
                    :grouped="entry.grouped"
                  >
                    <div
                      class="n-chat-bubble"
                      :data-streaming="entry.message.streaming ? '' : undefined"
                    >
                      <slot
                        name="content"
                        :message="entry.message"
                        :mine="entry.mine"
                        :grouped="entry.grouped"
                      >
                        <p
                          v-if="entry.message.text"
                          class="n-chat-text"
                          :data-streaming="
                            entry.message.streaming ? '' : undefined
                          "
                        >
                          {{ entry.message.text }}
                        </p>
                        <template v-else-if="entry.message.streaming">
                          <span class="n-chat-dots" aria-hidden="true">
                            <span /><span /><span />
                          </span>
                          <span class="n-chat-sr">{{ typingLabel }}</span>
                        </template>
                        <ul
                          v-if="entry.message.attachments?.length"
                          class="n-chat-attachments"
                        >
                          <li
                            v-for="(attachment, index) in entry.message
                              .attachments"
                            :key="index"
                          >
                            <component
                              :is="safeUrl(attachment.url) ? 'a' : 'span'"
                              class="n-chat-attachment"
                              :data-image="isImage(attachment) ? '' : undefined"
                              :href="safeUrl(attachment.url)"
                              :target="
                                safeUrl(attachment.url) ? '_blank' : undefined
                              "
                              :rel="
                                safeUrl(attachment.url)
                                  ? 'noopener noreferrer'
                                  : undefined
                              "
                            >
                              <img
                                v-if="isImage(attachment)"
                                class="n-chat-attachment-image"
                                :src="safeUrl(attachment.url)"
                                :alt="attachment.name"
                              />
                              <template v-else>
                                <span
                                  class="n-chat-attachment-icon i-lucide-file"
                                  aria-hidden="true"
                                />
                                <span class="n-chat-attachment-name">{{
                                  attachment.name
                                }}</span>
                                <span
                                  v-if="attachment.size !== undefined"
                                  class="n-chat-attachment-size"
                                >
                                  {{ formatSize(attachment.size) }}
                                </span>
                              </template>
                            </component>
                          </li>
                        </ul>
                      </slot>
                    </div>
                  </slot>
                  <div
                    v-if="
                      (entry.last && showTime && entry.timeLabel) ||
                      entry.showStatus ||
                      (entry.mine && entry.status === 'error')
                    "
                    class="n-chat-meta"
                  >
                    <time
                      v-if="entry.last && showTime && entry.timeLabel"
                      :datetime="entry.date?.toISOString()"
                      :title="fullTime(entry.date)"
                    >
                      {{ entry.timeLabel }}
                    </time>
                    <span
                      v-if="entry.showStatus && entry.status"
                      class="n-chat-status"
                      :data-status="entry.status"
                    >
                      <span
                        :class="[
                          'n-chat-status-icon',
                          STATUS_ICONS[entry.status],
                        ]"
                        aria-hidden="true"
                      />
                      <span class="n-chat-sr">{{
                        statusLabel(entry.status)
                      }}</span>
                    </span>
                    <button
                      v-if="entry.mine && entry.status === 'error'"
                      type="button"
                      class="n-chat-retry"
                      @click="emit('retry', entry.message)"
                    >
                      {{ retryLabel }}
                    </button>
                  </div>
                </div>
              </slot>
            </li>
          </template>

          <li
            v-if="isTyping"
            class="n-chat-message n-chat-typing"
            data-position="single"
          >
            <slot name="typing" :participants="typingParticipants">
              <div v-if="showAvatars" class="n-chat-avatar">
                <NAvatar
                  v-if="typingParticipants[0]"
                  size="sm"
                  :src="typingParticipants[0].avatar"
                  :alt="typingParticipants[0].name"
                  :color="typingParticipants[0].color"
                />
              </div>
              <div class="n-chat-stack">
                <div class="n-chat-bubble">
                  <span class="n-chat-dots" aria-hidden="true">
                    <span /><span /><span />
                  </span>
                  <span class="n-chat-sr">{{ typingText }}</span>
                </div>
              </div>
            </slot>
          </li>
        </ol>
      </div>

      <NButton
        v-if="!atBottom && unread > 0"
        class="n-chat-jump"
        size="sm"
        shape="pill"
        :color="color"
        :label="newMessagesLabel"
        trailing-icon="i-lucide-arrow-down"
        @click="scrollToBottom('smooth')"
      />
    </div>

    <slot
      name="composer"
      :draft="draft"
      :files="files"
      :can-send="canSend"
      :send="submit"
      :disabled="disabled"
    >
      <form ref="composer" class="n-chat-composer" @submit.prevent="submit">
        <ul v-if="files.length" class="n-chat-staged">
          <li
            v-for="(file, index) in files"
            :key="index"
            class="n-chat-staged-item"
          >
            <span
              class="n-chat-attachment-icon i-lucide-file"
              aria-hidden="true"
            />
            <span class="n-chat-attachment-name">{{ file.name }}</span>
            <NButton
              variant="ghost"
              color="neutral"
              shape="circle"
              size="xxs"
              icon="i-lucide-x"
              :aria-label="`${removeAttachmentLabel} ${file.name}`"
              @click="removeFile(index)"
            />
          </li>
        </ul>
        <div class="n-chat-composer-row">
          <slot name="composer-start" />
          <template v-if="attachable">
            <NButton
              variant="ghost"
              color="neutral"
              shape="circle"
              icon="i-lucide-paperclip"
              :aria-label="attachLabel"
              :disabled="disabled"
              @click="fileInput?.click()"
            />
            <input
              ref="fileInput"
              type="file"
              hidden
              tabindex="-1"
              :accept="accept"
              :multiple="multiple"
              @change="onPick"
            />
          </template>
          <NTextarea
            v-model="draft"
            class="n-chat-input"
            autoresize
            :rows="1"
            :max-rows="maxRows"
            :placeholder="placeholder"
            :disabled="disabled"
            :maxlength="maxlength"
            :aria-label="inputLabel"
            @keydown="onKeydown"
          />
          <slot name="composer-end" />
          <NButton
            type="submit"
            shape="circle"
            icon="i-lucide-send-horizontal"
            :color="color"
            :aria-label="sendLabel"
            :disabled="!canSend"
          />
        </div>
      </form>
    </slot>
  </section>
</template>
