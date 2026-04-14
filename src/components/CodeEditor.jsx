import { useEffect, useRef } from 'react';

/**
 * CodeEditor — shows the source code with optional line highlighting.
 *
 * In edit mode (isRunning = false): renders a plain <textarea>.
 * In run mode  (isRunning = true):  renders a read-only view where the
 *   active line is highlighted.
 */
export default function CodeEditor({ code, onChange, currentLine, isRunning }) {
  const viewRef = useRef(null);

  // Auto-scroll the highlighted line into view
  useEffect(() => {
    if (!isRunning || !viewRef.current || !currentLine) return;
    const lineEl = viewRef.current.querySelector(`[data-line="${currentLine}"]`);
    if (lineEl) {
      lineEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentLine, isRunning]);

  const codeLines = code.split('\n');

  if (isRunning) {
    return (
      <div
        ref={viewRef}
        className="flex-1 overflow-auto bg-gray-950 font-mono text-sm leading-6 select-none"
      >
        {codeLines.map((line, idx) => {
          const lineNum = idx + 1;
          const isActive = lineNum === currentLine;
          return (
            <div
              key={idx}
              data-line={lineNum}
              className={`flex items-stretch min-h-[24px] transition-colors duration-150 ${
                isActive
                  ? 'bg-yellow-500/20 border-l-2 border-yellow-400'
                  : 'border-l-2 border-transparent'
              }`}
            >
              {/* Line number */}
              <span className="w-10 shrink-0 text-right pr-3 text-gray-600 text-xs leading-6 select-none">
                {lineNum}
              </span>
              {/* Code */}
              <span
                className={`flex-1 pr-4 whitespace-pre ${
                  isActive ? 'text-yellow-100' : 'text-gray-300'
                }`}
              >
                {line || ' '}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-gray-950">
      {/* Line numbers */}
      <div className="w-10 shrink-0 overflow-hidden bg-gray-950 text-right pr-2 pt-3 pb-3 text-gray-600 text-xs leading-6 select-none pointer-events-none">
        {codeLines.map((_, idx) => (
          <div key={idx}>{idx + 1}</div>
        ))}
      </div>
      {/* Editable area */}
      <textarea
        value={code}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        className="flex-1 resize-none bg-transparent text-gray-200 text-sm font-mono leading-6 p-3 pl-1 outline-none border-none overflow-auto"
        style={{ tabSize: 2 }}
        placeholder="// Write JavaScript here…"
      />
    </div>
  );
}
