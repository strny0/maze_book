import { marked } from "marked";
import DOMPurify from "dompurify";

export function renderMarkdown(src: string): string {
  const withLinks = src.replace(/\[\[room\s*(\d{1,2})\]\]/gi, (_m, n) => {
    const id = String(n).padStart(2, "0");
    return `<a data-room="${id}" href="#">room ${id}</a>`;
  });
  const html = marked.parse(withLinks, { async: false }) as string;
  return DOMPurify.sanitize(html, { ADD_ATTR: ["data-room"] });
}
