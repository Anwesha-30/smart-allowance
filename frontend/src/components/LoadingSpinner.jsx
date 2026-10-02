import React from "react";

const sizes = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-10 h-10 border-3",
  xl: "w-16 h-16 border-4",
};

export default function LoadingSpinner({ size = "md", label, className = "" }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`} role="status" aria-label={label ?? "Loading"}>
      <div
        className={`${sizes[size]} rounded-full border-brand/20 border-t-brand animate-spin`}
      />
      {label && <p className="text-sm text-gray-500 font-medium">{label}</p>}
    </div>
  );
}
