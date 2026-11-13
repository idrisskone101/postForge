import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-[42px] w-full min-w-0 rounded-lg border-0 bg-raised px-3.5 text-sm leading-[18px] text-fg transition-shadow duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:shadow-[0_0_0_2px_var(--pf-ember)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:text-fg-disabled aria-invalid:shadow-[0_0_0_2px_var(--pf-bad)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
