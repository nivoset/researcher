import * as fs from 'fs';
import * as path from 'path';

export interface RegexPattern {
  regex: string;
  flags?: string;
}

/**
 * Recursively get all files in a directory filtered by extension.
 */
function getFiles(dir: string, exts: string[], fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFiles(filePath, exts, fileList);
    } else {
      if (exts.length === 0 || exts.includes(path.extname(file))) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

/**
 * Search files for a regex pattern and return file paths with at least one match.
 * @param pattern { regex: string, flags?: string }
 * @param fileTypes Array of file extensions (e.g., ['.js', '.ts'])
 * @param directory Directory to search (default: 'src')
 * @returns Array of file paths with at least one match
 */
export function regexSearchTool(
  pattern: RegexPattern,
  fileTypes: string[],
  directory: string = path.join(__dirname, '..')
): string[] {
  console.log('inner search tool', directory, fileTypes, pattern);
  const files = getFiles(directory, fileTypes);
  const regex = new RegExp(pattern.regex, pattern.flags);
  const matches: string[] = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (regex.test(content)) {
        matches.push(file);
      }
    } catch (e) {
      // Ignore unreadable files
    }
  }
  return matches;
} 