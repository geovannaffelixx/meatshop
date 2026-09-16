import { Loader2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin", className)} size={16} aria-hidden="true" />
}
