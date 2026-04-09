import { z } from 'zod'

// Normalize phone: strip +91, spaces, dashes, parens → 10-digit Indian number
function normalizeIndianPhone(val: string): string {
  const digits = val.replace(/[\s\-()]+/g, '')
  if (digits.startsWith('+91')) return digits.slice(3)
  if (digits.startsWith('91') && digits.length === 12) return digits.slice(2)
  if (digits.startsWith('0')) return digits.slice(1)
  return digits
}

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z
    .string()
    .transform(normalizeIndianPhone)
    .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'))
    .optional()
    .or(z.literal(''))
})

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export const profileUpdateSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  phone: z
    .string()
    .transform(normalizeIndianPhone)
    .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'))
    .optional()
    .or(z.literal('')),
  avatar_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  preferences: z
    .object({
      notifications: z
        .object({
          email_orders: z.boolean()
        })
        .partial()
    })
    .partial()
    .optional()
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
