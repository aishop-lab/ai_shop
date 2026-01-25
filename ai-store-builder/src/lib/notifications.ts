/**
 * Notification Service for StoreForge
 *
 * Provides real-time notifications for merchants using Supabase Realtime.
 * Supports new order alerts, low stock warnings, and other business events.
 */

import { createClient } from '@/lib/supabase/server'

// Notification types
export type NotificationType =
  | 'new_order'
  | 'order_paid'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'low_stock'
  | 'out_of_stock'
  | 'new_review'
  | 'refund_requested'
  | 'payment_failed'
  | 'system'

// Notification priority
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

// Notification interface
export interface Notification {
  id?: string
  store_id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  data?: Record<string, unknown> // Additional data (order ID, product ID, etc.)
  read: boolean
  created_at?: string
  updated_at?: string
}

// Notification preferences
export interface NotificationPreferences {
  email_new_order: boolean
  email_low_stock: boolean
  email_new_review: boolean
  email_daily_summary: boolean
  push_enabled: boolean
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email_new_order: true,
  email_low_stock: true,
  email_new_review: true,
  email_daily_summary: true,
  push_enabled: false
}

/**
 * Create a notification in the database
 */
export async function createNotification(
  notification: Omit<Notification, 'id' | 'read' | 'created_at' | 'updated_at'>
): Promise<Notification | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        ...notification,
        read: false
      })
      .select()
      .single()

    if (error) {
      console.error('[Notifications] Failed to create notification:', error)
      return null
    }

    return data as Notification
  } catch (error) {
    console.error('[Notifications] Error creating notification:', error)
    return null
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(
  userId: string,
  limit: number = 20
): Promise<Notification[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[Notifications] Failed to get notifications:', error)
      return []
    }

    return (data || []) as Notification[]
  } catch (error) {
    console.error('[Notifications] Error getting notifications:', error)
    return []
  }
}

/**
 * Get all notifications for a user (paginated)
 */
export async function getNotifications(
  userId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ notifications: Notification[]; total: number }> {
  const { page = 1, limit = 20 } = options

  try {
    const supabase = await createClient()
    const offset = (page - 1) * limit

    const { data, count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Notifications] Failed to get notifications:', error)
      return { notifications: [], total: 0 }
    }

    return {
      notifications: (data || []) as Notification[],
      total: count || 0
    }
  } catch (error) {
    console.error('[Notifications] Error getting notifications:', error)
    return { notifications: [], total: 0 }
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) {
      console.error('[Notifications] Failed to mark as read:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Notifications] Error marking as read:', error)
    return false
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) {
      console.error('[Notifications] Failed to mark all as read:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Notifications] Error marking all as read:', error)
    return false
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) {
      console.error('[Notifications] Failed to delete notification:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Notifications] Error deleting notification:', error)
    return false
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) {
      console.error('[Notifications] Failed to get unread count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('[Notifications] Error getting unread count:', error)
    return 0
  }
}

// Notification builder helpers

/**
 * Create a new order notification
 */
export async function notifyNewOrder(params: {
  storeId: string
  userId: string
  orderNumber: string
  customerName: string
  totalAmount: number
  currency?: string
}): Promise<Notification | null> {
  const { storeId, userId, orderNumber, customerName, totalAmount, currency = 'INR' } = params

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency
  }).format(totalAmount)

  return createNotification({
    store_id: storeId,
    user_id: userId,
    type: 'new_order',
    title: 'New Order Received',
    message: `${customerName} placed an order for ${formattedAmount}`,
    priority: 'high',
    data: {
      order_number: orderNumber,
      customer_name: customerName,
      total_amount: totalAmount
    }
  })
}

/**
 * Create a low stock notification
 */
export async function notifyLowStock(params: {
  storeId: string
  userId: string
  productId: string
  productTitle: string
  currentStock: number
  threshold: number
}): Promise<Notification | null> {
  const { storeId, userId, productId, productTitle, currentStock, threshold } = params

  return createNotification({
    store_id: storeId,
    user_id: userId,
    type: 'low_stock',
    title: 'Low Stock Alert',
    message: `"${productTitle}" has only ${currentStock} units left (threshold: ${threshold})`,
    priority: currentStock === 0 ? 'urgent' : 'high',
    data: {
      product_id: productId,
      product_title: productTitle,
      current_stock: currentStock,
      threshold
    }
  })
}

/**
 * Create an out of stock notification
 */
export async function notifyOutOfStock(params: {
  storeId: string
  userId: string
  productId: string
  productTitle: string
}): Promise<Notification | null> {
  const { storeId, userId, productId, productTitle } = params

  return createNotification({
    store_id: storeId,
    user_id: userId,
    type: 'out_of_stock',
    title: 'Product Out of Stock',
    message: `"${productTitle}" is now out of stock`,
    priority: 'urgent',
    data: {
      product_id: productId,
      product_title: productTitle
    }
  })
}

/**
 * Create a new review notification
 */
export async function notifyNewReview(params: {
  storeId: string
  userId: string
  productId: string
  productTitle: string
  rating: number
  reviewerName: string
}): Promise<Notification | null> {
  const { storeId, userId, productId, productTitle, rating, reviewerName } = params

  return createNotification({
    store_id: storeId,
    user_id: userId,
    type: 'new_review',
    title: 'New Product Review',
    message: `${reviewerName} left a ${rating}-star review for "${productTitle}"`,
    priority: rating <= 2 ? 'high' : 'normal',
    data: {
      product_id: productId,
      product_title: productTitle,
      rating,
      reviewer_name: reviewerName
    }
  })
}

/**
 * Create a payment failed notification
 */
export async function notifyPaymentFailed(params: {
  storeId: string
  userId: string
  orderNumber: string
  reason?: string
}): Promise<Notification | null> {
  const { storeId, userId, orderNumber, reason } = params

  return createNotification({
    store_id: storeId,
    user_id: userId,
    type: 'payment_failed',
    title: 'Payment Failed',
    message: `Payment for order #${orderNumber} failed${reason ? `: ${reason}` : ''}`,
    priority: 'high',
    data: {
      order_number: orderNumber,
      reason
    }
  })
}

/**
 * Create a refund requested notification
 */
export async function notifyRefundRequested(params: {
  storeId: string
  userId: string
  orderNumber: string
  amount: number
  reason?: string
}): Promise<Notification | null> {
  const { storeId, userId, orderNumber, amount, reason } = params

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount)

  return createNotification({
    store_id: storeId,
    user_id: userId,
    type: 'refund_requested',
    title: 'Refund Requested',
    message: `Refund of ${formattedAmount} requested for order #${orderNumber}`,
    priority: 'high',
    data: {
      order_number: orderNumber,
      amount,
      reason
    }
  })
}

/**
 * Create a system notification
 */
export async function notifySystem(params: {
  storeId: string
  userId: string
  title: string
  message: string
  priority?: NotificationPriority
}): Promise<Notification | null> {
  const { storeId, userId, title, message, priority = 'normal' } = params

  return createNotification({
    store_id: storeId,
    user_id: userId,
    type: 'system',
    title,
    message,
    priority
  })
}

// Export notification preferences utilities

// NotificationPreferences is already exported inline
export { DEFAULT_PREFERENCES }
