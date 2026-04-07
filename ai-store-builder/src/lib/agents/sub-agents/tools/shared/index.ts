// src/lib/agents/sub-agents/tools/shared/index.ts
// Barrel export for all shared tools

export { get_products, get_product_details, get_product_categories, get_trending_products } from './products'
export { get_orders, get_order_details, get_order_stats, get_revenue_summary } from './orders'
export { get_customers, get_customer_history, get_customer_segments } from './customers'
export { get_store_config, get_store_policies, get_brand_guidelines, get_shipping_config } from './store'
export { get_coupons, get_coupon_performance, deactivate_coupon } from './coupons'
export { get_reviews, get_review_stats } from './reviews'
export { get_funnel_data, get_payment_failures, get_recovery_stats } from './analytics'
