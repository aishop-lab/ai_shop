# Phase 4: Sales Agent

**Date**: 2026-03-20
**Status**: Complete

## What Was Built

The Sales Agent extends `BaseAgent` and specializes in revenue growth: abandoned cart recovery, customer segmentation, discount campaigns, and upsell/cross-sell recommendations.

### Files Created

| File | Purpose |
|------|---------|
| `src/lib/agents/sales/segmentation.ts` | RFM (Recency, Frequency, Monetary) customer segmentation into 6 segments: Champions, Loyal, Potential, At Risk, Dormant, New |
| `src/lib/agents/sales/campaign-engine.ts` | Campaign CRUD stored in `agent_memory` (no dedicated DB table yet). Supports cart_recovery, win_back, upsell, flash_sale types |
| `src/lib/agents/sales/tools.ts` | 7 agent tools with Zod schemas, risk levels, and execute functions |
| `src/lib/agents/sales/agent.ts` | `SalesAgent` class with system prompt, tool registration, and singleton export |

### Tools Implemented

| Tool | Risk | Category | Description |
|------|------|----------|-------------|
| `getAbandonedCarts` | low | analysis | Query active abandoned carts with optional value/age filters |
| `sendRecoveryEmail` | medium | communication | Send recovery email (>10% discount escalates to high risk) |
| `createCoupon` | high | campaign | Create discount coupons (percentage, fixed, free shipping) |
| `getCustomerSegments` | low | analysis | RFM segmentation of store customers |
| `getProductRecommendations` | low | analysis | Wraps existing AI recommendation engine |
| `analyzeCartValue` | low | analysis | Compute avg cart value, recovery rate, potential revenue |
| `sendTargetedCampaign` | high | campaign | Create campaign targeting a customer segment with optional discount |

### Key Design Decisions

- Discounts >10% always require merchant approval regardless of autonomy level
- Max 3 recovery emails per abandoned cart (enforced in tool logic)
- Campaigns stored in `agent_memory` with `campaign:` key prefix (no schema migration needed)
- RFM scoring uses percentile-based approach relative to each store's customer base
- Integrates with existing `sendRecoveryEmail` from `lib/cart/abandoned-cart.ts` and `getRecommendations` from `lib/ai/recommendations.ts`
