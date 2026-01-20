'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
    FileSpreadsheet,
    Download,
    Calendar,
    TrendingUp,
    Package,
    Receipt,
    Loader2,
    FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

interface ReportSummary {
    total_orders?: number
    total_sales?: number
    total_revenue?: number
    taxable_amount?: number
    total_tax?: number
    cgst?: number
    sgst?: number
    net_revenue?: number
    average_order_value?: number
    unique_products?: number
    total_units_sold?: number
}

interface OrderRow {
    id: string
    created_at: string
    order_number: string
    invoice_number: string
    customer_name: string
    subtotal: number
    cgst: number
    sgst: number
    total_amount: number
}

interface DailySales {
    date: string
    orders: number
    revenue: number
    tax: number
}

interface ProductSales {
    product_id: string
    product_title: string
    quantity_sold: number
    total_revenue: number
}

interface ReportData {
    report_type: string
    summary: ReportSummary
    orders?: OrderRow[]
    daily_sales?: DailySales[]
    products?: ProductSales[]
}

export default function ReportsPage() {
    const [reportType, setReportType] = useState('gst')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [loading, setLoading] = useState(false)
    const [reportData, setReportData] = useState<ReportData | null>(null)

    const generateReport = async () => {
        if (!startDate || !endDate) {
            toast.error('Please select date range')
            return
        }

        setLoading(true)
        try {
            const response = await fetch('/api/dashboard/reports/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: reportType,
                    start_date: startDate,
                    end_date: endDate
                })
            })

            if (!response.ok) throw new Error('Failed to generate report')

            const data = await response.json()
            setReportData(data)
            toast.success('Report generated successfully')
        } catch (error) {
            console.error('Report generation failed:', error)
            toast.error('Failed to generate report')
        } finally {
            setLoading(false)
        }
    }

    const exportToExcel = () => {
        if (!reportData) return

        let data: any[] = []
        let sheetName = 'Report'

        if (reportData.report_type === 'gst' && reportData.orders) {
            sheetName = 'GST Report'
            data = reportData.orders.map(o => ({
                'Date': format(new Date(o.created_at), 'dd/MM/yyyy'),
                'Invoice': o.invoice_number,
                'Order': o.order_number,
                'Customer': o.customer_name,
                'Subtotal': o.subtotal,
                'CGST (9%)': o.cgst,
                'SGST (9%)': o.sgst,
                'Total': o.total_amount
            }))
        } else if (reportData.report_type === 'sales' && reportData.daily_sales) {
            sheetName = 'Sales Report'
            data = reportData.daily_sales.map(d => ({
                'Date': format(new Date(d.date), 'dd/MM/yyyy'),
                'Orders': d.orders,
                'Revenue': d.revenue,
                'Tax': d.tax
            }))
        } else if (reportData.report_type === 'products' && reportData.products) {
            sheetName = 'Product Sales'
            data = reportData.products.map(p => ({
                'Product': p.product_title,
                'Quantity Sold': p.quantity_sold,
                'Revenue': p.total_revenue
            }))
        }

        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
        XLSX.writeFile(workbook, `${sheetName.replace(' ', '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)

        toast.success('Excel file downloaded')
    }

    const exportToCSV = () => {
        if (!reportData) return

        let csvContent = ''

        if (reportData.report_type === 'gst' && reportData.orders) {
            csvContent = 'Date,Invoice,Order,Customer,Subtotal,CGST,SGST,Total\n'
            csvContent += reportData.orders.map(o =>
                `${format(new Date(o.created_at), 'dd/MM/yyyy')},${o.invoice_number},${o.order_number},${o.customer_name},${o.subtotal},${o.cgst},${o.sgst},${o.total_amount}`
            ).join('\n')
        } else if (reportData.report_type === 'sales' && reportData.daily_sales) {
            csvContent = 'Date,Orders,Revenue,Tax\n'
            csvContent += reportData.daily_sales.map(d =>
                `${format(new Date(d.date), 'dd/MM/yyyy')},${d.orders},${d.revenue},${d.tax}`
            ).join('\n')
        } else if (reportData.report_type === 'products' && reportData.products) {
            csvContent = 'Product,Quantity Sold,Revenue\n'
            csvContent += reportData.products.map(p =>
                `"${p.product_title}",${p.quantity_sold},${p.total_revenue}`
            ).join('\n')
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `report_${format(new Date(), 'yyyy-MM-dd')}.csv`
        a.click()
        URL.revokeObjectURL(url)

        toast.success('CSV file downloaded')
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Financial Reports</h1>
                <p className="text-muted-foreground">Generate GST and sales reports for your store</p>
            </div>

            {/* Report Generator */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Generate Report
                    </CardTitle>
                    <CardDescription>Select report type and date range</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Report Type</Label>
                            <Select value={reportType} onValueChange={setReportType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gst">
                                        <div className="flex items-center gap-2">
                                            <Receipt className="h-4 w-4" />
                                            GST Report
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="sales">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4" />
                                            Sales by Date
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="products">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4" />
                                            Sales by Product
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>

                    <Button onClick={generateReport} disabled={loading} className="w-full md:w-auto">
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <FileText className="h-4 w-4 mr-2" />
                                Generate Report
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Report Results */}
            {reportData && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>
                                {reportData.report_type === 'gst' && 'GST Report'}
                                {reportData.report_type === 'sales' && 'Sales Report'}
                                {reportData.report_type === 'products' && 'Product Sales Report'}
                            </CardTitle>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={exportToCSV}>
                                    <Download className="h-4 w-4 mr-2" />
                                    CSV
                                </Button>
                                <Button variant="outline" size="sm" onClick={exportToExcel}>
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    Excel
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {reportData.summary.total_orders !== undefined && (
                                <div className="bg-muted rounded-lg p-4">
                                    <p className="text-sm text-muted-foreground">Total Orders</p>
                                    <p className="text-2xl font-bold">{reportData.summary.total_orders}</p>
                                </div>
                            )}
                            {(reportData.summary.total_sales || reportData.summary.total_revenue) && (
                                <div className="bg-muted rounded-lg p-4">
                                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                                    <p className="text-2xl font-bold">
                                        {formatCurrency(reportData.summary.total_sales || reportData.summary.total_revenue || 0)}
                                    </p>
                                </div>
                            )}
                            {reportData.summary.total_tax !== undefined && (
                                <div className="bg-muted rounded-lg p-4">
                                    <p className="text-sm text-muted-foreground">Total Tax</p>
                                    <p className="text-2xl font-bold">{formatCurrency(reportData.summary.total_tax)}</p>
                                </div>
                            )}
                            {reportData.summary.cgst !== undefined && (
                                <div className="bg-muted rounded-lg p-4">
                                    <p className="text-sm text-muted-foreground">CGST + SGST</p>
                                    <p className="text-2xl font-bold">
                                        {formatCurrency(reportData.summary.cgst)} + {formatCurrency(reportData.summary.sgst || 0)}
                                    </p>
                                </div>
                            )}
                            {reportData.summary.average_order_value !== undefined && (
                                <div className="bg-muted rounded-lg p-4">
                                    <p className="text-sm text-muted-foreground">Avg Order Value</p>
                                    <p className="text-2xl font-bold">{formatCurrency(reportData.summary.average_order_value)}</p>
                                </div>
                            )}
                            {reportData.summary.total_units_sold !== undefined && (
                                <div className="bg-muted rounded-lg p-4">
                                    <p className="text-sm text-muted-foreground">Units Sold</p>
                                    <p className="text-2xl font-bold">{reportData.summary.total_units_sold}</p>
                                </div>
                            )}
                        </div>

                        {/* GST Report Table */}
                        {reportData.report_type === 'gst' && reportData.orders && (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Invoice</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                            <TableHead className="text-right">CGST (9%)</TableHead>
                                            <TableHead className="text-right">SGST (9%)</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportData.orders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell>{format(new Date(order.created_at), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="font-mono text-sm">{order.invoice_number}</TableCell>
                                                <TableCell>{order.customer_name}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(order.subtotal)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(order.cgst)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(order.sgst)}</TableCell>
                                                <TableCell className="text-right font-semibold">{formatCurrency(order.total_amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Sales by Date Table */}
                        {reportData.report_type === 'sales' && reportData.daily_sales && (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Orders</TableHead>
                                            <TableHead className="text-right">Revenue</TableHead>
                                            <TableHead className="text-right">Tax</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportData.daily_sales.map((day) => (
                                            <TableRow key={day.date}>
                                                <TableCell>{format(new Date(day.date), 'dd MMM yyyy')}</TableCell>
                                                <TableCell className="text-right">{day.orders}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(day.revenue)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(day.tax)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Product Sales Table */}
                        {reportData.report_type === 'products' && reportData.products && (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">Quantity Sold</TableHead>
                                            <TableHead className="text-right">Revenue</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportData.products.map((product) => (
                                            <TableRow key={product.product_id}>
                                                <TableCell>{product.product_title}</TableCell>
                                                <TableCell className="text-right">{product.quantity_sold}</TableCell>
                                                <TableCell className="text-right font-semibold">{formatCurrency(product.total_revenue)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Empty State */}
                        {((reportData.orders && reportData.orders.length === 0) ||
                            (reportData.daily_sales && reportData.daily_sales.length === 0) ||
                            (reportData.products && reportData.products.length === 0)) && (
                                <p className="text-center text-muted-foreground py-8">
                                    No data found for the selected date range
                                </p>
                            )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
