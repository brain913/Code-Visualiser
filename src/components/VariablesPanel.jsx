/**
 * VariablesPanel — shows all variables in the current execution scope.
 * Values that changed since the previous step are highlighted.
 */
export default function VariablesPanel({ variables, prevVariables }) {
  const entries = variables ? Object.entries(variables) : [];

  function formatVal(val) {
    if (val === undefined) return <span className="text-gray-500">undefined</span>;
    if (val === null) return <span className="text-gray-400">null</span>;
    if (typeof val === 'boolean')
      return <span className="text-purple-400">{String(val)}</span>;
    if (typeof val === 'number')
      return <span className="text-blue-400">{String(val)}</span>;
    if (typeof val === 'string')
      return <span className="text-green-400">"{val}"</span>;
    if (typeof val === 'object') {
      try {
        return <span className="text-yellow-400">{JSON.stringify(val)}</span>;
      } catch {
        return <span className="text-yellow-400">[Object]</span>;
      }
    }
    return <span className="text-gray-300">{String(val)}</span>;
  }

  function didChange(key, val) {
    if (!prevVariables) return false;
    if (!(key in prevVariables)) return true; // newly added
    return JSON.stringify(prevVariables[key]) !== JSON.stringify(val);
  }

  return (
    <div className="border-b border-gray-700">
      <div className="bg-gray-800/60 px-4 py-2 flex items-center gap-2">
        <span className="text-yellow-400 text-sm">📦</span>
        <span className="text-sm font-semibold text-gray-300">Variables</span>
        {entries.length > 0 && (
          <span className="ml-auto text-xs text-gray-500">{entries.length} var{entries.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <div className="px-4 py-2 min-h-[60px] max-h-[180px] overflow-auto">
        {entries.length === 0 ? (
          <p className="text-gray-600 text-xs italic py-2">No variables yet</p>
        ) : (
          <table className="w-full text-sm font-mono border-collapse">
            <tbody>
              {entries.map(([key, val]) => {
                const changed = didChange(key, val);
                return (
                  <tr
                    key={key}
                    className={`transition-colors duration-300 ${
                      changed ? 'bg-yellow-500/10' : ''
                    }`}
                  >
                    <td className="py-0.5 pr-4 text-gray-400 whitespace-nowrap align-top">
                      {changed && (
                        <span className="text-yellow-400 mr-1 text-xs">●</span>
                      )}
                      {key}
                    </td>
                    <td className="py-0.5 text-right">{formatVal(val)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
