import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NUser } from "../src";

describe("NUser", () => {
  it("renders name, description and an avatar with the name as fallback", () => {
    const wrapper = mount(NUser, {
      props: { name: "Jane Doe", description: "Nov 12", avatar: {} },
    });
    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.attributes("data-size")).toBe("md");
    expect(wrapper.get(".n-user-name").text()).toBe("Jane Doe");
    expect(wrapper.get(".n-user-description").text()).toBe("Nov 12");
    expect(wrapper.get(".n-avatar").attributes("data-size")).toBe("md");
    expect(wrapper.get(".n-avatar-text").text()).toBe("JD");
  });

  it("omits the avatar and empty text, and lets avatar props override the size", () => {
    const bare = mount(NUser, { props: { name: "Jane" } });
    expect(bare.find(".n-avatar").exists()).toBe(false);
    expect(bare.find(".n-user-description").exists()).toBe(false);

    const wrapper = mount(NUser, {
      props: { as: "li", size: "sm", avatar: { size: "lg", text: "X" } },
    });
    expect(wrapper.element.tagName).toBe("LI");
    expect(wrapper.find(".n-user-text").exists()).toBe(false);
    expect(wrapper.get(".n-avatar").attributes("data-size")).toBe("lg");
  });

  it("prefers slots over props", () => {
    const wrapper = mount(NUser, {
      props: { name: "x", description: "y" },
      slots: { name: "Custom", description: "Desc", avatar: "<b>A</b>" },
    });
    expect(wrapper.get(".n-user-name").text()).toBe("Custom");
    expect(wrapper.get(".n-user-description").text()).toBe("Desc");
    expect(wrapper.find("b").exists()).toBe(true);
  });
});
