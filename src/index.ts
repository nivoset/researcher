import "dotenv/config";
import { listFilesTool } from "./tools/listFilesTool.ts";
import { getFileContentsTool } from "./tools/getFileContentsTool.ts";
// import { model } from "./model.ts";

async function main(): Promise<void> {
  // List all files in the sample folder
  const filesResult = await listFilesTool.invoke({
    directory: "./src/tools/sample",
    filter: null,
    ignore: null,
  });
  const files = filesResult
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);
  console.log("Files found:\n", files);

  if (files.length === 0) {
    console.log("No files found in sample folder.");
    return;
  }

  // Get contents for each file
  const contents = await getFileContentsTool.invoke({
    baseDirectory: "./src/tools/sample",
    files,
    full: false,
  });
  console.log("\nContents:\n", contents);
}

main(); 