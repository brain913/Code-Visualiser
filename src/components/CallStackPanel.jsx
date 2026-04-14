/**
 * CallStackPanel — shows the current function call stack.
 * The most recent frame is at the bottom (innermost call).
 */
export default function CallStackPanel({ callStack }) {
  const frames = callStack || ['global'];

  return (
    <div>
      <div className="bg-gray-800/60 px-4 py-2 flex items-center gap-2">
        <span className="text-orange-400 text-sm">📚</span>
        <span className="text-sm font-semibold text-gray-300">Call Stack</span>
        <span className="ml-auto text-xs text-gray-500">{frames.length} frame{frames.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="px-4 py-2 min-h-[48px] max-h-[120px] overflow-auto font-mono text-sm">
        {[...frames].reverse().map((frame, idx) => (
          <div key={idx} className="flex items-center gap-2 leading-5">
            {/* Indent inner frames */}
            {idx > 0 && (
              <span className="text-gray-600 select-none">{'  '.repeat(idx)}└─</span>
            )}
            <span
              className={
                idx === 0
                  ? 'text-orange-300 font-semibold'
                  : 'text-gray-400'
              }
            >
              {frame}
            </span>
            {idx === 0 && (
              <span className="text-xs text-gray-600 ml-auto">(active)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
