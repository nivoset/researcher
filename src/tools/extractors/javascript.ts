export function extractJavaScriptBlocks(content: string): string {
  const blocks: string[] = [];
  const importRegex = /^import\s.+;$/gm;
  const requireRegex = /^const\s+\w+\s*=\s*require\(.+\);$/gm;
  const imports = content.match(importRegex) || [];
  const requires = content.match(requireRegex) || [];
  if (imports.length) blocks.push(imports.join("\n"));
  if (requires.length) blocks.push(requires.join("\n"));

  const commentRegex = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;
  const comments = content.match(commentRegex) || [];
  if (comments.length) blocks.push(comments.join("\n"));

  const exportedFunctionRegex = /^export\s+function\s+(\w+)\s*\(([^)]*)\)/gm;
  let match: RegExpExecArray | null;
  while ((match = exportedFunctionRegex.exec(content)) !== null) {
    const name = match[1];
    const params = match[2];
    blocks.push(`export function ${name}(${params});`);
  }

  const exportedVarRegex = /^export\s+(const|let|var)\s+\w+\s*=.+;$/gm;
  const exportedVars = content.match(exportedVarRegex) || [];
  if (exportedVars.length) blocks.push(exportedVars.join("\n"));

  const moduleExportsObjRegex = /^module\.exports\s*=\s*\{([\s\S]*?)\};/gm;
  while ((match = moduleExportsObjRegex.exec(content)) !== null) {
    const props = match[1].split(',').map(p => p.trim().replace(/\n/g, '').replace(/\s*:.*/, ''));
    for (const prop of props) {
      if (prop) blocks.push(`export ${prop};`);
    }
  }

  const exportsAssignmentRegex = /^(?:module\.)?exports\.(\w+)\s*=.+;$/gm;
  while ((match = exportsAssignmentRegex.exec(content)) !== null) {
    blocks.push(`export ${match[1]};`);
  }

  return blocks.join("\n\n");
} 