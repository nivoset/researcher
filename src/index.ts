import "dotenv/config";
import { listFilesTool } from "./tools/listFilesTool.ts";
import { getFileContentsTool } from "./tools/getFileContentsTool.ts";
// import { model } from "./model.ts";

async function main(): Promise<void> {
  // Example usage of tools
  const files = await listFilesTool.invoke({
    directory: "./src/tools/sample",
    filter: ".js",
    ignore: null,
  });
  console.log("Files:\n", files);

  const contents = await getFileContentsTool.invoke({
    baseDirectory: "./src/tools/sample",
    files: ["Sample.js"],
    full: false,
  });
  console.log("Contents:\n", contents);
}

main(); 