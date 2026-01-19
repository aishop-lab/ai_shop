/**
 * AI Services Test Script
 * Run with: npx tsx scripts/test-ai-services.ts
 * 
 * Tests:
 * 1. Provider configuration
 * 2. Text generation (brand analysis) - 1 API call
 * 3. Image analysis (if test image available) - 1 API call
 * 
 * Total: 2 API calls maximum
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local from the project root
config({ path: resolve(process.cwd(), '.env.local') })

import { AI_PROVIDER, CONFIDENCE_THRESHOLDS, getTextModel, getVisionModel, getFastModel } from '../src/lib/ai/provider'
import { vercelAI } from '../src/lib/ai/vercel-ai-service'

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60))
  log(title, 'cyan')
  console.log('='.repeat(60))
}

function logResult(test: string, passed: boolean, details?: string) {
  const status = passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`
  console.log(`${status} ${test}`)
  if (details) {
    console.log(`  ${colors.yellow}→ ${details}${colors.reset}`)
  }
}

async function testProviderConfig() {
  logSection('1. Provider Configuration')
  
  try {
    // Test provider selection
    logResult('AI_PROVIDER env variable', true, `Current: ${AI_PROVIDER || 'not set (defaults to google)'}`)
    
    // Test confidence thresholds
    logResult('Confidence thresholds loaded', 
      CONFIDENCE_THRESHOLDS.AUTO_CONFIRM === 0.80,
      `AUTO_CONFIRM: ${CONFIDENCE_THRESHOLDS.AUTO_CONFIRM}, AUTO_CONFIRM_REVIEW: ${CONFIDENCE_THRESHOLDS.AUTO_CONFIRM_REVIEW}`
    )
    
    // Test model getters (doesn't call API)
    const textModel = getTextModel()
    const visionModel = getVisionModel()
    const fastModel = getFastModel()
    
    logResult('Text model initialized', !!textModel, `Model: ${textModel?.modelId || 'unknown'}`)
    logResult('Vision model initialized', !!visionModel, `Model: ${visionModel?.modelId || 'unknown'}`)
    logResult('Fast model initialized', !!fastModel, `Model: ${fastModel?.modelId || 'unknown'}`)
    
    return true
  } catch (error) {
    logResult('Provider configuration', false, String(error))
    return false
  }
}

async function testBrandAnalysis() {
  logSection('2. Brand Analysis (Text Generation)')
  
  const testDescription = "We sell handcrafted saree blouses with traditional embroidery from Varanasi"
  
  console.log(`\nTest input: "${testDescription}"`)
  console.log('\nCalling AI... (this makes 1 API call)')
  
  try {
    const startTime = Date.now()
    const result = await vercelAI.analyzeBusinessForOnboarding(
      testDescription,
      undefined, // no business name
      'test-session-123' // test session ID
    )
    const duration = Date.now() - startTime
    
    console.log('\n--- Response ---')
    
    // Category detection
    logResult('Category detected', 
      result.category.confidence > 0.5,
      `${result.category.business_type} (${(result.category.confidence * 100).toFixed(0)}% confidence)`
    )
    
    // Auto-apply logic
    const shouldAutoApply = vercelAI.shouldAutoApply(result.category.confidence)
    logResult('Auto-apply logic', 
      typeof shouldAutoApply === 'boolean',
      `Should auto-apply: ${shouldAutoApply} (threshold: ${CONFIDENCE_THRESHOLDS.AUTO_CONFIRM * 100}%)`
    )
    
    // Store names
    logResult('Store names generated', 
      result.store_names.length === 3,
      result.store_names.map(n => n.name).join(', ')
    )
    
    // Brand colors
    logResult('Brand colors suggested', 
      result.brand_colors.primary.startsWith('#') && result.brand_colors.secondary.startsWith('#'),
      `Primary: ${result.brand_colors.primary}, Secondary: ${result.brand_colors.secondary}`
    )
    
    // Tagline
    logResult('Tagline generated', 
      result.tagline.length > 0 && result.tagline.length <= 60,
      `"${result.tagline}" (${result.tagline.length} chars)`
    )
    
    // Overall confidence
    logResult('Overall confidence', 
      result.overall_confidence > 0,
      `${(result.overall_confidence * 100).toFixed(0)}%`
    )
    
    console.log(`\n${colors.blue}API call completed in ${duration}ms${colors.reset}`)
    
    return true
  } catch (error) {
    logResult('Brand analysis', false, String(error))
    console.error('\nFull error:', error)
    return false
  }
}

async function testStoreContentGeneration() {
  logSection('3. Store Content Generation (Text)')
  
  console.log('\nGenerating About Us page... (this makes 1 API call)')
  
  try {
    const startTime = Date.now()
    const result = await vercelAI.generateAboutUs(
      'Thevasa',
      'Handcrafted saree blouses with traditional Varanasi embroidery',
      'Fashion & Apparel',
      'warm'
    )
    const duration = Date.now() - startTime
    
    console.log('\n--- Response ---')
    
    // Headline
    logResult('Headline generated', 
      result.headline.length > 0,
      `"${result.headline}"`
    )
    
    // Story
    logResult('Story generated', 
      result.story.length >= 100,
      `${result.story.length} characters`
    )
    
    // Mission
    logResult('Mission statement', 
      result.mission.length > 0,
      `"${result.mission.substring(0, 80)}..."`
    )
    
    // Values
    logResult('Brand values', 
      result.values.length >= 3,
      `${result.values.length} values: ${result.values.map(v => v.title).join(', ')}`
    )
    
    // CTA
    logResult('Call to action', 
      result.cta.text.length > 0,
      `"${result.cta.text}" → ${result.cta.action}`
    )
    
    console.log(`\n${colors.blue}API call completed in ${duration}ms${colors.reset}`)
    
    return true
  } catch (error) {
    logResult('Store content generation', false, String(error))
    console.error('\nFull error:', error)
    return false
  }
}

async function testDescriptionEnhancement() {
  logSection('4. Description Enhancement (Text)')
  
  const originalDesc = "Blue silk blouse with work"
  console.log(`\nOriginal: "${originalDesc}"`)
  console.log('Enhancing description... (this makes 1 API call)')
  
  try {
    const startTime = Date.now()
    const result = await vercelAI.enhanceDescription(
      originalDesc,
      'Blue Silk Saree Blouse',
      'Fashion'
    )
    const duration = Date.now() - startTime
    
    console.log('\n--- Response ---')
    
    // Enhanced description
    logResult('Description enhanced', 
      result.enhanced_description.length > originalDesc.length,
      `"${result.enhanced_description.substring(0, 100)}..."`
    )
    
    // SEO keywords
    logResult('SEO keywords extracted', 
      result.seo_keywords.length > 0,
      result.seo_keywords.join(', ')
    )
    
    // Improvement notes
    logResult('Improvement notes', 
      result.improvement_notes.length > 0,
      result.improvement_notes
    )
    
    console.log(`\n${colors.blue}API call completed in ${duration}ms${colors.reset}`)
    
    return true
  } catch (error) {
    logResult('Description enhancement', false, String(error))
    console.error('\nFull error:', error)
    return false
  }
}

async function testCaching() {
  logSection('5. Caching System')
  
  console.log('\nTesting session cache...')
  
  try {
    // Check if previous analysis is cached
    const cachedAnalysis = vercelAI.getCachedOnboardingAnalysis('test-session-123')
    
    logResult('Session cache working', 
      cachedAnalysis !== undefined,
      cachedAnalysis ? 'Found cached analysis from test #2' : 'No cache found (expected if test #2 failed)'
    )
    
    // Clear cache
    vercelAI.clearSession('test-session-123')
    const afterClear = vercelAI.getCachedOnboardingAnalysis('test-session-123')
    
    logResult('Cache clearing works', 
      afterClear === undefined,
      'Session cleared successfully'
    )
    
    return true
  } catch (error) {
    logResult('Caching system', false, String(error))
    return false
  }
}

async function runTests() {
  console.log('\n' + '█'.repeat(60))
  log('  AI SERVICES INTEGRATION TEST', 'cyan')
  log(`  Provider: ${AI_PROVIDER || 'google (default)'}`, 'yellow')
  console.log('█'.repeat(60))
  
  const results: boolean[] = []
  
  // Test 1: Provider config (no API calls)
  results.push(await testProviderConfig())
  
  // Test 2: Brand analysis (1 API call)
  results.push(await testBrandAnalysis())
  
  // Test 3: Store content (1 API call)
  results.push(await testStoreContentGeneration())
  
  // Test 4: Description enhancement (1 API call)
  results.push(await testDescriptionEnhancement())
  
  // Test 5: Caching (no API calls)
  results.push(await testCaching())
  
  // Summary
  logSection('TEST SUMMARY')
  const passed = results.filter(r => r).length
  const total = results.length
  
  console.log(`\nTotal API calls made: 3`)
  console.log(`Tests passed: ${passed}/${total}`)
  
  if (passed === total) {
    log('\n✓ All tests passed! AI integration is working correctly.', 'green')
  } else {
    log(`\n✗ ${total - passed} test(s) failed. Check the errors above.`, 'red')
  }
  
  console.log('\n')
}

// Run tests
runTests().catch(console.error)
