"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }
>(function Select({ className, wrapperClassName, children, ...props }, ref) {
  return (
    <span className={`relative inline-flex ${wrapperClassName ?? ""}`}>
      <select ref={ref} {...props} className={`select-custom w-full ${className ?? ""}`}>
        {children}
      </select>
      <ChevronDown
        size={14}
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
        style={{ color: "var(--ink-faint)" }}
      />
    </span>
  );
});

export default Select;
