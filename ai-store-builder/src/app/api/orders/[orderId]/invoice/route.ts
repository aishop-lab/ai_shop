import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

interface RouteParams {
    params: Promise<{ orderId: string }>
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { orderId } = await params

        // Fetch order with items
        const { data: order, error: orderError } = await getSupabaseAdmin()
            .from('orders')
            .select(`
        *,
        order_items (*)
      `)
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Fetch store details
        const { data: store, error: storeError } = await getSupabaseAdmin()
            .from('stores')
            .select('*')
            .eq('id', order.store_id)
            .single()

        if (storeError || !store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        // Generate invoice number if not exists
        let invoiceNumber = order.invoice_number
        if (!invoiceNumber) {
            invoiceNumber = `INV-${new Date().getFullYear()}-${order.order_number.replace('ORD-', '')}`
            await getSupabaseAdmin()
                .from('orders')
                .update({ invoice_number: invoiceNumber })
                .eq('id', orderId)
        }

        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(order, store, invoiceNumber)

        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice_${order.order_number}.pdf"`,
                'Cache-Control': 'no-cache'
            }
        })

    } catch (error) {
        console.error('Invoice generation error:', error)
        return NextResponse.json(
            { error: 'Failed to generate invoice' },
            { status: 500 }
        )
    }
}

async function generateInvoicePDF(
    order: any,
    store: any,
    invoiceNumber: string
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 })
        const chunks: Buffer[] = []

        doc.on('data', (chunk: Buffer) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        const pageWidth = 595.28 // A4 width in points
        const margin = 50
        const contentWidth = pageWidth - (margin * 2)

        // Header - TAX INVOICE
        doc.fontSize(20).font('Helvetica-Bold')
        doc.text('TAX INVOICE', { align: 'center' })
        doc.moveDown(1.5)

        // Store Details (Left side)
        const storeY = doc.y
        doc.fontSize(14).font('Helvetica-Bold')
        doc.text(store.name, margin, storeY)
        doc.fontSize(10).font('Helvetica')
        doc.text(`GSTIN: ${store.gstin || 'Not Registered'}`, margin, doc.y + 5)
        if (store.pan) {
            doc.text(`PAN: ${store.pan}`)
        }
        if (store.business_address) {
            doc.text(store.business_address)
        } else if (store.contact_email) {
            doc.text(`Email: ${store.contact_email}`)
        }

        // Invoice Details (Right side)
        const invoiceDetailsX = pageWidth - margin - 150
        doc.fontSize(10).font('Helvetica')
        doc.text(`Invoice #: ${invoiceNumber}`, invoiceDetailsX, storeY)
        doc.text(`Date: ${formatDate(order.created_at)}`, invoiceDetailsX, doc.y)
        doc.text(`Order #: ${order.order_number}`, invoiceDetailsX, doc.y)

        doc.moveDown(3)

        // Bill To Section
        doc.fontSize(12).font('Helvetica-Bold')
        doc.text('BILL TO:', margin, doc.y)
        doc.fontSize(10).font('Helvetica')
        doc.text(order.customer_name)

        const address = order.shipping_address
        if (address) {
            doc.text(address.address_line1)
            if (address.address_line2) {
                doc.text(address.address_line2)
            }
            doc.text(`${address.city}, ${address.state} ${address.pincode}`)
            doc.text(`Phone: ${address.phone}`)
        }

        doc.moveDown(2)

        // Items Table
        const tableTop = doc.y
        const tableHeaders = ['#', 'Item', 'HSN', 'Qty', 'Rate (₹)', 'Amount (₹)']
        const colWidths = [30, 200, 60, 40, 80, 80]

        // Table Header
        doc.rect(margin, tableTop, contentWidth, 25).fill('#f3f4f6')
        doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')

        let xPos = margin + 5
        tableHeaders.forEach((header, i) => {
            doc.text(header, xPos, tableTop + 8, { width: colWidths[i] - 10 })
            xPos += colWidths[i]
        })

        // Table Rows
        let yPos = tableTop + 30
        doc.font('Helvetica').fontSize(9)

        const orderItems = order.order_items || []
        orderItems.forEach((item: any, index: number) => {
            xPos = margin + 5
            const rowData = [
                (index + 1).toString(),
                item.product_title || 'Product',
                item.hsn_code || '6204',
                item.quantity.toString(),
                formatCurrency(item.unit_price),
                formatCurrency(item.total_price)
            ]

            rowData.forEach((text, i) => {
                doc.text(text, xPos, yPos, { width: colWidths[i] - 10 })
                xPos += colWidths[i]
            })

            yPos += 25

            // Draw row border
            doc.moveTo(margin, yPos - 5).lineTo(margin + contentWidth, yPos - 5).stroke('#e5e7eb')
        })

        doc.y = yPos + 10

        // Totals Section
        const totalsX = pageWidth - margin - 180
        const labelsX = totalsX
        const valuesX = pageWidth - margin - 80

        doc.fontSize(10).font('Helvetica')

        // Subtotal
        doc.text('Subtotal:', labelsX, doc.y)
        doc.text(formatCurrency(order.subtotal), valuesX, doc.y - doc.currentLineHeight())
        doc.moveDown(0.5)

        // Shipping
        if (order.shipping_cost > 0) {
            doc.text('Shipping:', labelsX, doc.y)
            doc.text(formatCurrency(order.shipping_cost), valuesX, doc.y - doc.currentLineHeight())
            doc.moveDown(0.5)
        }

        // Tax breakdown
        if (order.tax_amount > 0) {
            const cgst = order.tax_amount / 2
            const sgst = order.tax_amount / 2

            doc.text('CGST (9%):', labelsX, doc.y)
            doc.text(formatCurrency(cgst), valuesX, doc.y - doc.currentLineHeight())
            doc.moveDown(0.5)

            doc.text('SGST (9%):', labelsX, doc.y)
            doc.text(formatCurrency(sgst), valuesX, doc.y - doc.currentLineHeight())
            doc.moveDown(0.5)
        }

        // Discount
        if (order.discount_amount > 0) {
            doc.text('Discount:', labelsX, doc.y)
            doc.text(`-${formatCurrency(order.discount_amount)}`, valuesX, doc.y - doc.currentLineHeight())
            doc.moveDown(0.5)
        }

        // Total
        doc.moveDown(0.5)
        doc.rect(labelsX - 5, doc.y - 5, 185, 25).fill('#f3f4f6')
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(12)
        doc.text('TOTAL:', labelsX, doc.y)
        doc.text(`₹${formatCurrency(order.total_amount)}`, valuesX - 10, doc.y - doc.currentLineHeight())

        doc.moveDown(2)

        // Amount in words
        doc.font('Helvetica').fontSize(10)
        doc.text(`Amount in words: ${numberToWords(Math.round(order.total_amount))} Rupees Only`, margin, doc.y)

        // Payment Status
        doc.moveDown(1)
        const paymentStatus = order.payment_status === 'paid' ? 'PAID' : 'PENDING'
        doc.text(`Payment Status: ${paymentStatus}`, margin, doc.y)
        doc.text(`Payment Method: ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}`)

        // Footer
        doc.moveDown(3)
        doc.fontSize(8).fillColor('#6b7280')
        doc.text(
            'This is a computer-generated invoice and does not require a signature.',
            { align: 'center' }
        )
        doc.text(
            `Generated on ${formatDate(new Date().toISOString())}`,
            { align: 'center' }
        )

        doc.end()
    })
}

function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    })
}

function formatCurrency(amount: number): string {
    return amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}

function numberToWords(num: number): string {
    if (num === 0) return 'Zero'

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

    function convertLessThanThousand(n: number): string {
        if (n === 0) return ''
        if (n < 20) return ones[n]
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '')
    }

    if (num < 1000) return convertLessThanThousand(num)
    if (num < 100000) {
        return convertLessThanThousand(Math.floor(num / 1000)) + ' Thousand' +
            (num % 1000 ? ' ' + convertLessThanThousand(num % 1000) : '')
    }
    if (num < 10000000) {
        return convertLessThanThousand(Math.floor(num / 100000)) + ' Lakh' +
            (num % 100000 ? ' ' + numberToWords(num % 100000) : '')
    }
    return convertLessThanThousand(Math.floor(num / 10000000)) + ' Crore' +
        (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '')
}
