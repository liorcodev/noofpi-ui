import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NBlobs, NShapes, SHAPE_KINDS } from "../src";
import { createRandom, resolveColor } from "../src/utils/background";
import { SHAPE_PATHS } from "../src/utils/shapes";

describe("background helpers", () => {
  it("gives the same numbers for the same seed", () => {
    const a = createRandom(7);
    const b = createRandom(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(createRandom(8)()).not.toBe(createRandom(7)());
  });

  it("maps color names to theme variables and keeps other colors as they are", () => {
    expect(resolveColor("primary")).toBe("var(--ui-primary-500)");
    expect(resolveColor("error", 300)).toBe("var(--ui-error-300)");
    expect(resolveColor("#ff0066")).toBe("#ff0066");
  });

  it("has a path for every shape kind", () => {
    for (const kind of SHAPE_KINDS) expect(SHAPE_PATHS[kind].d).toBeTruthy();
  });
});

describe("NBlobs", () => {
  it("renders the requested number of decorative blobs", () => {
    const wrapper = mount(NBlobs, { props: { count: 7 } });
    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.get(".n-blobs-layer").attributes("aria-hidden")).toBe(
      "true",
    );
    expect(wrapper.findAll(".n-blob")).toHaveLength(7);
    expect(wrapper.attributes("data-animate")).toBeDefined();
    expect(wrapper.attributes("data-empty")).toBeDefined();
    expect(wrapper.attributes("style")).toContain("--n-blobs-blur: 60px");
  });

  it("cycles the colors, and the same seed gives the same layout", () => {
    const props = { count: 4, colors: ["success", "#123456"], seed: 3 };
    const a = mount(NBlobs, { props });
    const b = mount(NBlobs, { props });
    expect(a.html()).toBe(b.html());
    const blobs = a.findAll(".n-blob");
    expect(blobs[0]!.attributes("style")).toContain(
      "--n-blob-color: var(--ui-success-500)",
    );
    expect(blobs[1]!.attributes("style")).toContain("--n-blob-color: #123456");
    expect(blobs[2]!.attributes("style")).toContain("var(--ui-success-500)");
    expect(mount(NBlobs, { props: { ...props, seed: 4 } }).html()).not.toBe(
      a.html(),
    );
  });

  it("clamps the count, uses circles and renders content above the blobs", () => {
    const wrapper = mount(NBlobs, {
      props: { count: 999, form: "circle", animate: false, opacity: 3 },
      slots: { default: "<p>Hi</p>" },
    });
    expect(wrapper.findAll(".n-blob")).toHaveLength(60);
    expect(wrapper.get(".n-blob").attributes("style")).toContain(
      "border-radius: 50%",
    );
    expect(wrapper.attributes("data-animate")).toBeUndefined();
    expect(wrapper.attributes("data-empty")).toBeUndefined();
    expect(wrapper.attributes("style")).toContain("--n-blobs-opacity: 1");
    expect(wrapper.get(".n-blobs-content").text()).toBe("Hi");
  });
});

describe("NShapes", () => {
  it("renders the requested number of decorative shapes", () => {
    const wrapper = mount(NShapes, { props: { count: 10 } });
    expect(wrapper.get(".n-shapes-layer").attributes("aria-hidden")).toBe(
      "true",
    );
    expect(wrapper.findAll(".n-shape")).toHaveLength(10);
    expect(wrapper.attributes("data-animation")).toBe("float");
    expect(wrapper.attributes("style")).toContain("--n-shapes-stroke: 2px");
  });

  it("only uses the chosen shapes, filled or outlined", () => {
    const outline = mount(NShapes, {
      props: { shapes: ["circle"], count: 5 },
    });
    for (const path of outline.findAll("path")) {
      expect(path.attributes("d")).toBe(SHAPE_PATHS.circle.d);
      expect(path.attributes("fill")).toBe("none");
      expect(path.attributes("stroke")).toBe("currentColor");
    }
    const filled = mount(NShapes, {
      props: { shapes: ["circle"], count: 5, variant: "fill" },
    });
    for (const path of filled.findAll("path")) {
      expect(path.attributes("fill")).toBe("currentColor");
      expect(path.attributes("stroke")).toBe("none");
    }
  });

  it("always strokes line shapes and fills dots", () => {
    const lines = mount(NShapes, {
      props: { shapes: ["wave"], count: 3, variant: "fill" },
    });
    expect(lines.get("path").attributes("stroke")).toBe("currentColor");
    const dots = mount(NShapes, { props: { shapes: ["dots"], count: 3 } });
    expect(dots.get("path").attributes("fill")).toBe("currentColor");
  });

  it("is stable for a seed, and renders nothing without a valid shape", () => {
    const props = { count: 8, seed: 5, layout: "random" } as const;
    expect(mount(NShapes, { props }).html()).toBe(
      mount(NShapes, { props }).html(),
    );
    expect(
      mount(NShapes, { props: { shapes: [], count: 5 } }).findAll(".n-shape"),
    ).toHaveLength(0);
  });
});
