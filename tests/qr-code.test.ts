import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";
import { NQRCode, encodeQR, qrToPath } from "../src";

type Modules = boolean[][];

const finder = (modules: Modules, x0: number, y0: number) =>
  Array.from({ length: 7 }, (_, y) =>
    Array.from({ length: 7 }, (_, x) =>
      modules[y0 + y]![x0 + x] ? "#" : ".",
    ).join(""),
  );

const FINDER = [
  "#######",
  "#.....#",
  "#.###.#",
  "#.###.#",
  "#.###.#",
  "#.....#",
  "#######",
];

// Both copies of the 15 format bits, bit 14 first
function formatBits(modules: Modules) {
  const n = modules.length;
  const first = [
    ...[14, 13, 12, 11, 10, 9].map((i) => modules[8]![14 - i]!),
    modules[8]![7]!,
    modules[8]![8]!,
    modules[7]![8]!,
    ...Array.from({ length: 6 }, (_, i) => modules[5 - i]![8]!),
  ];
  const second = [
    ...Array.from({ length: 7 }, (_, i) => modules[n - 1 - i]![8]!),
    ...Array.from({ length: 8 }, (_, i) => modules[8]![n - 8 + i]!),
  ];
  const text = (bits: boolean[]) => bits.map(Number).join("");
  return [text(first), text(second)];
}

// The dark runs the component put in its path, as [x, y, width]
function runsOf(path: string) {
  return [...path.matchAll(/M(\d+) (\d+)h(\d+)v1/g)].map(
    (m) => [Number(m[1]), Number(m[2]), Number(m[3])] as const,
  );
}

describe("encodeQR", () => {
  it("picks the smallest version that fits and sizes the matrix to it", () => {
    const hello = encodeQR("HELLO WORLD", { ecc: "Q" });
    expect(hello.version).toBe(1);
    expect(hello.size).toBe(21);
    expect(hello.modules).toHaveLength(21);
    expect(hello.modules.every((row) => row.length === 21)).toBe(true);

    // 19 bytes: over the 17 of version 1-L, within the 32 of 2-L
    const url = encodeQR("https://example.com", { ecc: "L" });
    expect([url.version, url.size, url.mode]).toEqual([2, 25, "byte"]);
    expect(encodeQR("a".repeat(17), { ecc: "L" }).version).toBe(1);
    expect(encodeQR("a".repeat(18), { ecc: "L" }).version).toBe(2);
    expect(encodeQR("https://example.com", { ecc: "H" }).version).toBe(3);
    expect(encodeQR("x", { minVersion: 7 }).size).toBe(45);
  });

  it("uses numeric and alphanumeric modes when the text allows, which fit more", () => {
    expect(encodeQR("0123456789").mode).toBe("numeric");
    expect(encodeQR("HELLO $%*+-./: 1").mode).toBe("alphanumeric");
    expect(encodeQR("Hello").mode).toBe("byte");
    // Capacity of version 1-L: 41 digits, 25 alphanumeric characters, 17 bytes
    expect(encodeQR("1".repeat(41), { ecc: "L" }).version).toBe(1);
    expect(encodeQR("1".repeat(42), { ecc: "L" }).version).toBe(2);
    expect(encodeQR("A".repeat(25), { ecc: "L" }).version).toBe(1);
    expect(encodeQR("A".repeat(26), { ecc: "L" }).version).toBe(2);
    expect(encodeQR("שלום 👋").mode).toBe("byte");
  });

  it("draws the finder patterns, the timing lines and the dark module", () => {
    const { modules, size } = encodeQR("https://example.com/finder");
    expect(finder(modules, 0, 0)).toEqual(FINDER);
    expect(finder(modules, size - 7, 0)).toEqual(FINDER);
    expect(finder(modules, 0, size - 7)).toEqual(FINDER);
    // The separators around the finders are light
    expect(modules[7]!.slice(0, 8).some(Boolean)).toBe(false);
    for (let i = 8; i < size - 8; i++) {
      expect(modules[6]![i]).toBe(i % 2 === 0);
      expect(modules[i]![6]).toBe(i % 2 === 0);
    }
    expect(modules[size - 8]![8]).toBe(true);
  });

  it("writes the format information for each level and mask, twice", () => {
    const expected = {
      "L,0": "111011111000100",
      "M,0": "101010000010010",
      "M,5": "100000011001110",
      "Q,0": "011010101011111",
      "H,0": "001011010001001",
    } as const;
    for (const [key, bits] of Object.entries(expected)) {
      const [ecc, mask] = key.split(",");
      const qr = encodeQR("format", {
        ecc: ecc as "L",
        mask: Number(mask),
      });
      expect(qr.mask).toBe(Number(mask));
      expect(formatBits(qr.modules)).toEqual([bits, bits]);
    }
  });

  it("writes the version information from version 7", () => {
    const { modules, size } = encodeQR("version", { minVersion: 7 });
    // Version 7 is 0b000111110010010100
    const expected = "000111110010010100";
    const read = (transpose: boolean) =>
      Array.from({ length: 18 }, (_, k) => {
        const i = 17 - k;
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        return Number(transpose ? modules[a]![b] : modules[b]![a]);
      }).join("");
    expect(read(false)).toBe(expected);
    expect(read(true)).toBe(expected);
    // Below version 7 that area is data, not version bits
    expect(encodeQR("version").version).toBeLessThan(7);
  });

  it("keeps the requested mask and is deterministic", () => {
    const a = encodeQR("https://example.com", { mask: 2 });
    const b = encodeQR("https://example.com", { mask: 5 });
    expect([a.mask, b.mask]).toEqual([2, 5]);
    expect(a.modules).not.toEqual(b.modules);
    expect(encodeQR("https://example.com")).toEqual(
      encodeQR("https://example.com"),
    );
    expect(encodeQR("https://example.com").mask).toBeGreaterThanOrEqual(0);
  });

  it("holds the documented capacity of version 40 and throws beyond it", () => {
    expect(encodeQR("a".repeat(2953), { ecc: "L" }).version).toBe(40);
    expect(() => encodeQR("a".repeat(2954), { ecc: "L" })).toThrow(RangeError);
    expect(encodeQR("a".repeat(1273), { ecc: "H" }).version).toBe(40);
    expect(() => encodeQR("a".repeat(1274), { ecc: "H" })).toThrow(RangeError);
    expect(() => encodeQR("x", { mask: 8 })).toThrow(RangeError);
    expect(() => encodeQR("x", { ecc: "Z" as "L" })).toThrow(RangeError);
  });
});

describe("qrToPath", () => {
  const modules = [
    [true, true, false, true],
    [false, false, false, false],
    [true, true, true, false],
  ];

  it("merges horizontal runs into one rectangle each", () => {
    expect(qrToPath(modules)).toBe("M0 0h2v1h-2zM3 0h1v1h-1zM0 2h3v1h-3z");
  });

  it("moves the code by the offset and leaves out skipped modules", () => {
    expect(qrToPath(modules, 2)).toContain("M2 2h2v1h-2z");
    expect(qrToPath(modules, 0, (x, y) => x === 1 && y === 0)).toBe(
      "M0 0h1v1h-1zM3 0h1v1h-1zM0 2h3v1h-3z",
    );
  });
});

describe("NQRCode", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders an accessible SVG whose viewBox includes the quiet zone", () => {
    const wrapper = mount(NQRCode, { props: { value: "Hi" } });
    const figure = wrapper.find(".n-qr-code-figure");
    expect(figure.attributes("role")).toBe("img");
    expect(figure.attributes("aria-label")).toBe("QR code: Hi");
    const svg = wrapper.find("svg");
    // Version 1 is 21 modules, plus the default quiet zone of 4 on each side
    expect(svg.attributes("viewBox")).toBe("0 0 29 29");
    expect(svg.attributes("shape-rendering")).toBe("crispEdges");
    expect(svg.attributes("aria-hidden")).toBe("true");
    expect(wrapper.find("path").attributes("d")).toMatch(/^M4 4h7/);
    expect(wrapper.attributes("data-error")).toBeUndefined();
  });

  it("takes the label, margin, size, colors and radius", () => {
    const wrapper = mount(NQRCode, {
      props: {
        value: "Hi",
        label: "Join the Wi-Fi",
        margin: 1,
        size: 200,
        color: "#112233",
        background: "#eeeeee",
        radius: 2,
      },
    });
    expect(wrapper.find("[role=img]").attributes("aria-label")).toBe(
      "Join the Wi-Fi",
    );
    expect(wrapper.find("svg").attributes("viewBox")).toBe("0 0 23 23");
    expect(wrapper.find("rect").attributes("rx")).toBe("2");
    const style = (wrapper.element as HTMLElement).style;
    expect(style.getPropertyValue("--n-qr-code-size")).toBe("200px");
    expect(style.getPropertyValue("--n-qr-code-fg")).toBe("#112233");
    expect(style.getPropertyValue("--n-qr-code-bg")).toBe("#eeeeee");

    wrapper.unmount();
    const css = mount(NQRCode, { props: { value: "Hi", size: "12rem" } });
    expect(
      (css.element as HTMLElement).style.getPropertyValue("--n-qr-code-size"),
    ).toBe("12rem");
    css.unmount();
    const digits = mount(NQRCode, { props: { value: "Hi", size: "96" } });
    expect(
      (digits.element as HTMLElement).style.getPropertyValue(
        "--n-qr-code-size",
      ),
    ).toBe("96px");
  });

  it("recomputes the code when the value or the level changes", async () => {
    const wrapper = mount(NQRCode, { props: { value: "https://a.example" } });
    const before = wrapper.find("path").attributes("d");
    await wrapper.setProps({ value: "https://b.example" });
    expect(wrapper.find("path").attributes("d")).not.toBe(before);
    expect(wrapper.find("[role=img]").attributes("aria-label")).toBe(
      "QR code: https://b.example",
    );
    // 17 characters take 1-L, but 3-H
    await wrapper.setProps({ value: "a".repeat(17), errorCorrection: "L" });
    expect(wrapper.find("svg").attributes("viewBox")).toBe("0 0 29 29");
    await wrapper.setProps({ errorCorrection: "H" });
    expect(wrapper.find("svg").attributes("viewBox")).toBe("0 0 37 37");
  });

  it("clears the center for a logo, raises the version, and shows the image", () => {
    const wrapper = mount(NQRCode, {
      props: { value: "Hi", logo: "/logo.png" },
    });
    // At least version 4: 33 modules + 8 of quiet zone
    expect(wrapper.find("svg").attributes("viewBox")).toBe("0 0 41 41");
    const logo = wrapper.find(".n-qr-code-logo");
    expect(logo.find("img").attributes("src")).toBe("/logo.png");
    const style = (logo.element as HTMLElement).style;
    // 7 of 33 modules, starting at module 13 (+ the margin of 4), out of 41
    expect(style.width).toBe(`${(7 / 41) * 100}%`);
    expect(style.left).toBe(`${(17 / 41) * 100}%`);
    expect(style.top).toBe(style.left);

    const covered = runsOf(wrapper.find("path").attributes("d")!).filter(
      ([x, y, w]) => y >= 17 && y < 24 && x < 24 && x + w > 17,
    );
    expect(covered).toEqual([]);
    expect(wrapper.find("path").attributes("d")).not.toBe("");
  });

  it("clamps the cleared center to the logoSize limits", () => {
    const side = (logoSize: number) => {
      const wrapper = mount(NQRCode, {
        props: { value: "Hi", logo: "/l.png", logoSize },
      });
      const width = (wrapper.find(".n-qr-code-logo").element as HTMLElement)
        .style.width;
      return Math.round((parseFloat(width) / 100) * 41);
    };
    expect(side(0.9)).toBe(9);
    expect(side(0.01)).toBe(3);
  });

  it("puts the logo slot in the center, with no image", () => {
    const wrapper = mount(NQRCode, {
      props: { value: "Hi" },
      slots: { logo: () => h("b", { class: "mark" }, "N") },
    });
    const logo = wrapper.find(".n-qr-code-logo");
    expect(logo.find(".mark").text()).toBe("N");
    expect(logo.find("img").exists()).toBe(false);
    expect(wrapper.find("svg").attributes("viewBox")).toBe("0 0 41 41");
  });

  it("shows the fallback slot and emits `error` for an empty or too long value", async () => {
    const wrapper = mount(NQRCode, {
      props: { value: "" },
      slots: {
        fallback: (slot: { error?: Error }) =>
          h("p", { class: "fallback" }, slot.error?.message),
      },
    });
    expect(wrapper.find("svg").exists()).toBe(false);
    expect(wrapper.find("[role=img]").exists()).toBe(false);
    expect(wrapper.find(".fallback").text()).toContain("empty");
    expect(wrapper.attributes("data-error")).toBe("");
    expect(wrapper.emitted("error")).toHaveLength(1);

    await wrapper.setProps({ value: "a".repeat(3000) });
    expect(wrapper.find("svg").exists()).toBe(false);
    const errors = wrapper.emitted("error")!;
    expect(errors).toHaveLength(2);
    expect(errors[1]![0]).toBeInstanceOf(RangeError);

    await wrapper.setProps({ value: "ok" });
    expect(wrapper.find("svg").exists()).toBe(true);
    expect(wrapper.find(".fallback").exists()).toBe(false);
    expect(wrapper.attributes("data-error")).toBeUndefined();
  });

  it("exports a standalone SVG in the shown colors", () => {
    const wrapper = mount(NQRCode, {
      props: {
        value: "Hi",
        color: "#112233",
        background: "#fafafa",
        logo: 'a"b&c.png',
      },
    });
    const svg = (
      wrapper.vm as unknown as { toSVG: (n?: number) => string }
    ).toSVG(300);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 41 41"');
    expect(svg).toContain('width="300"');
    expect(svg).toContain('fill="#112233"');
    expect(svg).toContain('fill="#fafafa"');
    expect(svg).toContain(wrapper.find("path").attributes("d")!);
    expect(svg).toContain('href="a&quot;b&amp;c.png"');

    const empty = mount(NQRCode, { props: { value: "" } });
    expect((empty.vm as unknown as { toSVG: () => string }).toSVG()).toBe("");
  });

  it("downloads a file, appends the extension once and emits `download`", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe("badge.svg");
        expect(this.href).toMatch(/^data:image\/svg\+xml/);
      });
    const wrapper = mount(NQRCode, { props: { value: "Hi" } });
    const vm = wrapper.vm as unknown as {
      download: (format?: "svg" | "png", filename?: string) => Promise<void>;
      toDataURL: (format?: "svg" | "png") => Promise<string>;
    };
    await vm.download("svg", "badge");
    await vm.download("svg", "badge.svg");
    expect(click).toHaveBeenCalledTimes(2);
    expect(wrapper.emitted("download")).toEqual([
      ["svg", "badge.svg"],
      ["svg", "badge.svg"],
    ]);
    const url = await vm.toDataURL("svg");
    expect(decodeURIComponent(url.split(",")[1]!)).toContain("<svg");
  });

  it("draws the PNG on a canvas with whole pixels per module", async () => {
    const fillRect = vi.fn();
    const context = {
      fillRect,
      fillStyle: "",
      beginPath: vi.fn(),
      fill: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    let canvas: HTMLCanvasElement | undefined;
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(
      function (this: HTMLCanvasElement) {
        canvas = this;
        return "data:image/png;base64,AAAA";
      },
    );
    const wrapper = mount(NQRCode, { props: { value: "Hi" } });
    const vm = wrapper.vm as unknown as {
      toDataURL: (format?: "svg" | "png", size?: number) => Promise<string>;
    };
    expect(await vm.toDataURL("png", 300)).toBe("data:image/png;base64,AAAA");
    // 29 modules at ceil(300 / 29) = 11 pixels each
    expect(canvas!.width).toBe(319);
    expect(canvas!.height).toBe(319);
    const runs = runsOf(wrapper.find("path").attributes("d")!);
    // One call for the plate and one for each run of modules
    expect(fillRect).toHaveBeenCalledTimes(runs.length + 1);
    expect(fillRect).toHaveBeenNthCalledWith(2, 4 * 11, 4 * 11, 7 * 11, 11);
  });

  it("renders a download button that emits `download`, and `error` when the export fails", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const wrapper = mount(NQRCode, {
      props: {
        value: "Hi",
        downloadable: true,
        downloadLabel: "Save",
        downloadFormat: "svg",
        filename: "invite",
      },
    });
    const button = wrapper.find("button.n-qr-code-download");
    expect(button.text()).toBe("Save");
    await button.trigger("click");
    await nextTick();
    expect(wrapper.emitted("download")).toEqual([["svg", "invite.svg"]]);

    // happy-dom has no 2D context, so a PNG can't be drawn
    await wrapper.setProps({ downloadFormat: "png" });
    await button.trigger("click");
    await new Promise((resolve) => setTimeout(resolve));
    expect(wrapper.emitted("download")).toHaveLength(1);
    expect(wrapper.emitted("error")![0]![0]).toBeInstanceOf(Error);

    await wrapper.setProps({ downloadable: false });
    expect(wrapper.find("button").exists()).toBe(false);
  });
});
