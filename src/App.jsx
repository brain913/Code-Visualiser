import { useState } from 'react';
import CodeEditor from './components/CodeEditor';
import StepControls from './components/StepControls';
import VariablesPanel from './components/VariablesPanel';
import StepInfo from './components/StepInfo';
import OutputPanel from './components/OutputPanel';
import CallStackPanel from './components/CallStackPanel';
import { interpret } from './engine/interpreter';

const SAMPLE_CODE = `// Code Visualiser — step through this example!
let x = 5;
let y = 3;
let sum = x + y;
console.log("Sum:", sum);

function multiply(a, b) {
  let result = a * b;
  return result;
}

let product = multiply(x, y);
console.log("Product:", product);

for (let i = 1; i <= 3; i++) {
  console.log("Count:", i);
}

let message = "All done!";
console.log(message);
`;

export default function App() {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [parseError, setParseError] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleRun = () => {
    const { steps: newSteps, parseError: err } = interpret(code);
    if (err) {
      setParseError(err);
      setIsRunning(false);
      return;
    }
    setSteps(newSteps);
    setCurrentStep(0);
    setParseError(null);
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentStep(-1);
    setSteps([]);
    setParseError(null);
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const step = isRunning && currentStep >= 0 ? steps[currentStep] : null;
  const prevStep = isRunning && currentStep > 0 ? steps[currentStep - 1] : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 overflow-hidden">
      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-5 py-3 bg-gray-900 border-b border-gray-700 shrink-0">
        <span className="text-2xl select-none">⟨/⟩</span>
        <h1 className="text-lg font-bold tracking-tight text-white">
          Code Visualiser
        </h1>
        <span className="hidden sm:block text-sm text-gray-500">
          — step-by-step JavaScript execution
        </span>

        <div className="ml-auto flex items-center gap-2">
          {isRunning && (
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            >
              ← Edit
            </button>
          )}
          <button
            onClick={handleRun}
            className="px-4 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>▶</span> Run
          </button>
        </div>
      </header>

      {/* ── Error banner ── */}
      {parseError && (
        <div className="bg-red-900/60 border-b border-red-500/50 px-5 py-2 text-sm text-red-300 font-mono shrink-0">
          ❌ {parseError}
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Code Editor ── */}
        <div className="flex flex-col w-1/2 border-r border-gray-700 overflow-hidden">
          <div className="bg-gray-900/70 px-4 py-1.5 flex items-center gap-2 shrink-0 border-b border-gray-800">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            </div>
            <span className="text-xs text-gray-500 ml-2">
              {isRunning ? 'script.js (read-only)' : 'script.js'}
            </span>
          </div>

          <CodeEditor
            code={code}
            onChange={setCode}
            currentLine={step?.lineNumber}
            isRunning={isRunning}
          />
        </div>

        {/* ── Right: Panels ── */}
        <div className="flex flex-col w-1/2 overflow-hidden">
          {isRunning ? (
            <>
              {/* Step navigation */}
              <StepControls
                steps={steps}
                currentStep={currentStep}
                setCurrentStep={setCurrentStep}
                isRunning={isRunning}
              />

              {/* Scrollable panels */}
              <div className="flex-1 overflow-auto">
                <StepInfo step={step} />
                <VariablesPanel
                  variables={step?.variables}
                  prevVariables={prevStep?.variables}
                />
                <OutputPanel output={step?.output} />
                <CallStackPanel callStack={step?.callStack} />
              </div>
            </>
          ) : (
            /* Welcome / instructions pane shown before Run is clicked */
            <div className="flex flex-col items-center justify-center h-full gap-6 px-10 text-center">
              <div className="text-6xl">⟨/⟩</div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  How to use Code Visualiser
                </h2>
                <p className="text-gray-400 text-sm leading-6 max-w-sm">
                  Write (or edit) JavaScript in the editor on the left, then
                  click{' '}
                  <span className="text-blue-400 font-semibold">▶ Run</span> to
                  step through the execution.
                </p>
              </div>
              <ul className="text-left text-sm text-gray-400 space-y-2 max-w-xs">
                <li className="flex gap-2">
                  <span className="text-yellow-400">📦</span>
                  <span>Watch variables update in real time</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400">📤</span>
                  <span>See <code className="bg-gray-800 px-1 rounded text-green-300">console.log</code> output accumulate</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-orange-400">📚</span>
                  <span>Inspect the call stack during function calls</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">⚡</span>
                  <span>Navigate forward and backward through steps</span>
                </li>
              </ul>
              <div className="text-xs text-gray-600 max-w-sm">
                Supports: variables · arithmetic · if/else · for/while loops · functions
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
