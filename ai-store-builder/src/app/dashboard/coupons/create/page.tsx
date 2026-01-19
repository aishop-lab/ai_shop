'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Sparkles, Percent, DollarSign, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/lib/hooks/use-toast'

export default function CreateCouponPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        minimum_order_value: '',
        maximum_discount_amount: '',
        usage_limit: '',
        usage_limit_per_customer: '1',
        starts_at: '',
        expires_at: '',
        active: true
    })

    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let code = ''
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setFormData({ ...formData, code })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.code) {
            toast({
                title: 'Error',
                description: 'Please enter a coupon code',
                variant: 'destructive'
            })
            return
        }

        if (formData.discount_type !== 'free_shipping' && !formData.discount_value) {
            toast({
                title: 'Error',
                description: 'Please enter a discount value',
                variant: 'destructive'
            })
            return
        }

        setLoading(true)
        try {
            const response = await fetch('/api/dashboard/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    discount_value: formData.discount_type === 'free_shipping' ? 0 : formData.discount_value
                })
            })

            const data = await response.json()

            if (data.success) {
                toast({
                    title: 'Coupon Created!',
                    description: `Coupon ${formData.code} is now active`
                })
                router.push('/dashboard/coupons')
            } else {
                throw new Error(data.error)
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to create coupon',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link href="/dashboard/coupons">
                    <Button variant="ghost" size="sm" className="mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Coupons
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold">Create Coupon</h1>
                <p className="text-muted-foreground mt-1">
                    Set up a new discount coupon for your customers
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Coupon Details</CardTitle>
                        <CardDescription>
                            Configure your discount coupon settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Coupon Code */}
                        <div className="space-y-2">
                            <Label htmlFor="code">Coupon Code *</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="SAVE20"
                                    className="font-mono"
                                />
                                <Button type="button" variant="outline" onClick={generateCode}>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Customers will enter this code at checkout
                            </p>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (optional)</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="e.g., 20% off for new customers"
                                rows={2}
                            />
                            <p className="text-sm text-muted-foreground">
                                Internal note - not shown to customers
                            </p>
                        </div>

                        <Separator />

                        {/* Discount Type */}
                        <div className="space-y-4">
                            <Label>Discount Type *</Label>
                            <RadioGroup
                                value={formData.discount_type}
                                onValueChange={(v: string) => setFormData({ ...formData, discount_type: v })}
                                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                            >
                                <Label
                                    htmlFor="percentage"
                                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${formData.discount_type === 'percentage'
                                        ? 'border-primary bg-primary/5'
                                        : 'hover:bg-muted/50'
                                        }`}
                                >
                                    <RadioGroupItem value="percentage" id="percentage" />
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                            <Percent className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Percentage</p>
                                            <p className="text-xs text-muted-foreground">e.g., 20% off</p>
                                        </div>
                                    </div>
                                </Label>

                                <Label
                                    htmlFor="fixed_amount"
                                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${formData.discount_type === 'fixed_amount'
                                        ? 'border-primary bg-primary/5'
                                        : 'hover:bg-muted/50'
                                        }`}
                                >
                                    <RadioGroupItem value="fixed_amount" id="fixed_amount" />
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                            <DollarSign className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Fixed Amount</p>
                                            <p className="text-xs text-muted-foreground">e.g., ₹100 off</p>
                                        </div>
                                    </div>
                                </Label>

                                <Label
                                    htmlFor="free_shipping"
                                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${formData.discount_type === 'free_shipping'
                                        ? 'border-primary bg-primary/5'
                                        : 'hover:bg-muted/50'
                                        }`}
                                >
                                    <RadioGroupItem value="free_shipping" id="free_shipping" />
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            <Truck className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Free Shipping</p>
                                            <p className="text-xs text-muted-foreground">No delivery charge</p>
                                        </div>
                                    </div>
                                </Label>
                            </RadioGroup>
                        </div>

                        {/* Discount Value */}
                        {formData.discount_type !== 'free_shipping' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="discount_value">
                                        {formData.discount_type === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'} *
                                    </Label>
                                    <Input
                                        id="discount_value"
                                        type="number"
                                        value={formData.discount_value}
                                        onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                                        placeholder={formData.discount_type === 'percentage' ? '20' : '100'}
                                        min="0"
                                        max={formData.discount_type === 'percentage' ? '100' : undefined}
                                    />
                                </div>

                                {formData.discount_type === 'percentage' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="maximum_discount_amount">Max Discount (₹)</Label>
                                        <Input
                                            id="maximum_discount_amount"
                                            type="number"
                                            value={formData.maximum_discount_amount}
                                            onChange={(e) => setFormData({ ...formData, maximum_discount_amount: e.target.value })}
                                            placeholder="500"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Cap the discount amount
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <Separator />

                        {/* Conditions */}
                        <div className="space-y-4">
                            <h3 className="font-medium">Conditions</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="minimum_order_value">Minimum Order (₹)</Label>
                                    <Input
                                        id="minimum_order_value"
                                        type="number"
                                        value={formData.minimum_order_value}
                                        onChange={(e) => setFormData({ ...formData, minimum_order_value: e.target.value })}
                                        placeholder="999"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Leave empty for no minimum
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="usage_limit">Total Usage Limit</Label>
                                    <Input
                                        id="usage_limit"
                                        type="number"
                                        value={formData.usage_limit}
                                        onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                                        placeholder="100"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Leave empty for unlimited
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="usage_limit_per_customer">Uses per Customer</Label>
                                <Input
                                    id="usage_limit_per_customer"
                                    type="number"
                                    value={formData.usage_limit_per_customer}
                                    onChange={(e) => setFormData({ ...formData, usage_limit_per_customer: e.target.value })}
                                    placeholder="1"
                                    className="max-w-xs"
                                    min="1"
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Schedule */}
                        <div className="space-y-4">
                            <h3 className="font-medium">Schedule</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="starts_at">Start Date</Label>
                                    <Input
                                        id="starts_at"
                                        type="datetime-local"
                                        value={formData.starts_at}
                                        onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="expires_at">Expiry Date</Label>
                                    <Input
                                        id="expires_at"
                                        type="datetime-local"
                                        value={formData.expires_at}
                                        onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Active Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="active">Active</Label>
                                <p className="text-sm text-muted-foreground">
                                    Coupon can be used immediately
                                </p>
                            </div>
                            <Switch
                                id="active"
                                checked={formData.active}
                                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex gap-3">
                    <Button type="submit" disabled={loading} className="flex-1">
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Coupon'
                        )}
                    </Button>
                    <Link href="/dashboard/coupons">
                        <Button type="button" variant="outline">Cancel</Button>
                    </Link>
                </div>
            </form>
        </div>
    )
}
