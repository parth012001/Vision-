"use client";

import type { SnapResult } from "@/types/session";

type SnapAnalyzeSheetProps = {
  isOpen: boolean;
  isAnalyzing: boolean;
  result: SnapResult | null;
  onClose: () => void;
};

export function SnapAnalyzeSheet({
  isOpen,
  isAnalyzing,
  result,
  onClose,
}: SnapAnalyzeSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-h-[70vh] bg-surface rounded-t-3xl animate-slide-up pb-safe">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 rounded-full bg-text-muted/30" />
        </div>

        <div className="px-5 pb-6 overflow-y-auto max-h-[calc(70vh-3rem)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Snap & Analyze</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" x2="6" y1="6" y2="18" />
                <line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            </button>
          </div>

          {isAnalyzing && (
            <div className="flex items-center gap-3 py-8 justify-center">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <span className="text-text-muted text-sm">Analyzing image...</span>
            </div>
          )}

          {result && !isAnalyzing && (
            <div className="space-y-4">
              {result.imageDataUrl && (
                <img
                  src={result.imageDataUrl}
                  alt="Captured frame"
                  className="w-full rounded-xl"
                />
              )}
              <div className="p-4 rounded-xl bg-surface-elevated">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {result.analysis}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
