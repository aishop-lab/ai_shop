// src/lib/agents/sales/campaign-engine.ts
// Campaign management using agent_memory as storage

import { storeMemory, getMemories, getMemoryByKey } from '../memory'
import type { CustomerSegment } from './segmentation'

export type CampaignType = 'cart_recovery' | 'win_back' | 'upsell' | 'flash_sale'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'

export interface CampaignStats {
  sent: number
  opened: number
  converted: number
  revenue: number
}

export interface Campaign {
  id: string
  store_id: string
  type: CampaignType
  name: string
  status: CampaignStatus
  target_segment?: CustomerSegment
  discount_percent?: number
  coupon_code?: string
  subject?: string
  message?: string
  start_at: string
  end_at?: string
  stats: CampaignStats
  created_at: string
}

export interface CreateCampaignInput {
  type: CampaignType
  name: string
  target_segment?: CustomerSegment
  discount_percent?: number
  coupon_code?: string
  subject?: string
  message?: string
  end_at?: string
}

const CAMPAIGN_KEY_PREFIX = 'campaign:'

function generateCampaignId(): string {
  return `camp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Create a new campaign, stored in agent_memory.
 */
export async function createCampaign(
  storeId: string,
  config: CreateCampaignInput
): Promise<Campaign> {
  const id = generateCampaignId()
  const now = new Date().toISOString()

  const campaign: Campaign = {
    id,
    store_id: storeId,
    type: config.type,
    name: config.name,
    status: 'active',
    target_segment: config.target_segment,
    discount_percent: config.discount_percent,
    coupon_code: config.coupon_code,
    subject: config.subject,
    message: config.message,
    start_at: now,
    end_at: config.end_at,
    stats: { sent: 0, opened: 0, converted: 0, revenue: 0 },
    created_at: now,
  }

  await storeMemory({
    store_id: storeId,
    agent_type: 'sales',
    memory_type: 'context',
    memory_key: `${CAMPAIGN_KEY_PREFIX}${id}`,
    memory_value: campaign as unknown as Record<string, unknown>,
    confidence: 1.0,
    source: 'data_analysis',
  })

  return campaign
}

/**
 * Retrieve all campaigns for a store from agent_memory.
 */
export async function getCampaigns(storeId: string): Promise<Campaign[]> {
  const memories = await getMemories({
    store_id: storeId,
    agent_type: 'sales',
    memory_type: 'context',
    limit: 100,
  })

  return memories
    .filter(m => m.memory_key.startsWith(CAMPAIGN_KEY_PREFIX))
    .map(m => m.memory_value as unknown as Campaign)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

/**
 * Get a single campaign by ID.
 */
export async function getCampaignById(
  storeId: string,
  campaignId: string
): Promise<Campaign | null> {
  const memory = await getMemoryByKey(storeId, 'sales', `${CAMPAIGN_KEY_PREFIX}${campaignId}`)
  if (!memory) return null
  return memory.memory_value as unknown as Campaign
}

/**
 * Update campaign stats (e.g., after sending emails or tracking conversions).
 */
export async function updateCampaignStats(
  storeId: string,
  campaignId: string,
  statsUpdate: Partial<CampaignStats>
): Promise<Campaign | null> {
  const campaign = await getCampaignById(storeId, campaignId)
  if (!campaign) return null

  const updatedStats: CampaignStats = {
    sent: campaign.stats.sent + (statsUpdate.sent || 0),
    opened: campaign.stats.opened + (statsUpdate.opened || 0),
    converted: campaign.stats.converted + (statsUpdate.converted || 0),
    revenue: campaign.stats.revenue + (statsUpdate.revenue || 0),
  }

  const updatedCampaign: Campaign = { ...campaign, stats: updatedStats }

  await storeMemory({
    store_id: storeId,
    agent_type: 'sales',
    memory_type: 'context',
    memory_key: `${CAMPAIGN_KEY_PREFIX}${campaignId}`,
    memory_value: updatedCampaign as unknown as Record<string, unknown>,
    confidence: 1.0,
    source: 'data_analysis',
  })

  return updatedCampaign
}

/**
 * Update campaign status (e.g., pause, complete, cancel).
 */
export async function updateCampaignStatus(
  storeId: string,
  campaignId: string,
  status: CampaignStatus
): Promise<Campaign | null> {
  const campaign = await getCampaignById(storeId, campaignId)
  if (!campaign) return null

  const updatedCampaign: Campaign = { ...campaign, status }

  await storeMemory({
    store_id: storeId,
    agent_type: 'sales',
    memory_type: 'context',
    memory_key: `${CAMPAIGN_KEY_PREFIX}${campaignId}`,
    memory_value: updatedCampaign as unknown as Record<string, unknown>,
    confidence: 1.0,
    source: 'data_analysis',
  })

  return updatedCampaign
}
