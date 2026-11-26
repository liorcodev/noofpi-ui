<script setup lang="ts">
import { computed, watch, ref, type PropType } from "vue";
import type { QRCodeErrorCorrection, QRCodeFormat } from "../types";
import { encodeQR, qrRuns, qrToPath } from "../utils/qrcode";
import NButton from "./NButton.vue";

defineOptions({ name: "NQRCode" });

const props = defineProps({
  /** The text or URL to encode. When it's empty or too long the `fallback` slot is shown and `error` is emitted */
  value: { type: String, required: true },
  /** Width and height: a number of pixels or a CSS length. The code scales to it */
  size: { type: [Number, String] as PropType<number | string>, default: 160 },
  /** `"L"`, `"M"`, `"Q"` or `"H"` recover about 7%, 15%, 25% and 30% of a damaged code. Default: `"M"`, or `"H"` when there is a logo, as it covers the center */
  errorCorrection: {
    type: String as PropType<QRCodeErrorCorrection>,
    default: undefined,
  },
  /** Quiet zone around the code, in modules. Scanners need 4 */
  margin: { type: Number, default: 4 },
  /** Color of the modules. Default: the `--n-qr-code-fg` token, near-black in both themes so the code stays scannable */
  color: { type: String, default: undefined },
  /** Color of the plate behind the code. Default: the `--n-qr-code-bg` token, white in both themes. A transparent or dark plate can break scanning */
  background: { type: String, default: undefined },
  /** Image URL shown in the center. The modules under it are cleared and the code is at least version 4. The `logo` slot does the same with any content */
  logo: { type: String, default: undefined },
  /** Width of the cleared center as a share of the code, from 0.1 to 0.3 */
  logoSize: { type: Number, default: 0.22 },
  /** Corner radius of the plate, in modules */
  radius: { type: Number, default: 0 },
  /** Accessible name. Default: `"QR code: <value>"` */
  label: { type: String, default: undefined },
  /** Shows a button under the code that downloads it */
  downloadable: { type: Boolean, default: false },
  /** Text of the download button */
  downloadLabel: { type: String, default: "Download" },
  /** Format of the download button */
  downloadFormat: { type: String as PropType<QRCodeFormat>, default: "png" },
  /** Name of the downloaded file, without the extension */
  filename: { type: String, default: "qr-code" },
});

const emit = defineEmits<{
  /** The code couldn't be made (empty or too long `value`) or an export failed */
  error: [error: Error];
  /** A file was handed to the browser for download */
  download: [format: QRCodeFormat, filename: string];
}>();

const slots = defineSlots<{
  /** Content in the center of the code, which clears the modules under it. Not part of the exported files */
  logo?: () => unknown;
  /** Shown instead of the code when the `value` can't be encoded */
  fallback?: (props: { error: Error | undefined }) => unknown;
}>();

const root = ref<HTMLElement>();

const LOGO_INSET = 0.08;
const EXPORT_SIZE = 512;

const hasLogo = computed(() => Boolean(props.logo) || Boolean(slots.logo));
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const encoded = computed(() => {
  try {
    if (!props.value) throw new Error("NQRCode: `value` is empty");
    return {
      qr: encodeQR(props.value, {
        ecc: props.errorCorrection ?? (hasLogo.value ? "H" : "M"),
        minVersion: hasLogo.value ? 4 : 1,
      }),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
});
const qr = computed(() => encoded.value.qr);
const error = computed(() => encoded.value.error);

watch(
  error,
  (value) => {
    if (value) emit("error", value);
  },
  { immediate: true },
);

const margin = computed(() => Math.max(0, props.margin) || 0);
const total = computed(() => (qr.value ? qr.value.size + margin.value * 2 : 0));

// A centered square of modules that stays clear of the format information, so it always has an odd size
const cleared = computed(() => {
  if (!qr.value || !hasLogo.value) return null;
  const { size } = qr.value;
  let side = Math.min(
    Math.round(size * clamp(props.logoSize, 0.1, 0.3)),
    size - 18,
  );
  if ((size - side) % 2) side--;
  return side > 0 ? { start: (size - side) / 2, side } : null;
});

const skip = (x: number, y: number) => {
  const area = cleared.value;
  if (!area) return false;
  const end = area.start + area.side;
  return x >= area.start && x < end && y >= area.start && y < end;
};

const path = computed(() =>
  qr.value ? qrToPath(qr.value.modules, margin.value, skip) : "",
);
const plateRadius = computed(() => clamp(props.radius, 0, total.value / 2));

const logoStyle = computed(() => {
  const area = cleared.value;
  if (!area) return undefined;
  const percent = (modules: number) => `${(modules / total.value) * 100}%`;
  return {
    left: percent(margin.value + area.start),
    top: percent(margin.value + area.start),
    width: percent(area.side),
    height: percent(area.side),
  };
});

const rootStyle = computed(() => {
  const size =
    typeof props.size === "number" || /^\d+(\.\d+)?$/.test(props.size.trim())
      ? `${props.size}px`
      : props.size;
  return {
    "--n-qr-code-size": size,
    "--n-qr-code-fg": props.color,
    "--n-qr-code-bg": props.background,
  };
});

const ariaLabel = computed(() => props.label ?? `QR code: ${props.value}`);

// Reads the colors as they are drawn (tokens, `currentColor` and all) so a file doesn't depend on the page's CSS
function resolveColors() {
  const fallback = {
    fg: props.color ?? "#000",
    bg: props.background ?? "#fff",
  };
  const element = root.value;
  if (!element || typeof getComputedStyle === "undefined") return fallback;
  const probe = document.createElement("span");
  probe.style.color = "var(--n-qr-code-fg, #000)";
  probe.style.backgroundColor = "var(--n-qr-code-bg, #fff)";
  element.appendChild(probe);
  const style = getComputedStyle(probe);
  const colors = { fg: style.color, bg: style.backgroundColor };
  probe.remove();
  return {
    fg: colors.fg && !colors.fg.includes("var(") ? colors.fg : fallback.fg,
    bg: colors.bg && !colors.bg.includes("var(") ? colors.bg : fallback.bg,
  };
}

const escapeAttr = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** A standalone SVG file of the code in the colors it is shown in. A `logo` image is linked, the `logo` slot isn't included */
function toSVG(pixelSize = EXPORT_SIZE): string {
  if (!qr.value) return "";
  const { fg, bg } = resolveColors();
  const t = total.value;
  const area = cleared.value;
  let image = "";
  if (props.logo && area) {
    const inset = area.side * LOGO_INSET;
    image = `<image href="${escapeAttr(props.logo)}" x="${margin.value + area.start + inset}" y="${margin.value + area.start + inset}" width="${area.side - inset * 2}" height="${area.side - inset * 2}" preserveAspectRatio="xMidYMid meet"/>`;
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" width="${pixelSize}" height="${pixelSize}" shape-rendering="crispEdges">` +
    `<rect width="${t}" height="${t}" rx="${plateRadius.value}" fill="${escapeAttr(bg)}"/>` +
    `<path d="${path.value}" fill="${escapeAttr(fg)}"/>${image}</svg>`
  );
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("NQRCode: the logo failed to load"));
    image.src = src;
  });
}

async function toPNG(pixelSize: number) {
  const code = qr.value!;
  const { fg, bg } = resolveColors();
  const scale = Math.max(1, Math.ceil(pixelSize / total.value));
  const side = Math.round(total.value * scale);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = side;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("NQRCode: canvas is not available");

  context.fillStyle = bg;
  if (plateRadius.value && context.roundRect) {
    context.beginPath();
    context.roundRect(0, 0, side, side, plateRadius.value * scale);
    context.fill();
  } else context.fillRect(0, 0, side, side);

  context.fillStyle = fg;
  for (const [x, y, width] of qrRuns(code.modules, skip))
    context.fillRect(
      (x + margin.value) * scale,
      (y + margin.value) * scale,
      width * scale,
      scale,
    );

  const area = cleared.value;
  if (props.logo && area) {
    const image = await loadImage(props.logo);
    const box = area.side * scale * (1 - LOGO_INSET * 2);
    const ratio = Math.min(
      box / (image.naturalWidth || box),
      box / (image.naturalHeight || box),
    );
    const width = (image.naturalWidth || box) * ratio;
    const height = (image.naturalHeight || box) * ratio;
    const center = (margin.value + area.start + area.side / 2) * scale;
    context.drawImage(
      image,
      center - width / 2,
      center - height / 2,
      width,
      height,
    );
  }
  return canvas.toDataURL("image/png");
}

/** The code as a data URL, a PNG by default. `pixelSize` is the minimum width of a PNG, which is a whole number of pixels per module. Client only for PNG */
async function toDataURL(
  format: QRCodeFormat = "png",
  pixelSize = EXPORT_SIZE,
): Promise<string> {
  if (!qr.value) throw error.value ?? new Error("NQRCode: nothing to export");
  if (format === "svg")
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(toSVG(pixelSize))}`;
  return toPNG(pixelSize);
}

/** Hands the code to the browser as a file and emits `download`. A `filename` without an extension gets the format's */
async function download(
  format: QRCodeFormat = props.downloadFormat,
  filename: string = props.filename,
) {
  try {
    const url = await toDataURL(format);
    const name = filename.toLowerCase().endsWith(`.${format}`)
      ? filename
      : `${filename}.${format}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    emit("download", format, name);
  } catch (failure) {
    emit(
      "error",
      failure instanceof Error ? failure : new Error(String(failure)),
    );
  }
}

defineExpose({ toSVG, toDataURL, download });
</script>

<template>
  <div
    ref="root"
    class="n-qr-code"
    :style="rootStyle"
    :data-error="error ? '' : undefined"
  >
    <template v-if="qr">
      <div class="n-qr-code-figure" role="img" :aria-label="ariaLabel">
        <svg
          class="n-qr-code-svg"
          :viewBox="`0 0 ${total} ${total}`"
          shape-rendering="crispEdges"
          focusable="false"
          aria-hidden="true"
        >
          <rect
            class="n-qr-code-plate"
            :width="total"
            :height="total"
            :rx="plateRadius"
          />
          <path class="n-qr-code-modules" :d="path" />
        </svg>
        <span v-if="cleared" class="n-qr-code-logo" :style="logoStyle">
          <slot name="logo">
            <img v-if="logo" class="n-qr-code-logo-image" :src="logo" alt="" />
          </slot>
        </span>
      </div>
      <NButton
        v-if="downloadable"
        class="n-qr-code-download"
        variant="outline"
        color="neutral"
        size="sm"
        icon="i-lucide-download"
        :label="downloadLabel"
        @click="download()"
      />
    </template>
    <slot v-else name="fallback" :error="error" />
  </div>
</template>
