/**
 * OutputPanel — shows the accumulated console.log output up to the current step.
 */
export default function OutputPanel({ output }) {
  const lines = output || [];

  return (
    <div className="border-b border-gray-700">
      <div className="bg-gray-800/60 px-4 py-2 flex items-center gap-2">
        <span className="text-green-400 text-sm">📤</span>
        <span className="text-sm font-semibold text-gray-300">Output</span>
        {lines.length > 0 && (
          <span className="ml-auto text-xs text-gray-500">{lines.length} line{lines.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      <div className="px-4 py-2 min-h-[48px] max-h-[140px] overflow-auto font-mono text-sm">
        {lines.length === 0 ? (
          <p className="text-gray-600 text-xs italic py-1">No output yet</p>
        ) : (
          lines.map((line, idx) => (
            <div key={idx} className="text-green-300 leading-5">
              <span className="text-gray-600 select-none mr-2">&gt;</span>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
