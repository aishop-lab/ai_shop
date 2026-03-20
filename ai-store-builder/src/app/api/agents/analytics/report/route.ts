// src/app/api/agents/analytics/report/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateRequest, jsonError, jsonSuccess } from '@/lib/agents/auth'
import { generateReport } from '@/lib/agents/analytics/report-generator'

export const runtime = 'nodejs'
export const maxDuration = 300

const VALID_REPORT_TYPES = ['daily_digest', 'weekly_report'] as const
type ReportType = (typeof VALID_REPORT_TYPES)[number]

/**
 * POST /api/agents/analytics/report
 * Triggers on-demand report generation for the authenticated user's store.
 * Body: { type: 'daily_digest' | 'weekly_report' }
 */
export async function POST(req: NextRequest) {
  // Authenticate user (Bearer token first, then cookie)
  const auth = await authenticateRequest(req)
  if (!auth.user) {
    return jsonError(auth.error || 'Unauthorized', auth.status)
  }

  const userId = auth.user.id
  const admin = getSupabaseAdmin()

  // Look up user's store
  const { data: store, error: storeError } = await admin
    .from('stores')
    .select('id')
    .eq('owner_id', userId)
    .single()

  if (storeError || !store) {
    return jsonError('Store not found', 404)
  }

  const storeId = store.id

  // Parse request body
  let body: { type?: string }
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const reportType = body.type
  if (!reportType || !VALID_REPORT_TYPES.includes(reportType as ReportType)) {
    return jsonError(
      `Invalid report type. Must be one of: ${VALID_REPORT_TYPES.join(', ')}`,
      400
    )
  }

  try {
    const report = await generateReport(storeId, reportType as ReportType)

    return jsonSuccess({
      storeId,
      type: reportType,
      report,
    })
  } catch (error) {
    console.error(`[Analytics Report] Failed to generate ${reportType}:`, error)
    return jsonError(
      `Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    )
  }
}
