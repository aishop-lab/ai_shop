import { cn } from '@/lib/utils'

interface KeyboardHintProps {
  keys: string
  className?: string
}

export function KeyboardHint({ keys, className }: KeyboardHintProps) {
  return (
    <kbd className={cn(
      'inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5',
      'border-[var(--platform-border)] bg-[var(--platform-bg)]',
      'font-mono text-[10px] text-[var(--platform-text-muted)]',
      className
    )}>
      {keys}
    </kbd>
  )
}
