// To use this extractor, install cheerio:
// npm install cheerio
import * as cheerio from "cheerio";

export function extractHtmlJspBlocks(content: string): string {
  // Extract JSP blocks
  const jspBlocks: string[] = [];
  const jspRegex = /<%[=@!]?([\s\S]*?)%>/g;
  let match: RegExpExecArray | null;
  while ((match = jspRegex.exec(content)) !== null) {
    jspBlocks.push(match[0]);
  }

  // Use cheerio to parse HTML structure
  const $ = cheerio.load(content, { xmlMode: false });
  const tags: string[] = [];
  $("*").each((_, el) => {
    const attribs = Object.keys(el.attribs || {}).length ? " ..." : "";
    tags.push(`<${el.tagName}${attribs}>`);
  });

  // Extract comments
  const commentRegex = /<!--([\s\S]*?)-->/g;
  const comments = content.match(commentRegex) || [];

  // Extract scripts and styles
  const scripts = $("script").map((_, el) => $(el).html() || "").get();
  const styles = $("style").map((_, el) => $(el).html() || "").get();

  // Build summary
  return [
    "JSP Blocks:",
    ...jspBlocks,
    "",
    "HTML Tags:",
    ...tags,
    "",
    "Comments:",
    ...comments,
    "",
    "Scripts:",
    ...scripts,
    "",
    "Styles:",
    ...styles,
  ].join("\n");
} 