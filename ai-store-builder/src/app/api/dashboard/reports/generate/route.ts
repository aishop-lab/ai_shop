import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { type, start_date, end_date } = body

        // Get user's store
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id')
            .eq('owner_id', user.id)
            .single()

        if (storeError || !store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        // Build query for orders in date range
        let query = supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('store_id', store.id)
            .eq('payment_status', 'paid')
            .order('created_at', { ascending: false })

        if (start_date) {
            query = query.gte('created_at', start_date)
        }
        if (end_date) {
            query = query.lte('created_at', `${end_date}T23:59:59`)
        }

        const { data: orders, error: ordersError } = await query

        if (ordersError) {
            console.error('Error fetching orders:', ordersError)
            return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
        }

        if (type === 'gst') {
            return NextResponse.json(generateGSTReport(orders || []))
        } else if (type === 'sales') {
            return NextResponse.json(generateSalesReport(orders || []))
        } else if (type === 'products') {
            return NextResponse.json(generateProductReport(orders || []))
        }

        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })

    } catch (error) {
        console.error('Report generation error:', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}

function generateGSTReport(orders: any[]) {
    const totalSales = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const totalTax = orders.reduce((sum, o) => sum + (o.tax_amount || 0), 0)
    const totalSubtotal = orders.reduce((sum, o) => sum + (o.subtotal || 0), 0)
    const totalShipping = orders.reduce((sum, o) => sum + (o.shipping_cost || 0), 0)
    const totalDiscount = orders.reduce((sum, o) => sum + (o.discount_amount || 0), 0)
    const cgst = totalTax / 2
    const sgst = totalTax / 2

    const ordersWithTax = orders.map(order => ({
        id: order.id,
        created_at: order.created_at,
        order_number: order.order_number,
        invoice_number: order.invoice_number || `INV-${order.order_number?.replace('ORD-', '')}`,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        subtotal: order.subtotal || 0,
        shipping_cost: order.shipping_cost || 0,
        tax_amount: order.tax_amount || 0,
        cgst: (order.tax_amount || 0) / 2,
        sgst: (order.tax_amount || 0) / 2,
        discount_amount: order.discount_amount || 0,
        total_amount: order.total_amount || 0,
        payment_method: order.payment_method,
        payment_status: order.payment_status
    }))

    return {
        report_type: 'gst',
        summary: {
            total_orders: orders.length,
            total_sales: totalSales,
            taxable_amount: totalSubtotal,
            total_tax: totalTax,
            cgst,
            sgst,
            total_shipping: totalShipping,
            total_discount: totalDiscount,
            net_revenue: totalSales
        },
        orders: ordersWithTax
    }
}

function generateSalesReport(orders: any[]) {
    // Group by date
    const salesByDate: Record<string, { date: string; orders: number; revenue: number; tax: number }> = {}

    orders.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        if (!salesByDate[date]) {
            salesByDate[date] = { date, orders: 0, revenue: 0, tax: 0 }
        }
        salesByDate[date].orders++
        salesByDate[date].revenue += order.total_amount || 0
        salesByDate[date].tax += order.tax_amount || 0
    })

    const dailySales = Object.values(salesByDate).sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const totalTax = orders.reduce((sum, o) => sum + (o.tax_amount || 0), 0)
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0

    return {
        report_type: 'sales',
        summary: {
            total_orders: orders.length,
            total_revenue: totalRevenue,
            total_tax: totalTax,
            average_order_value: avgOrderValue
        },
        daily_sales: dailySales
    }
}

function generateProductReport(orders: any[]) {
    // Aggregate by product
    const productSales: Record<string, {
        product_id: string
        product_title: string
        quantity_sold: number
        total_revenue: number
    }> = {}

    orders.forEach(order => {
        const items = order.order_items || []
        items.forEach((item: any) => {
            const key = item.product_id
            if (!productSales[key]) {
                productSales[key] = {
                    product_id: item.product_id,
                    product_title: item.product_title,
                    quantity_sold: 0,
                    total_revenue: 0
                }
            }
            productSales[key].quantity_sold += item.quantity
            productSales[key].total_revenue += item.total_price || 0
        })
    })

    const products = Object.values(productSales).sort((a, b) => b.total_revenue - a.total_revenue)
    const totalRevenue = products.reduce((sum, p) => sum + p.total_revenue, 0)
    const totalUnits = products.reduce((sum, p) => sum + p.quantity_sold, 0)

    return {
        report_type: 'products',
        summary: {
            unique_products: products.length,
            total_units_sold: totalUnits,
            total_revenue: totalRevenue
        },
        products
    }
}
