/**
 * StepControls — navigation bar shown during execution.
 * Displays step counter and Prev / Next / play controls.
 */
export default function StepControls({ steps, currentStep, setCurrentStep, isRunning }) {
  if (!isRunning) return null;

  const total = steps.length;
  const canPrev = currentStep > 0;
  const canNext = currentStep < total - 1;

  const go = (idx) => setCurrentStep(Math.max(0, Math.min(total - 1, idx)));

  const btnBase =
    'px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed';
  const btnPrimary = `${btnBase} bg-blue-600 hover:bg-blue-500 text-white`;
  const btnSecondary = `${btnBase} bg-gray-700 hover:bg-gray-600 text-gray-200`;

  return (
    <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center gap-3 flex-wrap">
      {/* Counter */}
      <span className="text-sm text-gray-400 mr-auto">
        Step{' '}
        <span className="text-white font-semibold">{currentStep + 1}</span>
        {' / '}
        <span className="text-gray-300">{total}</span>
      </span>

      {/* Jump to start */}
      <button
        className={btnSecondary}
        disabled={!canPrev}
        onClick={() => go(0)}
        title="First step"
      >
        ⏮
      </button>

      {/* Previous */}
      <button
        className={btnSecondary}
        disabled={!canPrev}
        onClick={() => go(currentStep - 1)}
        title="Previous step"
      >
        ← Prev
      </button>

      {/* Next */}
      <button
        className={btnPrimary}
        disabled={!canNext}
        onClick={() => go(currentStep + 1)}
        title="Next step"
      >
        Next →
      </button>

      {/* Jump to end */}
      <button
        className={btnSecondary}
        disabled={!canNext}
        onClick={() => go(total - 1)}
        title="Last step"
      >
        ⏭
      </button>

      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-700 rounded-full mt-1">
        <div
          className="h-1 bg-blue-500 rounded-full transition-all duration-200"
          style={{ width: `${((currentStep + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
