// src/lib/agents/support/language-detector.ts
// Detects whether incoming customer messages are in English, Hindi, or Hinglish
// and provides language-specific system prompt instructions for the Support Agent.

export type SupportedLanguage = 'en' | 'hi' | 'hinglish'

export interface LanguageDetection {
  detected: SupportedLanguage
  confidence: number
  script: 'latin' | 'devanagari' | 'mixed'
}

// Unicode range for Devanagari script: \u0900-\u097F
const DEVANAGARI_REGEX = /[\u0900-\u097F]/

// Common Hindi words written in Latin script (Romanized Hindi / Hinglish markers)
const HINGLISH_KEYWORDS = new Set([
  // Greetings & conversational
  'namaste', 'namaskar', 'kya', 'hai', 'hain', 'nahi', 'nhi', 'ji',
  'aap', 'aapka', 'aapki', 'tum', 'tumhara', 'tumhari', 'mera', 'meri',
  'mere', 'humara', 'humari', 'unka', 'unki', 'iska', 'iski',
  'kaise', 'kaisa', 'kaisi', 'kahan', 'kab', 'kyun', 'kyu', 'kyunki',
  'kon', 'kaun', 'kitna', 'kitne', 'kitni',
  // Common verbs / particles
  'kar', 'karo', 'karna', 'karein', 'karunga', 'karungi', 'karte',
  'ho', 'hota', 'hoti', 'hoga', 'hogi', 'hua', 'hui', 'huye',
  'tha', 'thi', 'the', 'raha', 'rahi', 'rahe',
  'de', 'do', 'dena', 'denge', 'diya', 'diye', 'dijiye', 'dijie',
  'le', 'lo', 'lena', 'lenge', 'liya', 'liye', 'lijiye', 'lijie',
  'bata', 'batao', 'batana', 'bataiye', 'bataye',
  'chahiye', 'chahte', 'chahti', 'chahunga', 'chahungi',
  'sakta', 'sakti', 'sakte', 'sakti',
  'mil', 'milega', 'milegi', 'milenge',
  // Pronouns & common words
  'main', 'mujhe', 'mujhko', 'hum', 'humko', 'humein',
  'ye', 'yeh', 'woh', 'wo', 'uss', 'us', 'isko', 'usko',
  'aur', 'ya', 'par', 'lekin', 'magar', 'phir', 'bhi', 'sirf',
  'abhi', 'yahan', 'wahan', 'idhar', 'udhar',
  'accha', 'achha', 'theek', 'thik', 'sahi', 'galat',
  'bahut', 'zyada', 'kam', 'thoda', 'thodi', 'bohot',
  'pehle', 'baad', 'abhi', 'kal', 'aaj', 'parso',
  // E-commerce context
  'order', 'saman', 'samaan', 'paisa', 'paise', 'rupaye', 'rupay',
  'wapas', 'wapsi', 'refund', 'delivery', 'khareed', 'kharidna',
  'bikri', 'dukan', 'bhejiye', 'bhejo', 'bheja', 'bhejna',
  'milna', 'milta', 'dikhao', 'dikhaye', 'dikhaiye',
  // Courtesy
  'dhanyavaad', 'dhanyawad', 'shukriya', 'alvida', 'namaste',
  'kripya', 'kripaya', 'meherbani', 'madad', 'sahayata',
])

// Common Hindi sentence-ending patterns in Latin script
const HINGLISH_PATTERNS = [
  /\bhai\b/i,
  /\bhain\b/i,
  /\bnahi\b/i,
  /\bkya\b/i,
  /\bkaise\b/i,
  /\bkahan\b/i,
  /\bkyun\b/i,
  /\bkaro\b/i,
  /\bbhej\w*/i,
  /\bchaht?[aie]\b/i,
  /\bmujh[ek]\b/i,
  /\bkripya\b/i,
  /\bahut\b/i,
]

/**
 * Detect whether the input text is English, Hindi (Devanagari), or Hinglish (Romanized Hindi + English).
 */
export function detectLanguage(text: string): LanguageDetection {
  if (!text || text.trim().length === 0) {
    return { detected: 'en', confidence: 1, script: 'latin' }
  }

  const trimmed = text.trim()
  const chars = [...trimmed]
  const totalChars = chars.filter(c => c.trim().length > 0).length

  if (totalChars === 0) {
    return { detected: 'en', confidence: 1, script: 'latin' }
  }

  // Count Devanagari characters
  const devanagariCount = chars.filter(c => DEVANAGARI_REGEX.test(c)).length
  const devanagariRatio = devanagariCount / totalChars

  // Pure Devanagari (Hindi)
  if (devanagariRatio > 0.5) {
    // Check if it's mixed with Latin
    const latinCount = chars.filter(c => /[a-zA-Z]/.test(c)).length
    const latinRatio = latinCount / totalChars

    if (latinRatio > 0.2) {
      // Mixed script - Devanagari dominant with some Latin
      return {
        detected: 'hi',
        confidence: 0.7 + devanagariRatio * 0.2,
        script: 'mixed',
      }
    }

    return {
      detected: 'hi',
      confidence: Math.min(0.95, 0.6 + devanagariRatio * 0.4),
      script: 'devanagari',
    }
  }

  // Some Devanagari present but not dominant - likely mixed
  if (devanagariRatio > 0.1) {
    return {
      detected: 'hinglish',
      confidence: 0.8,
      script: 'mixed',
    }
  }

  // All Latin script - check for Hinglish keywords
  const words = trimmed
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0)

  if (words.length === 0) {
    return { detected: 'en', confidence: 1, script: 'latin' }
  }

  // Count Hinglish keyword matches
  const hinglishWordCount = words.filter(w => HINGLISH_KEYWORDS.has(w)).length
  const hinglishRatio = hinglishWordCount / words.length

  // Check pattern matches
  const patternMatches = HINGLISH_PATTERNS.filter(p => p.test(trimmed)).length
  const patternScore = Math.min(patternMatches / 3, 1) // Normalize to 0-1

  // Combined score
  const hinglishScore = hinglishRatio * 0.7 + patternScore * 0.3

  if (hinglishScore > 0.3) {
    return {
      detected: 'hinglish',
      confidence: Math.min(0.95, 0.5 + hinglishScore * 0.5),
      script: 'latin',
    }
  }

  if (hinglishScore > 0.15) {
    // Borderline - could be Hinglish with mostly English words
    return {
      detected: 'hinglish',
      confidence: 0.4 + hinglishScore,
      script: 'latin',
    }
  }

  // Default to English
  return {
    detected: 'en',
    confidence: Math.min(0.95, 0.7 + (1 - hinglishScore) * 0.3),
    script: 'latin',
  }
}

/**
 * Return language-specific instructions to append to the Support Agent system prompt.
 */
export function getLanguageSystemPrompt(language: SupportedLanguage): string {
  switch (language) {
    case 'hi':
      return `
## Language: Hindi (हिन्दी)
The customer is writing in Hindi. You MUST respond in Hindi using Devanagari script.
- Use polite forms: आप (aap) instead of तुम (tum)
- For formal contexts (complaints, refunds), use respectful language: कृपया, धन्यवाद, आपकी सेवा में
- For casual contexts (product inquiries, general chat), you may be slightly less formal but still respectful
- Include product names and order numbers in their original form (don't transliterate them)
- Currency should be shown as ₹ (Rupee symbol)
- Keep technical terms in English where commonly used (e.g., "order", "tracking", "refund", "delivery")
`

    case 'hinglish':
      return `
## Language: Hinglish (Hindi + English mix)
The customer is writing in Hinglish (Romanized Hindi mixed with English). You MUST respond in the same Hinglish style.
- Mix Hindi and English naturally, like: "Aapka order abhi process ho raha hai"
- Use Romanized Hindi (Latin script), NOT Devanagari
- Keep the tone casual and friendly — Hinglish is inherently informal
- Use common Hinglish phrases: "koi baat nahi", "bilkul", "zaroor", "abhi check karte hain"
- Technical and product terms should stay in English: "order", "delivery", "refund", "tracking number"
- Currency: ₹ symbol or "rupees"
- Don't over-formalize — match the customer's conversational energy
- Example response style: "Aapka order #1234 abhi shipped ho chuka hai! Delivery estimated hai 3-5 din mein. Koi aur help chahiye?"
`

    case 'en':
    default:
      return `
## Language: English
The customer is writing in English. Respond in clear, professional English.
- Keep responses concise and helpful
- Use simple language — avoid jargon
- Be warm but professional
`
  }
}
