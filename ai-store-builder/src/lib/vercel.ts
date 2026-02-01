/**
 * Vercel API client for managing custom domains
 *
 * Required environment variables:
 * - VERCEL_TOKEN: Vercel API token (create at https://vercel.com/account/tokens)
 * - VERCEL_PROJECT_ID: The project ID to add domains to
 * - VERCEL_TEAM_ID: (optional) Team ID if using a team account
 */

const VERCEL_API_BASE = 'https://api.vercel.com'

interface VercelDomainResponse {
  name: string
  apexName: string
  projectId: string
  verified: boolean
  verification?: {
    type: string
    domain: string
    value: string
    reason: string
  }[]
  error?: {
    code: string
    message: string
  }
}

interface VercelDomainConfig {
  configuredBy: 'CNAME' | 'A' | 'http' | null
  acceptedChallenges?: ('dns-01' | 'http-01')[]
  misconfigured: boolean
}

interface VercelError {
  error: {
    code: string
    message: string
  }
}

function getVercelHeaders(): HeadersInit {
  const token = process.env.VERCEL_TOKEN
  if (!token) {
    throw new Error('VERCEL_TOKEN environment variable is not set')
  }

  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

function getTeamQuery(): string {
  const teamId = process.env.VERCEL_TEAM_ID
  return teamId ? `&teamId=${teamId}` : ''
}

/**
 * Add a custom domain to the Vercel project
 */
export async function addDomainToVercel(domain: string): Promise<{
  success: boolean
  verified: boolean
  verification?: { type: string; domain: string; value: string }[]
  error?: string
}> {
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!projectId) {
    throw new Error('VERCEL_PROJECT_ID environment variable is not set')
  }

  try {
    const response = await fetch(
      `${VERCEL_API_BASE}/v10/projects/${projectId}/domains?${getTeamQuery()}`,
      {
        method: 'POST',
        headers: getVercelHeaders(),
        body: JSON.stringify({ name: domain })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      const errorData = data as VercelError

      // Domain already exists is not an error for us
      if (errorData.error?.code === 'domain_already_in_use') {
        return {
          success: true,
          verified: false,
          error: 'Domain is already configured in another Vercel project'
        }
      }

      return {
        success: false,
        verified: false,
        error: errorData.error?.message || 'Failed to add domain to Vercel'
      }
    }

    const domainData = data as VercelDomainResponse

    return {
      success: true,
      verified: domainData.verified,
      verification: domainData.verification?.map(v => ({
        type: v.type,
        domain: v.domain,
        value: v.value
      }))
    }
  } catch (error) {
    console.error('Vercel API error (addDomain):', error)
    return {
      success: false,
      verified: false,
      error: error instanceof Error ? error.message : 'Failed to add domain to Vercel'
    }
  }
}

/**
 * Remove a custom domain from the Vercel project
 */
export async function removeDomainFromVercel(domain: string): Promise<{
  success: boolean
  error?: string
}> {
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!projectId) {
    throw new Error('VERCEL_PROJECT_ID environment variable is not set')
  }

  try {
    const response = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${domain}?${getTeamQuery()}`,
      {
        method: 'DELETE',
        headers: getVercelHeaders()
      }
    )

    if (!response.ok && response.status !== 404) {
      const data = await response.json() as VercelError
      return {
        success: false,
        error: data.error?.message || 'Failed to remove domain from Vercel'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Vercel API error (removeDomain):', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove domain from Vercel'
    }
  }
}

/**
 * Get the configuration status of a domain
 */
export async function getDomainConfig(domain: string): Promise<{
  success: boolean
  configured: boolean
  configuredBy: 'CNAME' | 'A' | 'http' | null
  misconfigured: boolean
  error?: string
}> {
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!projectId) {
    throw new Error('VERCEL_PROJECT_ID environment variable is not set')
  }

  try {
    const response = await fetch(
      `${VERCEL_API_BASE}/v6/domains/${domain}/config?${getTeamQuery()}`,
      {
        method: 'GET',
        headers: getVercelHeaders()
      }
    )

    if (!response.ok) {
      const data = await response.json() as VercelError
      return {
        success: false,
        configured: false,
        configuredBy: null,
        misconfigured: true,
        error: data.error?.message || 'Failed to get domain config'
      }
    }

    const data = await response.json() as VercelDomainConfig

    return {
      success: true,
      configured: data.configuredBy !== null,
      configuredBy: data.configuredBy,
      misconfigured: data.misconfigured
    }
  } catch (error) {
    console.error('Vercel API error (getDomainConfig):', error)
    return {
      success: false,
      configured: false,
      configuredBy: null,
      misconfigured: true,
      error: error instanceof Error ? error.message : 'Failed to get domain config'
    }
  }
}

/**
 * Verify a domain's configuration in Vercel
 */
export async function verifyDomainInVercel(domain: string): Promise<{
  success: boolean
  verified: boolean
  error?: string
}> {
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!projectId) {
    throw new Error('VERCEL_PROJECT_ID environment variable is not set')
  }

  try {
    const response = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${domain}/verify?${getTeamQuery()}`,
      {
        method: 'POST',
        headers: getVercelHeaders()
      }
    )

    const data = await response.json()

    if (!response.ok) {
      const errorData = data as VercelError
      return {
        success: false,
        verified: false,
        error: errorData.error?.message || 'Failed to verify domain'
      }
    }

    const domainData = data as VercelDomainResponse

    return {
      success: true,
      verified: domainData.verified
    }
  } catch (error) {
    console.error('Vercel API error (verifyDomain):', error)
    return {
      success: false,
      verified: false,
      error: error instanceof Error ? error.message : 'Failed to verify domain'
    }
  }
}

/**
 * Check if Vercel integration is configured
 */
export function isVercelConfigured(): boolean {
  return !!(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID)
}
