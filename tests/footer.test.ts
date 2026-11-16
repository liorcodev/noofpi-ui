import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NFooter } from "../src";

describe("NFooter", () => {
  it("renders the brand, the columns, the buttons and the copyright", () => {
    const wrapper = mount(NFooter, {
      props: {
        title: "Acme",
        description: "Build faster.",
        copyright: "© Acme",
        buttons: [
          { icon: "i-lucide-github", "aria-label": "GitHub", to: "/gh" },
        ],
        columns: [
          {
            title: "Product",
            items: [{ label: "Pricing", to: "/pricing", target: "_blank" }],
          },
        ],
      },
    });
    expect(wrapper.attributes("data-brand-align")).toBe("left");
    expect(wrapper.attributes("data-copyright-align")).toBe("left");
    expect(wrapper.find(".n-footer-brand").attributes("href")).toBe("/");
    expect(wrapper.find(".n-footer-description").text()).toBe("Build faster.");
    expect(wrapper.find(".n-footer-buttons a").attributes("href")).toBe("/gh");
    expect(wrapper.find(".n-footer-column-title").text()).toBe("Product");
    const link = wrapper.find(".n-footer-column a");
    expect(link.attributes("href")).toBe("/pricing");
    expect(link.attributes("rel")).toBe("noopener noreferrer");
    expect(wrapper.find(".n-footer-copyright").text()).toBe("© Acme");
    expect(wrapper.find(".n-footer-bottom a").exists()).toBe(false);
  });

  it("renders only the sections that have content and maps the options", () => {
    const wrapper = mount(NFooter, {
      props: {
        copyright: "© Acme",
        brandAlign: "right",
        copyrightAlign: "center",
        border: false,
      },
    });
    expect(wrapper.find(".n-footer-main").exists()).toBe(false);
    expect(wrapper.attributes("data-brand-align")).toBe("right");
    expect(wrapper.attributes("data-copyright-align")).toBe("center");
    expect(wrapper.attributes("data-border")).toBeUndefined();
  });
});
