# Researcher: Automated Codebase Analysis Agent

This project provides an automated agent workflow for analyzing codebases, summarizing files, and generating a comprehensive review of code structure, relationships, and suggestions for improvement.

## Quickstart

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Run the master agent:**
   ```sh
   npm start
   ```
   This will analyze the codebase and write a detailed review to `review.md`.

## Output: `review.md`
- The agent writes all analysis, summaries, and improvement suggestions to `review.md`.
- Each file's summary is preserved and can be referenced by humans or other tools.
- The file includes:
  - Overview
  - File Summaries
  - Relationships (optionally with diagrams)
  - Suggestions for improvement
  - History of changes

## How to Interpret `review.md`
- **Overview:** High-level summary of the codebase.
- **File Summaries:** Key details and structure for each file.
- **Relationships:** How files/functions are connected.
- **Suggestions:** Actionable ideas for improvement.
- **History:** Log of review updates and agent runs.

## Extending the Agent
- To add new language extractors, add a new file in `src/tools/extractors/` and update `getFileContentsTool.ts`.
- To add new agent logic, create a new agent in `src/agents/` and compose it in the master agent.

## File Summaries (Manual Section)
- You can add or edit summaries for files here if needed:

```
// Example:
// src/agentMaster.ts - Orchestrates the codebase analysis and review process.
// src/agents/researchAgent.ts - Answers questions about files and suggests further exploration.
```

# Suggestions for Improvement

1. Ensure that code snippets provided for each file are complete and include relevant sections to provide a better understanding of the file's functionality.
2. Provide more specific details on the functions, classes, or methods defined in each file to give a clearer picture of the codebase's structure and purpose.
3. Add explanations on how these files interact with each other to achieve specific functionalities or workflows within the codebase.
4. Include examples or use cases where each file is utilized to demonstrate its practical application in the overall codebase.
5. Consider adding a high-level overview or architecture diagram to illustrate the relationships between the files and their roles in the codebase.

## History

- 2025-07-03T15:48:01.001Z: Iteration 1: added/updated agentMaster.ts
- 2025-07-03T15:48:09.096Z: Iteration 2: added/updated tools/getFileContentsTool.ts
- 2025-07-03T15:48:22.315Z: Iteration 3: added/updated agents/updateReadmeAgent.ts
- 2025-07-03T15:48:26.245Z: Iteration 4: added/updated agents/researchAgent.ts
- 2025-07-03T15:48:30.489Z: Iteration 5: added/updated agents/linkFinderAgent.ts
- 2025-07-03T15:48:33.867Z: Iteration 6: added/updated model.ts
- 2025-07-03T15:48:36.123Z: Iteration 7: added/updated extractors/typescript.ts
- 2025-07-03T15:48:39.283Z: Iteration 8: added/updated extractors/java.ts
- 2025-07-03T15:48:41.859Z: Iteration 9: added/updated extractors/javascript.ts
- 2025-07-03T15:48:44.004Z: Iteration 10: added/updated extractors/html.ts
- 2025-07-03T15:48:46.708Z: Iteration 11: added/updated ../model.ts
- 2025-07-03T15:48:48.487Z: Iteration 12: added/updated ../tools/getFileContentsTool.ts
- 2025-07-03T15:48:50.136Z: Final update: all files explored
- 2025-07-03T17:06:18.132Z: Iteration 1: added/updated agentMaster.ts
- 2025-07-03T17:06:21.009Z: Iteration 2: added/updated tools/getFileContentsTool.ts
- 2025-07-03T17:06:31.152Z: Iteration 3: added/updated agents/updateReadmeAgent.ts
- 2025-07-03T17:06:37.393Z: Iteration 4: added/updated agents/researchAgent.ts
- 2025-07-03T17:06:42.241Z: Iteration 5: added/updated agents/linkFinderAgent.ts
- 2025-07-03T17:06:45.866Z: Iteration 6: added/updated model.ts
- 2025-07-03T17:06:48.524Z: Iteration 7: added/updated extractors/typescript.ts
- 2025-07-03T17:06:54.055Z: Iteration 8: added/updated extractors/java.ts
- 2025-07-03T17:06:57.125Z: Iteration 9: added/updated extractors/javascript.ts
- 2025-07-03T17:06:59.805Z: Iteration 10: added/updated extractors/html.ts
- 2025-07-03T17:07:02.579Z: Iteration 11: added/updated ../model.ts
- 2025-07-03T17:07:05.035Z: Iteration 12: added/updated ../tools/getFileContentsTool.ts
- 2025-07-03T17:07:06.732Z: Final update: all files explored
- 2025-07-03T17:11:01.597Z: Iteration 1: added/updated agentMaster.ts
- 2025-07-03T17:11:09.546Z: Iteration 2: added/updated tools/getFileContentsTool.ts
- 2025-07-03T17:11:15.896Z: Iteration 3: added/updated agents/updateReadmeAgent.ts
- 2025-07-03T17:11:19.590Z: Iteration 4: added/updated agents/researchAgent.ts
- 2025-07-03T17:11:28.225Z: Iteration 5: added/updated agents/linkFinderAgent.ts
- 2025-07-03T17:11:32.382Z: Iteration 6: added/updated model.ts
- 2025-07-03T17:11:34.923Z: Iteration 7: added/updated extractors/typescript.ts
- 2025-07-03T17:11:38.526Z: Iteration 8: added/updated extractors/java.ts
- 2025-07-03T17:11:45.630Z: Iteration 9: added/updated extractors/javascript.ts
- 2025-07-03T17:11:50.443Z: Iteration 10: added/updated extractors/html.ts
- 2025-07-03T17:11:55.556Z: Iteration 11: added/updated ../model.ts
- 2025-07-03T17:11:59.728Z: Iteration 12: added/updated ../tools/getFileContentsTool.ts
- 2025-07-03T17:12:02.294Z: Final update: all files explored
