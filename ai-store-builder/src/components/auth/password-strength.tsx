'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'

interface PasswordStrengthProps {
  password: string
}

interface Requirement {
  label: string
  met: boolean
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const requirements = useMemo((): Requirement[] => {
    return [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'One lowercase letter', met: /[a-z]/.test(password) },
      { label: 'One number', met: /[0-9]/.test(password) }
    ]
  }, [password])

  const strength = useMemo(() => {
    const metCount = requirements.filter((r) => r.met).length
    if (metCount === 0) return 0
    if (metCount === 1) return 25
    if (metCount === 2) return 50
    if (metCount === 3) return 75
    return 100
  }, [requirements])

  const strengthLabel = useMemo(() => {
    if (strength === 0) return 'Very weak'
    if (strength === 25) return 'Weak'
    if (strength === 50) return 'Fair'
    if (strength === 75) return 'Good'
    return 'Strong'
  }, [strength])

  const strengthColor = useMemo(() => {
    if (strength <= 25) return 'bg-red-500'
    if (strength === 50) return 'bg-yellow-500'
    if (strength === 75) return 'bg-blue-500'
    return 'bg-green-500'
  }, [strength])

  if (!password) return null

  return (
    <div className="space-y-3 mt-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            strength <= 25 && 'text-red-600',
            strength === 50 && 'text-yellow-600',
            strength === 75 && 'text-blue-600',
            strength === 100 && 'text-green-600'
          )}>
            {strengthLabel}
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', strengthColor)}
            style={{ width: `${strength}%` }}
          />
        </div>
      </div>

      {/* Requirements list */}
      <ul className="space-y-1">
        {requirements.map((req) => (
          <li key={req.label} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={cn(
              req.met ? 'text-green-600' : 'text-muted-foreground'
            )}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
