"use client";

import { forwardRef } from "react";

type CameraViewProps = {
  isActive: boolean;
};

export const CameraView = forwardRef<HTMLVideoElement, CameraViewProps>(
  function CameraView({ isActive }, ref) {
    return (
      <div className="absolute inset-0 bg-black">
        <video
          ref={ref}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${
            isActive ? "opacity-100" : "opacity-0"
          } transition-opacity duration-300`}
        />
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-text-muted text-sm">Camera paused</div>
          </div>
        )}
      </div>
    );
  }
);
