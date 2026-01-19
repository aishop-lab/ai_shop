'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/lib/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'

interface Order {
  id: string
  order_number: string
  total_amount: number
  payment_status: string
  razorpay_payment_id?: string
}

interface RefundModalProps {
  order: Order
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

const REFUND_REASONS = [
  { value: 'damaged', label: 'Damaged Product' },
  { value: 'defective', label: 'Defective Product' },
  { value: 'wrong_item', label: 'Wrong Item Sent' },
  { value: 'not_as_described', label: 'Product Not as Described' },
  { value: 'late_delivery', label: 'Late Delivery' },
  { value: 'customer_request', label: 'Customer Request' },
  { value: 'duplicate_order', label: 'Duplicate Order' },
  { value: 'other', label: 'Other' },
]

export function RefundModal({ order, open, onClose, onSuccess }: RefundModalProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [refundType, setRefundType] = useState<'full' | 'partial'>('full')
  const [amount, setAmount] = useState(order.total_amount.toString())
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    if (!loading) {
      setRefundType('full')
      setAmount(order.total_amount.toString())
      setReason('')
      onClose()
    }
  }

  const handleRefund = async () => {
    const refundAmount = refundType === 'full'
      ? order.total_amount
      : parseFloat(amount)

    if (isNaN(refundAmount) || refundAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid refund amount',
        variant: 'destructive'
      })
      return
    }

    if (refundAmount > order.total_amount) {
      toast({
        title: 'Invalid Amount',
        description: 'Refund amount cannot exceed order total',
        variant: 'destructive'
      })
      return
    }

    if (!reason) {
      toast({
        title: 'Reason Required',
        description: 'Please select a reason for the refund',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/dashboard/orders/${order.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: refundAmount,
          reason: REFUND_REASONS.find(r => r.value === reason)?.label || reason,
          notify_customer: true
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process refund')
      }

      toast({
        title: 'Refund Processed',
        description: `Refund of ${formatCurrency(refundAmount, 'INR')} has been processed successfully`
      })

      handleClose()
      onSuccess?.()
      router.refresh()

    } catch (error) {
      console.error('Refund error:', error)
      toast({
        title: 'Refund Failed',
        description: error instanceof Error ? error.message : 'Failed to process refund',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const displayAmount = refundType === 'full'
    ? order.total_amount
    : (parseFloat(amount) || 0)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
          <DialogDescription>
            Refund for Order #{order.order_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Refund Type Selection */}
          <div className="space-y-3">
            <Label>Refund Type</Label>
            <RadioGroup
              value={refundType}
              onValueChange={(value) => setRefundType(value as 'full' | 'partial')}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="flex-1 cursor-pointer">
                  <div className="font-medium">Full Refund</div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(order.total_amount, 'INR')}
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="flex-1 cursor-pointer">
                  <div className="font-medium">Partial Refund</div>
                  <div className="text-sm text-muted-foreground">
                    Enter a custom amount
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Partial Amount Input */}
          {refundType === 'partial' && (
            <div className="space-y-2">
              <Label htmlFor="amount">Refund Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  INR
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={order.total_amount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-12"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum: {formatCurrency(order.total_amount, 'INR')}
              </p>
            </div>
          )}

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Refund</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warning */}
          <div className="flex gap-3 rounded-lg bg-yellow-50 border border-yellow-200 p-4 dark:bg-yellow-950/20 dark:border-yellow-900">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">This action cannot be undone</p>
              <p className="mt-1 text-yellow-700 dark:text-yellow-300">
                The refund will be processed immediately via Razorpay and the customer will be notified via email.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRefund}
            disabled={!reason || loading || (refundType === 'partial' && (!amount || parseFloat(amount) <= 0))}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Refund ${formatCurrency(displayAmount, 'INR')}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
