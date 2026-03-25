/**
 * Admin Audit Log
 *
 * Tracks admin actions for accountability and compliance.
 * Inserts into `audit_logs` table if it exists; falls back to console logging.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'

export interface AuditLogEntry {
  admin_user_id: string
  action: string        // 'store_suspended', 'store_activated', 'store_updated', etc.
  entity_type: string   // 'store', 'seller', 'customer', 'order', 'product'
  entity_id: string
  details?: Record<string, unknown>
}

/**
 * Log an admin action to the audit_logs table.
 * If the table doesn't exist, logs to console as fallback.
 * Never throws — audit logging should not break admin operations.
 */
export async function logAdminAction(params: AuditLogEntry): Promise<void> {
  const entry = {
    ...params,
    created_at: new Date().toISOString(),
  }

  try {
    const { error } = await getSupabaseAdmin().from('audit_logs').insert(entry)

    if (error) {
      // Table likely doesn't exist yet — fall back to structured console log
      console.warn('[audit] DB insert failed (table may not exist):', error.message)
      console.info('[audit]', JSON.stringify(entry))
    }
  } catch (error) {
    // Network or unexpected error — still log to console
    console.error('[audit] Failed to log action:', error)
    console.info('[audit]', JSON.stringify(entry))
  }
}

/**
 * Fetch audit logs with pagination.
 * Returns empty array if the table doesn't exist.
 */
export async function getAuditLogs(options: {
  page?: number
  limit?: number
  action?: string
  entity_type?: string
}): Promise<{ logs: AuditLogRecord[]; total: number; tableExists: boolean }> {
  const { page = 1, limit = 50, action, entity_type } = options
  const offset = (page - 1) * limit

  try {
    let query = getSupabaseAdmin()
      .from('audit_logs')
      .select('*', { count: 'exact' })

    if (action) {
      query = query.eq('action', action)
    }

    if (entity_type) {
      query = query.eq('entity_type', entity_type)
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      // If table doesn't exist, return gracefully
      if (error.message.includes('relation') || error.code === '42P01') {
        return { logs: [], total: 0, tableExists: false }
      }
      console.error('[audit] Failed to fetch logs:', error)
      return { logs: [], total: 0, tableExists: false }
    }

    return {
      logs: (data || []) as AuditLogRecord[],
      total: count || 0,
      tableExists: true,
    }
  } catch {
    return { logs: [], total: 0, tableExists: false }
  }
}

export interface AuditLogRecord {
  id?: string
  admin_user_id: string
  action: string
  entity_type: string
  entity_id: string
  details?: Record<string, unknown>
  created_at: string
}
