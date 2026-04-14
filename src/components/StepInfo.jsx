/**
 * StepInfo — shows the human-readable description of the current step.
 */
export default function StepInfo({ step }) {
  if (!step) return null;

  return (
    <div className="border-b border-gray-700">
      <div className="bg-gray-800/60 px-4 py-2 flex items-center gap-2">
        <span className="text-blue-400 text-sm">⚡</span>
        <span className="text-sm font-semibold text-gray-300">Current Step</span>
      </div>
      <div className="px-4 py-3">
        <p
          className={`text-sm font-mono ${
            step.isError ? 'text-red-400' : 'text-cyan-300'
          }`}
        >
          {step.description}
        </p>
        {step.line && (
          <p className="text-xs text-gray-500 mt-1 truncate">
            Line {step.lineNumber}: <span className="text-gray-400">{step.line.trim()}</span>
          </p>
        )}
      </div>
    </div>
  );
}
