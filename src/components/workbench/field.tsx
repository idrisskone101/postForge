import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  /** Id of the control inside, so the label focuses it. */
  htmlFor?: string;
  /** Error message. Fades in under the control; pair with `aria-invalid` on the input. */
  error?: string;
  /** The control: an element with class `wb-input`, a `Segmented`, chips. */
  children: ReactNode;
  className?: string;
};

/** 12/600 label over a 42px input. No helper sentence. */
export function Field({ label, htmlFor, error, children, className }: FieldProps) {
  return (
    <div className={cn("wb-field", className)}>
      <label className="wb-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="wb-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
