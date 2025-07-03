export function extractTypeScriptBlocks(content) {
  const blocks = [];
  // Extract all import statements
  const importRegex = /^import\s.+;$/gm;
  const imports = content.match(importRegex) || [];
  if (imports.length) blocks.push(imports.join("\n"));

  // Match type/interface blocks (multi-line) and exported functions
  const typeBlocks = [];
  const typeInterfaceRegex = /^(export\s+)?(type|interface)\s+\w+[^=\n]*[=\{][\s\S]*?(?=^\}|^export|^type|^interface|^function|^$)/gm;
  const exportedFunctionRegex = /^export\s+function\s+\w+\s*\([^)]*\)\s*(:\s*[^\{\n]+)?\s*\{/gm;

  let match;
  // Extract type/interface blocks
  while ((match = typeInterfaceRegex.exec(content)) !== null) {
    let block = match[0];
    if (block.trim().endsWith("{")) {
      let openBraces = 1;
      let idx = typeInterfaceRegex.lastIndex;
      while (openBraces > 0 && idx < content.length) {
        if (content[idx] === "{") openBraces++;
        if (content[idx] === "}") openBraces--;
        block += content[idx];
        idx++;
      }
      typeInterfaceRegex.lastIndex = idx;
    }
    typeBlocks.push(block.trim());
  }
  // Extract exported functions (just the signature and opening brace)
  while ((match = exportedFunctionRegex.exec(content)) !== null) {
    typeBlocks.push(match[0].trim());
  }
  if (typeBlocks.length) blocks.push(typeBlocks.join("\n\n"));
  return blocks.join("\n\n");
} 