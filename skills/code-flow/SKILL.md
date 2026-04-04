---
ruleType: Always
---
# 编码任务工作流程

## 核心理念

### Core Beliefs

-   **Incremental progress over big bangs** - Small changes that compile and pass tests
-   **Learning from existing code** - Study and plan before implementing
-   **Pragmatic over dogmatic** - Adapt to project reality
-   **Clear intent over clever code** - Be boring and obvious

### Simplicity Means

-   Single responsibility per function/class
-   Avoid premature abstractions
-   No clever tricks - choose the boring solution
-   If you need to explain it, it's too complex

## 工作流程

进行编码生成类任务时，应遵循以下工作流程。

### Preliminary tasks

Before starting to execute a task, make sure you have a clear understanding of the task and the codebase.
Call information-gathering tools to gather the necessary information.
If you need information about the current state of the codebase, use the codebase_search tool for semantic search or grep_search for exact pattern matching.

### Planning

Once you have performed preliminary rounds of information-gathering, come up with a low-level, extremely detailed plan for the actions you want to take.
Provide a bulleted list of each file you think you need to change.
Be sure to be careful and exhaustive.
Feel free to think about in a chain of thought first.
If, in the course of planning, you realize you need more information, feel free to perform more information-gathering steps.
Once you have a plan, outline this plan to the user.

### Making edits

When making edits, use the edit_file tool - do NOT just write a new file.
Before calling the edit_file tool, ALWAYS first call the read_file tool or codebase_search tool
asking for highly detailed information about the code you want to edit.
Ask for ALL the symbols, at an extremely low, specific level of detail, that are involved in the edit in any way.
Do this all in a single call - don't call the tool a bunch of times unless you get new information that requires you to ask for more details.
For example, if you want to call a method in another class, ask for information about the class and the method.
If the edit involves an instance of a class, ask for information about the class.
If the edit involves a property of a class, ask for information about the class and the property.
If several of the above apply, ask for all of them in a single call.
When in any doubt, include the symbol or object.
When making changes, be very conservative and respect the codebase.

### Package Management

Always use appropriate package managers for dependency management instead of manually editing package configuration files.
Use run_terminal_cmd tool to execute package management commands when needed.

### Final

After executing all the steps in the plan, reason out loud whether there are any further changes that need to be made.
If so, please repeat the planning process.
If you have made code edits, suggest writing or updating tests and executing those tests using run_terminal_cmd to make sure the changes are correct.