'use client'

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface RevenueTrendData {
  date: string
  revenue: number
  orders: number
}

interface PlatformRevenueChartProps {
  data: RevenueTrendData[]
}

export function PlatformRevenueChart({ data }: PlatformRevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No revenue data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorPlatformRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="#52525b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => {
            const date = new Date(value)
            return `${date.getMonth() + 1}/${date.getDate()}`
          }}
        />
        <YAxis
          stroke="#52525b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => {
            if (value >= 100000) {
              return `₹${(value / 100000).toFixed(1)}L`
            }
            if (value >= 1000) {
              return `₹${(value / 1000).toFixed(0)}k`
            }
            return `₹${value}`
          }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload as RevenueTrendData
              return (
                <div className="bg-zinc-900 border-zinc-700 text-zinc-100 p-3 border rounded-lg shadow-lg">
                  <p className="text-sm font-medium mb-1">
                    {new Date(data.date).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-blue-400 font-semibold">
                    Revenue: {formatCurrency(data.revenue, 'INR')}
                  </p>
                  <p className="text-sm text-zinc-400">
                    Orders: {data.orders}
                  </p>
                </div>
              )
            }
            return null
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#colorPlatformRevenue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
