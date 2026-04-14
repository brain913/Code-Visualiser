# Code Visualiser

Code Visualiser is an interactive web application that helps users understand how JavaScript code executes step by step. By transforming user-written code into a structured sequence of operations, the application simulates program execution and visually represents changes in variables, control flow, and function calls in real time.

## Features

- **Code Editor** — Paste or write JavaScript directly in the browser
- **Step-by-step Execution** — Navigate forward and backward through each execution step
- **Variable Tracking** — Watch variable values change at every step, with highlights on changed values
- **Line Highlighting** — The currently executing line is highlighted in the editor
- **Console Output** — See `console.log` output accumulate step by step
- **Call Stack Visualisation** — Inspect the function call stack during function calls
- **Safe Interpreter** — No `eval()` — executes code through a custom AST-walking interpreter

## Supported JavaScript

- Variable declarations (`let`, `const`, `var`)
- Arithmetic & comparison operators
- String concatenation & template literals
- `console.log`
- `if` / `else` statements
- `for` loops (with loop variable display)
- `while` loops (with iteration guard)
- Function declarations and calls
- `return` statements
- Arrays and objects (basic)

## Tech Stack

- **React 19** + **Vite 8**
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **Acorn** — JavaScript parser (no `eval()`)

## Getting Started

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## Project Structure

```
src/
  App.jsx                  # Main layout & state management
  engine/
    interpreter.js         # Parser + AST-walking execution engine
  components/
    CodeEditor.jsx         # Code editor with line highlighting
    StepControls.jsx       # Navigation (prev/next/jump to start/end)
    VariablesPanel.jsx     # Live variable state display
    StepInfo.jsx           # Current step description
    OutputPanel.jsx        # Accumulated console.log output
    CallStackPanel.jsx     # Function call stack
```

## Architecture

Each execution step is a plain data object:

```js
{
  stepNumber: number,
  lineNumber: number,      // For line highlighting in the editor
  description: string,     // Human-readable description of the step
  line: string,            // Source code of the executing line
  variables: {},           // Snapshot of all in-scope variables
  output: string[],        // Accumulated console.log output
  callStack: string[],     // Active function call stack
}
```

The interpreter pipeline:
1. **Parse** — Acorn converts source text to an AST
2. **Hoist** — Function declarations are registered before execution
3. **Execute** — The AST walker steps through nodes, capturing a step record at each meaningful point
4. **Navigate** — All steps are generated upfront; the UI lets users browse them

