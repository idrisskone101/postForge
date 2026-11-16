import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-lg bg-raised", className)}
      {...props}
    />
  )
}

export { Skeleton }
