import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-fixed min-h-24 w-full rounded-lg border-0 bg-raised px-3.5 py-3 text-sm leading-[21px] text-fg transition-shadow duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] outline-none placeholder:text-muted-foreground focus-visible:shadow-[0_0_0_2px_var(--pf-ember)] disabled:cursor-not-allowed disabled:text-fg-disabled aria-invalid:shadow-[0_0_0_2px_var(--pf-bad)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
