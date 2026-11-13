"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border-0 text-[13px] leading-4 font-semibold whitespace-nowrap transition-[background-color,box-shadow,transform] duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:pointer-events-none disabled:bg-raised disabled:text-fg-disabled disabled:shadow-none active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-action text-action-fg hover:bg-[var(--pf-action-hover)] active:bg-[var(--pf-action-pressed)]",
        outline:
          "bg-transparent text-fg shadow-[inset_0_0_0_1px_var(--pf-outline)] hover:bg-fg/8 active:bg-fg/14 aria-expanded:bg-fg/8",
        secondary:
          "bg-raised text-fg hover:bg-raised-strong active:bg-strong aria-expanded:bg-raised-strong",
        ghost:
          "bg-transparent text-fg-secondary hover:bg-raised hover:text-fg aria-expanded:bg-raised aria-expanded:text-fg",
        destructive:
          "bg-bad-tint text-bad hover:bg-[color-mix(in_srgb,var(--pf-bad)_22%,var(--pf-bad-tint))]",
        link: "bg-transparent text-fg-secondary underline underline-offset-4 hover:text-fg",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-[18px] text-sm leading-[18px] has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        icon: "size-[34px]",
        "icon-xs":
          "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm":
          "size-[30px]",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
