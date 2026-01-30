import { toast as sonnerToast } from 'sonner'

interface ToastOptions {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

/**
 * A hook that wraps sonner's toast with a shadcn/ui-compatible API
 */
export function useToast() {
  const toast = ({ title, description, variant }: ToastOptions) => {
    const message = title || description || ''
    const options = description && title ? { description } : undefined

    if (variant === 'destructive') {
      sonnerToast.error(message, options)
    } else {
      sonnerToast.success(message, options)
    }
  }

  return { toast }
}

export { sonnerToast as toast }
