'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Plus, Percent, DollarSign, Truck, MoreVertical, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/lib/hooks/use-toast'

interface Coupon {
    id: string
    code: string
    description: string | null
    discount_type: 'percentage' | 'fixed_amount' | 'free_shipping'
    discount_value: number
    minimum_order_value: number | null
    maximum_discount_amount: number | null
    usage_limit: number | null
    usage_count: number
    usage_limit_per_customer: number
    starts_at: string | null
    expires_at: string | null
    active: boolean
    created_at: string
    total_discount_given: number
    orders_count: number
}

export default function CouponsPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [coupons, setCoupons] = useState<Coupon[]>([])
    const [loading, setLoading] = useState(true)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        fetchCoupons()
    }, [])

    const fetchCoupons = async () => {
        try {
            const response = await fetch('/api/dashboard/coupons')
            const data = await response.json()
            if (data.success) {
                setCoupons(data.coupons)
            }
        } catch (error) {
            console.error('Failed to fetch coupons:', error)
            toast({
                title: 'Error',
                description: 'Failed to load coupons',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteId) return

        setDeleting(true)
        try {
            const response = await fetch(`/api/dashboard/coupons/${deleteId}`, {
                method: 'DELETE'
            })
            const data = await response.json()

            if (data.success) {
                setCoupons(coupons.filter(c => c.id !== deleteId))
                toast({
                    title: 'Coupon Deleted',
                    description: 'The coupon has been deleted successfully'
                })
            } else {
                throw new Error(data.error)
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete coupon',
                variant: 'destructive'
            })
        } finally {
            setDeleting(false)
            setDeleteId(null)
        }
    }

    const toggleActive = async (coupon: Coupon) => {
        try {
            const response = await fetch(`/api/dashboard/coupons/${coupon.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !coupon.active })
            })
            const data = await response.json()

            if (data.success) {
                setCoupons(coupons.map(c =>
                    c.id === coupon.id ? { ...c, active: !c.active } : c
                ))
                toast({
                    title: coupon.active ? 'Coupon Deactivated' : 'Coupon Activated',
                    description: `${coupon.code} is now ${coupon.active ? 'inactive' : 'active'}`
                })
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update coupon',
                variant: 'destructive'
            })
        }
    }

    const getDiscountIcon = (type: string) => {
        switch (type) {
            case 'percentage':
                return <Percent className="w-4 h-4" />
            case 'fixed_amount':
                return <DollarSign className="w-4 h-4" />
            case 'free_shipping':
                return <Truck className="w-4 h-4" />
            default:
                return null
        }
    }

    const formatDiscount = (coupon: Coupon) => {
        switch (coupon.discount_type) {
            case 'percentage':
                return `${coupon.discount_value}% off`
            case 'fixed_amount':
                return `₹${coupon.discount_value.toLocaleString()} off`
            case 'free_shipping':
                return 'Free Shipping'
            default:
                return ''
        }
    }

    const getCouponStatus = (coupon: Coupon) => {
        if (!coupon.active) return { label: 'Inactive', variant: 'secondary' as const }

        const now = new Date()
        if (coupon.expires_at && new Date(coupon.expires_at) < now) {
            return { label: 'Expired', variant: 'destructive' as const }
        }
        if (coupon.starts_at && new Date(coupon.starts_at) > now) {
            return { label: 'Scheduled', variant: 'outline' as const }
        }
        if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
            return { label: 'Limit Reached', variant: 'secondary' as const }
        }

        return { label: 'Active', variant: 'default' as const }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Coupons</h1>
                    <p className="text-muted-foreground">
                        Create and manage discount coupons for your store
                    </p>
                </div>
                <Link href="/dashboard/coupons/create">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Coupon
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Coupons</CardDescription>
                        <CardTitle className="text-3xl">{coupons.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Active Coupons</CardDescription>
                        <CardTitle className="text-3xl">
                            {coupons.filter(c => c.active).length}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Discount Given</CardDescription>
                        <CardTitle className="text-3xl">
                            ₹{coupons.reduce((sum, c) => sum + c.total_discount_given, 0).toLocaleString()}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Coupons Table */}
            {coupons.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Percent className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No Coupons Yet</h3>
                        <p className="text-muted-foreground text-center max-w-md mb-4">
                            Create your first coupon to start offering discounts to your customers
                        </p>
                        <Link href="/dashboard/coupons/create">
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Your First Coupon
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Discount</TableHead>
                                <TableHead>Usage</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {coupons.map((coupon) => {
                                const status = getCouponStatus(coupon)
                                return (
                                    <TableRow key={coupon.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                                    {getDiscountIcon(coupon.discount_type)}
                                                </div>
                                                <div>
                                                    <p className="font-mono font-semibold">{coupon.code}</p>
                                                    {coupon.description && (
                                                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                                            {coupon.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{formatDiscount(coupon)}</p>
                                                {coupon.minimum_order_value && (
                                                    <p className="text-sm text-muted-foreground">
                                                        Min: ₹{coupon.minimum_order_value.toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p>
                                                {coupon.usage_count} / {coupon.usage_limit || '∞'}
                                            </p>
                                            {coupon.total_discount_given > 0 && (
                                                <p className="text-sm text-muted-foreground">
                                                    ₹{coupon.total_discount_given.toLocaleString()} saved
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {coupon.expires_at
                                                ? format(new Date(coupon.expires_at), 'MMM dd, yyyy')
                                                : 'No expiry'
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={status.variant}>{status.label}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => router.push(`/dashboard/coupons/${coupon.id}`)}
                                                    >
                                                        <Pencil className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => toggleActive(coupon)}>
                                                        {coupon.active ? 'Deactivate' : 'Activate'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-red-600"
                                                        onClick={() => setDeleteId(coupon.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this coupon? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
