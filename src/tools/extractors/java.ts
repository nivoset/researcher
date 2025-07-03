export function extractJavaBlocks(content: string): string {
  const blocks: string[] = [];
  const importRegex = /^import\s.+;$/gm;
  const imports = content.match(importRegex) || [];
  if (imports.length) blocks.push(imports.join("\n"));

  function getAnnotations(lines: string[], idx: number): string[] {
    const annots: string[] = [];
    let i = idx - 1;
    while (i >= 0 && lines[i].trim().startsWith("@")) {
      annots.unshift(lines[i]);
      i--;
    }
    return annots;
  }

  const lines = content.split("\n");
  const n = lines.length;
  for (let i = 0; i < n; i++) {
    const line = lines[i];
    if (/^(\s*)?(public\s+)?(class|interface)\s+\w+/.test(line)) {
      const annots = getAnnotations(lines, i);
      if (annots.length) blocks.push(annots.join("\n"));
      const indent = line.match(/^\s*/)![0];
      blocks.push(line.trim() + " {");
      let openBraces = (line.match(/\{/g) || []).length;
      let closeBraces = (line.match(/\}/g) || []).length;
      let j = i + 1;
      while (openBraces > closeBraces && j < n) {
        const l = lines[j];
        openBraces += (l.match(/\{/g) || []).length;
        closeBraces += (l.match(/\}/g) || []).length;
        j++;
      }
      blocks.push(indent + "}");
      i = j - 1;
    }
  }
  for (let i = 0; i < n; i++) {
    let line = lines[i];
    if (/^\s*(public\s+)?[\w<>,\[\]]+\s+\w*\s*\([^)]*$/.test(line) || /^\s*public\s+\w*\s*\([^)]*$/.test(line)) {
      const annots = getAnnotations(lines, i);
      if (annots.length) blocks.push(annots.join("\n"));
      let sig = line;
      let j = i + 1;
      while (j < n && !sig.match(/[;{]\s*$/)) {
        sig += "\n" + lines[j];
        j++;
      }
      const sigLine = sig.split("{")[0].split(";")[0] + ";";
      blocks.push(sigLine);
      i = j - 1;
    } else if (/^\s*(public\s+)?[\w<>,\[\]]+\s+\w+\s*\([^)]*\)\s*[;{]/.test(line) || /^\s*public\s+\w+\s*\([^)]*\)\s*[;{]/.test(line)) {
      const annots = getAnnotations(lines, i);
      if (annots.length) blocks.push(annots.join("\n"));
      const sigLine = line.split("{")[0].split(";")[0] + ";";
      blocks.push(sigLine);
    }
  }
  return blocks.join("\n\n");
} 