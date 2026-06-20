import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./render";

describe("renderMarkdown", () => {
  it("renders bold markdown", () => {
    expect(renderMarkdown("**hi**")).toContain("<strong>hi</strong>");
  });
  it("rewrites [[room 22]] into a room link", () => {
    const html = renderMarkdown("see [[room 22]]");
    expect(html).toContain('data-room="22"');
  });
  it("strips script tags", () => {
    expect(renderMarkdown("<script>alert(1)</script>")).not.toContain("<script>");
  });
});
