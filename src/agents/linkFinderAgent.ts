import { getFileContentsTool } from "../tools/getFileContentsTool.ts";
import * as path from "path";
import * as fs from "fs/promises";

export async function linkFinderAgent(baseDirectory: string, file: string): Promise<string[]> {
  const result = await getFileContentsTool.invoke({
    baseDirectory,
    files: [file],
    full: true,
  });
  const importRegex = /^import\s+.*?['"](.+?)['"];?/gm;
  const links: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(result)) !== null) {
    let importPath = match[1];
    if (importPath.startsWith(".")) {
      let resolved = importPath;
      if (!resolved.endsWith(".ts") && !resolved.endsWith(".js")) {
        if (await fileExists(path.join(baseDirectory, resolved + ".ts"))) {
          resolved += ".ts";
        } else if (await fileExists(path.join(baseDirectory, resolved + ".js"))) {
          resolved += ".js";
        }
      }
      if (resolved.startsWith("./")) resolved = resolved.slice(2);
      links.push(resolved);
    }
  }
  return links;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
} 