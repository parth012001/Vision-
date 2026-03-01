"use client";

import { useEffect, useState } from "react";

type ReconnectToastProps = {
  visible: boolean;
  onDismiss: () => void;
};

export function ReconnectToast({ visible, onDismiss }: ReconnectToastProps) {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      requestAnimationFrame(() => setShow(true));
    } else {
      setShow(false);
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 pt-safe z-50 flex justify-center pointer-events-none transition-opacity duration-300 ${
        show ? "opacity-100" : "opacity-0"
      }`}
      onTransitionEnd={() => {
        if (!show) {
          setMounted(false);
          onDismiss();
        }
      }}
    >
      <div className="mt-4 px-4 py-2 rounded-full bg-emerald-600/90 backdrop-blur-md flex items-center gap-2 pointer-events-auto">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-xs font-medium text-white">
          Connection restored
        </span>
      </div>
    </div>
  );
}
