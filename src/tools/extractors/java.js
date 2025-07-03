export function extractJavaBlocks(content) {
  const blocks = [];
  // Extract all import statements
  const importRegex = /^import\s.+;$/gm;
  const imports = content.match(importRegex) || [];
  if (imports.length) blocks.push(imports.join("\n"));

  // Helper to capture annotations above a given index
  function getAnnotations(lines, idx) {
    const annots = [];
    let i = idx - 1;
    while (i >= 0 && lines[i].trim().startsWith("@")) {
      annots.unshift(lines[i]); // preserve indentation
      i--;
    }
    return annots;
  }

  const lines = content.split("\n");
  const n = lines.length;
  // Class and interface declarations (with annotations, only signature and closing bracket)
  for (let i = 0; i < n; i++) {
    const line = lines[i];
    if (/^(\s*)?(public\s+)?(class|interface)\s+\w+/.test(line)) {
      const annots = getAnnotations(lines, i);
      if (annots.length) blocks.push(annots.join("\n"));
      // Get indentation
      const indent = line.match(/^\s*/)[0];
      // Add signature
      blocks.push(line.trim() + " {");
      // Find the matching closing bracket
      let openBraces = (line.match(/\{/g) || []).length;
      let closeBraces = (line.match(/\}/g) || []).length;
      let j = i + 1;
      while (openBraces > closeBraces && j < n) {
        const l = lines[j];
        openBraces += (l.match(/\{/g) || []).length;
        closeBraces += (l.match(/\}/g) || []).length;
        j++;
      }
      // Add closing bracket with correct indentation
      blocks.push(indent + "}");
      i = j - 1;
    }
  }
  // Public method and constructor signatures (with annotations, multiline, and indentation)
  for (let i = 0; i < n; i++) {
    let line = lines[i];
    // Detect the start of a public method or constructor signature
    if (/^\s*(public\s+)?[\w<>,\[\]]+\s+\w*\s*\([^)]*$/.test(line) || /^\s*public\s+\w*\s*\([^)]*$/.test(line)) {
      const annots = getAnnotations(lines, i);
      if (annots.length) blocks.push(annots.join("\n"));
      // Capture multiline method signature
      let sig = line;
      let j = i + 1;
      while (j < n && !sig.match(/[;{]\s*$/)) {
        sig += "\n" + lines[j];
        j++;
      }
      // Only include up to the opening brace or semicolon
      const sigLine = sig.split("{")[0].split(";")[0] + ";";
      blocks.push(sigLine);
      i = j - 1;
    }
    // Also match single-line public methods/constructors
    else if (/^\s*(public\s+)?[\w<>,\[\]]+\s+\w+\s*\([^)]*\)\s*[;{]/.test(line) || /^\s*public\s+\w+\s*\([^)]*\)\s*[;{]/.test(line)) {
      const annots = getAnnotations(lines, i);
      if (annots.length) blocks.push(annots.join("\n"));
      // Only include up to the opening brace or semicolon
      const sigLine = line.split("{")[0].split(";")[0] + ";";
      blocks.push(sigLine);
    }
  }
  return blocks.join("\n\n");
} 