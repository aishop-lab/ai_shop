// Dashboard Types for Seller Dashboard

import type { Order, OrderItem } from './order'
import type { Product } from './store'

export interface DashboardAnalytics {
  overview: {
    revenue: number
    orders: number
    paidOrders: number
    pendingOrders: number
    products: number
    averageOrderValue: number
  }
  topSellingProducts: TopSellingProduct[]
  lowStockProducts: LowStockProduct[]
  recentOrders: Order[]
  revenueTrend: RevenueTrendItem[]
}

export interface TopSellingProduct {
  product_id: string
  product_title: string
  product_image?: string
  quantity: number
  revenue: number
}

export interface LowStockProduct {
  id: string
  title: string
  quantity: number
}

export interface RevenueTrendItem {
  date: string
  revenue: number
  orders: number
}

export interface OrdersListResponse {
  orders: Order[]
  total: number
  page: number
  totalPages: number
}

export interface ProductsListResponse {
  products: Product[]
  total: number
  page: number
  totalPages: number
}

export type BulkAction = 'update_status' | 'delete' | 'feature' | 'unfeature' | 'archive' | 'restore'
export type BulkResource = 'products' | 'orders'

export interface BulkActionRequest {
  action: BulkAction
  resource: BulkResource
  ids: string[]
  data?: {
    status?: string
    featured?: boolean
  }
}

export interface BulkActionResponse {
  success: boolean
  updated: number
  error?: string
}

export interface ExportRequest {
  store_id: string
  type: 'orders' | 'products'
  format: 'csv' | 'json'
  startDate?: string
  endDate?: string
}

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '1y'

export interface OrderUpdateRequest {
  order_status?: string
  tracking_number?: string
  courier_name?: string
  notes?: string
}

export interface StoreSettingsUpdate {
  store_id: string
  settings: {
    shipping?: {
      flat_rate_national?: number
      flat_rate_local?: number
      free_shipping_threshold?: number
      cod_enabled?: boolean
      cod_fee?: number
    }
    seo?: {
      meta_title?: string
      meta_description?: string
    }
    notifications?: {
      order_email?: boolean
      low_stock_alert?: boolean
      low_stock_threshold?: number
    }
    checkout?: {
      guest_checkout?: boolean
      phone_required?: boolean
    }
  }
}
