#!/usr/bin/env node
// To use this CLI, run: npm install inquirer
import inquirer from 'inquirer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MasterAgent } from './agentMaster';

async function main() {
  // Prompt for base directory
  const { baseDirectory } = await inquirer.prompt([
    {
      type: 'input',
      name: 'baseDirectory',
      message: 'Base directory to analyze:',
      default: process.cwd(),
    },
  ]);

  // List files in the directory for entry file selection
  let files: string[] = [];
  try {
    const dirents = await fs.readdir(baseDirectory, { withFileTypes: true });
    files = dirents.filter(d => d.isFile()).map(d => d.name);
  } catch (err) {
    console.error('Could not read directory:', err);
    process.exit(1);
  }
  if (files.length === 0) {
    console.error('No files found in the selected directory.');
    process.exit(1);
  }

  const { entryFile } = await inquirer.prompt([
    {
      type: 'list',
      name: 'entryFile',
      message: 'Select the entry file:',
      choices: files,
    },
  ]);

  // Prompt for research question
  const { question } = await inquirer.prompt([
    {
      type: 'input',
      name: 'question',
      message: 'Enter your research question:',
    },
  ]);

  console.log(`\nRunning researcher on:\n- Directory: ${baseDirectory}\n- Entry file: ${entryFile}\n- Question: ${question}\n`);

  const agent = new MasterAgent(baseDirectory, entryFile, question);
  await agent.run();

  console.log('\nResearch complete. Results are saved in the notes/<timestamp>/ folder.');
}

main().catch(err => {
  console.error('Error running researcher CLI:', err);
  process.exit(1);
}); 