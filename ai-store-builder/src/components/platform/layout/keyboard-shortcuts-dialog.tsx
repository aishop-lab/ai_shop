'use client'

import { cn } from '@/lib/utils'

interface KeyboardShortcutsDialogProps {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUT_GROUPS = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['Esc'], description: 'Close overlays' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ],
  },
  {
    title: 'Approvals',
    shortcuts: [
      { keys: ['J'], description: 'Next approval' },
      { keys: ['K'], description: 'Previous approval' },
      { keys: ['A'], description: 'Approve selected' },
      { keys: ['R'], description: 'Reject selected' },
      { keys: ['X'], description: 'Toggle selection' },
    ],
  },
  {
    title: 'Quick Actions',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Search anything' },
      { keys: ['G', 'H'], description: 'Go to Command Center' },
      { keys: ['G', 'P'], description: 'Go to Products' },
      { keys: ['G', 'O'], description: 'Go to Orders' },
      { keys: ['G', 'S'], description: 'Go to Settings' },
    ],
  },
]

export function KeyboardShortcutsDialog({ isOpen, onClose }: KeyboardShortcutsDialogProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] shadow-2xl overflow-hidden"
          role="dialog"
          aria-label="Keyboard shortcuts"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--platform-border)] px-5 py-3">
            <h2 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
              Keyboard Shortcuts
            </h2>
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--platform-text-muted)] hover:text-[var(--platform-text-primary)] transition-colors"
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto p-5 space-y-5">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  {group.title}
                </h3>
                <div className="space-y-1.5">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.description}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-xs text-[var(--platform-text-secondary)]">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <span key={i}>
                            <kbd
                              className={cn(
                                'inline-flex min-w-[20px] items-center justify-center rounded border px-1.5 py-0.5',
                                'border-[var(--platform-border)] bg-[var(--platform-bg)]',
                                'font-mono text-[10px] text-[var(--platform-text-muted)]'
                              )}
                            >
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--platform-border)] px-5 py-3">
            <p className="text-[10px] text-[var(--platform-text-muted)]">
              Press <kbd className="rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-1 py-px font-mono text-[9px]">?</kbd> anywhere to toggle this dialog
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
