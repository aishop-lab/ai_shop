/**
 * AI Services Test API Route
 * GET /api/ai/test - Run AI integration tests
 * 
 * Tests:
 * 1. Provider configuration (no API calls)
 * 2. Brand analysis (1 API call)
 * 3. About Us generation (1 API call)
 * 4. Description enhancement (1 API call)
 * 5. Caching system (no API calls)
 * 
 * Total: 3 API calls maximum
 */

import { NextResponse } from 'next/server'
import { AI_PROVIDER, CONFIDENCE_THRESHOLDS, getTextModel, getVisionModel, getFastModel } from '@/lib/ai/provider'
import { vercelAI } from '@/lib/ai/vercel-ai-service'

interface TestResult {
  name: string
  passed: boolean
  details: string
  duration?: number
}

interface TestSection {
  name: string
  tests: TestResult[]
  apiCallsMade: number
}

export async function GET() {
  const sections: TestSection[] = []
  let totalApiCalls = 0

  // ========================================
  // Test 1: Provider Configuration
  // ========================================
  const providerTests: TestResult[] = []
  
  providerTests.push({
    name: 'AI_PROVIDER env variable',
    passed: true,
    details: `Current: ${AI_PROVIDER || 'google (default)'}`
  })

  providerTests.push({
    name: 'Confidence thresholds loaded',
    passed: CONFIDENCE_THRESHOLDS.AUTO_CONFIRM === 0.80,
    details: `AUTO_CONFIRM: ${CONFIDENCE_THRESHOLDS.AUTO_CONFIRM}, AUTO_CONFIRM_REVIEW: ${CONFIDENCE_THRESHOLDS.AUTO_CONFIRM_REVIEW}`
  })

  try {
    const textModel = getTextModel()
    const visionModel = getVisionModel()
    const fastModel = getFastModel()
    
    providerTests.push({
      name: 'Text model initialized',
      passed: !!textModel,
      details: `Model: ${textModel?.modelId || 'unknown'}`
    })
    
    providerTests.push({
      name: 'Vision model initialized',
      passed: !!visionModel,
      details: `Model: ${visionModel?.modelId || 'unknown'}`
    })
    
    providerTests.push({
      name: 'Fast model initialized',
      passed: !!fastModel,
      details: `Model: ${fastModel?.modelId || 'unknown'}`
    })
  } catch (error) {
    providerTests.push({
      name: 'Model initialization',
      passed: false,
      details: String(error)
    })
  }

  sections.push({
    name: '1. Provider Configuration',
    tests: providerTests,
    apiCallsMade: 0
  })

  // ========================================
  // Test 2: Brand Analysis (1 API call)
  // ========================================
  const brandTests: TestResult[] = []
  const testDescription = "We sell handcrafted saree blouses with traditional embroidery from Varanasi"
  
  try {
    const startTime = Date.now()
    const result = await vercelAI.analyzeBusinessForOnboarding(
      testDescription,
      undefined,
      'test-session-api'
    )
    const duration = Date.now() - startTime
    totalApiCalls++

    brandTests.push({
      name: 'Category detected',
      passed: result.category.confidence > 0.5,
      details: `${result.category.business_type} (${(result.category.confidence * 100).toFixed(0)}% confidence)`,
      duration
    })

    const shouldAutoApply = vercelAI.shouldAutoApply(result.category.confidence)
    brandTests.push({
      name: 'Auto-apply logic',
      passed: typeof shouldAutoApply === 'boolean',
      details: `Should auto-apply: ${shouldAutoApply} (threshold: ${CONFIDENCE_THRESHOLDS.AUTO_CONFIRM * 100}%)`
    })

    brandTests.push({
      name: 'Store names generated',
      passed: result.store_names.length === 3,
      details: result.store_names.map(n => n.name).join(', ')
    })

    brandTests.push({
      name: 'Brand colors suggested',
      passed: result.brand_colors.primary.startsWith('#'),
      details: `Primary: ${result.brand_colors.primary}, Secondary: ${result.brand_colors.secondary}`
    })

    brandTests.push({
      name: 'Tagline generated',
      passed: result.tagline.length > 0 && result.tagline.length <= 60,
      details: `"${result.tagline}" (${result.tagline.length} chars)`
    })

    brandTests.push({
      name: 'Overall confidence',
      passed: result.overall_confidence > 0,
      details: `${(result.overall_confidence * 100).toFixed(0)}%`
    })
  } catch (error) {
    brandTests.push({
      name: 'Brand analysis',
      passed: false,
      details: String(error)
    })
  }

  sections.push({
    name: '2. Brand Analysis',
    tests: brandTests,
    apiCallsMade: 1
  })

  // ========================================
  // Test 3: About Us Generation (1 API call)
  // ========================================
  const aboutTests: TestResult[] = []
  
  try {
    const startTime = Date.now()
    const result = await vercelAI.generateAboutUs(
      'Thevasa',
      'Handcrafted saree blouses with traditional Varanasi embroidery',
      'Fashion & Apparel',
      'warm'
    )
    const duration = Date.now() - startTime
    totalApiCalls++

    aboutTests.push({
      name: 'Headline generated',
      passed: result.headline.length > 0,
      details: `"${result.headline}"`,
      duration
    })

    aboutTests.push({
      name: 'Story generated',
      passed: result.story.length >= 100,
      details: `${result.story.length} characters`
    })

    aboutTests.push({
      name: 'Mission statement',
      passed: result.mission.length > 0,
      details: `"${result.mission.substring(0, 80)}..."`
    })

    aboutTests.push({
      name: 'Brand values',
      passed: result.values.length >= 3,
      details: `${result.values.length} values: ${result.values.map(v => v.title).join(', ')}`
    })

    aboutTests.push({
      name: 'Call to action',
      passed: result.cta.text.length > 0,
      details: `"${result.cta.text}" → ${result.cta.action}`
    })
  } catch (error) {
    aboutTests.push({
      name: 'About Us generation',
      passed: false,
      details: String(error)
    })
  }

  sections.push({
    name: '3. About Us Generation',
    tests: aboutTests,
    apiCallsMade: 1
  })

  // ========================================
  // Test 4: Description Enhancement (1 API call)
  // ========================================
  const descTests: TestResult[] = []
  const originalDesc = "Blue silk blouse with work"
  
  try {
    const startTime = Date.now()
    const result = await vercelAI.enhanceDescription(
      originalDesc,
      'Blue Silk Saree Blouse',
      'Fashion'
    )
    const duration = Date.now() - startTime
    totalApiCalls++

    descTests.push({
      name: 'Description enhanced',
      passed: result.enhanced_description.length > originalDesc.length,
      details: `"${result.enhanced_description.substring(0, 100)}..."`,
      duration
    })

    descTests.push({
      name: 'SEO keywords extracted',
      passed: result.seo_keywords.length > 0,
      details: result.seo_keywords.join(', ')
    })

    descTests.push({
      name: 'Improvement notes',
      passed: result.improvement_notes.length > 0,
      details: result.improvement_notes
    })
  } catch (error) {
    descTests.push({
      name: 'Description enhancement',
      passed: false,
      details: String(error)
    })
  }

  sections.push({
    name: '4. Description Enhancement',
    tests: descTests,
    apiCallsMade: 1
  })

  // ========================================
  // Test 5: Caching System
  // ========================================
  const cacheTests: TestResult[] = []
  
  try {
    const cachedAnalysis = vercelAI.getCachedOnboardingAnalysis('test-session-api')
    
    cacheTests.push({
      name: 'Session cache working',
      passed: cachedAnalysis !== undefined,
      details: cachedAnalysis ? 'Found cached analysis from brand test' : 'No cache found'
    })

    vercelAI.clearSession('test-session-api')
    const afterClear = vercelAI.getCachedOnboardingAnalysis('test-session-api')
    
    cacheTests.push({
      name: 'Cache clearing works',
      passed: afterClear === undefined,
      details: 'Session cleared successfully'
    })
  } catch (error) {
    cacheTests.push({
      name: 'Caching system',
      passed: false,
      details: String(error)
    })
  }

  sections.push({
    name: '5. Caching System',
    tests: cacheTests,
    apiCallsMade: 0
  })

  // ========================================
  // Summary
  // ========================================
  const allTests = sections.flatMap(s => s.tests)
  const passedTests = allTests.filter(t => t.passed).length
  const totalTests = allTests.length
  const allPassed = passedTests === totalTests

  return NextResponse.json({
    success: allPassed,
    provider: AI_PROVIDER || 'google',
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      apiCallsMade: totalApiCalls
    },
    sections,
    message: allPassed 
      ? '✓ All tests passed! AI integration is working correctly.' 
      : `✗ ${totalTests - passedTests} test(s) failed.`
  })
}
