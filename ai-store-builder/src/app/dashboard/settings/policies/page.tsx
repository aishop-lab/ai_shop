'use client'

import { useState, useEffect } from 'react'
import { FileText, Save, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface Policy {
    content: string
    updated_at: string | null
}

interface Policies {
    returns: Policy
    privacy: Policy
    terms: Policy
    shipping: Policy
}

const policyLabels: Record<keyof Policies, { title: string; description: string }> = {
    returns: {
        title: 'Return & Refund Policy',
        description: 'Define your return window, conditions, and refund process'
    },
    privacy: {
        title: 'Privacy Policy',
        description: 'Explain how you collect, use, and protect customer data'
    },
    terms: {
        title: 'Terms of Service',
        description: 'Set the legal terms for using your store'
    },
    shipping: {
        title: 'Shipping Policy',
        description: 'Describe shipping rates, delivery times, and tracking'
    }
}

export default function PoliciesSettingsPage() {
    const [policies, setPolicies] = useState<Policies | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [regenerating, setRegenerating] = useState(false)
    const [activeTab, setActiveTab] = useState<keyof Policies>('returns')
    const [editedContent, setEditedContent] = useState<Record<keyof Policies, string>>({
        returns: '',
        privacy: '',
        terms: '',
        shipping: ''
    })

    useEffect(() => {
        fetchPolicies()
    }, [])

    const fetchPolicies = async () => {
        try {
            const response = await fetch('/api/stores/policies')
            if (response.ok) {
                const data = await response.json()
                setPolicies(data.policies)
                setEditedContent({
                    returns: data.policies?.returns?.content || '',
                    privacy: data.policies?.privacy?.content || '',
                    terms: data.policies?.terms?.content || '',
                    shipping: data.policies?.shipping?.content || ''
                })
            }
        } catch (error) {
            console.error('Failed to fetch policies:', error)
            toast.error('Failed to load policies')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (policyType: keyof Policies) => {
        setSaving(true)
        try {
            const response = await fetch('/api/stores/policies', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: policyType,
                    content: editedContent[policyType]
                })
            })

            if (response.ok) {
                toast.success('Policy saved successfully')
                fetchPolicies()
            } else {
                toast.error('Failed to save policy')
            }
        } catch (error) {
            console.error('Failed to save policy:', error)
            toast.error('Failed to save policy')
        } finally {
            setSaving(false)
        }
    }

    const handleRegenerate = async () => {
        setRegenerating(true)
        try {
            const response = await fetch('/api/stores/policies/regenerate', {
                method: 'POST'
            })

            if (response.ok) {
                toast.success('Policies regenerated successfully')
                fetchPolicies()
            } else {
                toast.error('Failed to regenerate policies')
            }
        } catch (error) {
            console.error('Failed to regenerate policies:', error)
            toast.error('Failed to regenerate policies')
        } finally {
            setRegenerating(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Legal Policies</h1>
                    <p className="text-muted-foreground">
                        Manage your store's legal documents and policies
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                    Regenerate All
                </Button>
            </div>

            {/* Warning Banner */}
            <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="flex items-start gap-3 py-4">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-yellow-800">
                            Legal Disclaimer
                        </p>
                        <p className="text-sm text-yellow-700">
                            These policies are auto-generated templates. We recommend consulting a lawyer
                            before making major changes, especially for complex business requirements.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Policy Editor */}
            <Card>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as keyof Policies)}>
                    <CardHeader>
                        <TabsList className="grid grid-cols-4">
                            {Object.entries(policyLabels).map(([key, { title }]) => (
                                <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">
                                    {title.split(' ')[0]}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </CardHeader>

                    {Object.entries(policyLabels).map(([key, { title, description }]) => (
                        <TabsContent key={key} value={key}>
                            <CardContent className="space-y-4">
                                <div>
                                    <h3 className="font-semibold">{title}</h3>
                                    <p className="text-sm text-muted-foreground">{description}</p>
                                </div>

                                <Textarea
                                    value={editedContent[key as keyof Policies]}
                                    onChange={(e) => setEditedContent(prev => ({
                                        ...prev,
                                        [key]: e.target.value
                                    }))}
                                    className="min-h-[400px] font-mono text-sm"
                                    placeholder="Enter policy content (HTML supported)..."
                                />

                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">
                                        {policies?.[key as keyof Policies]?.updated_at && (
                                            <>Last updated: {new Date(policies[key as keyof Policies].updated_at!).toLocaleDateString()}</>
                                        )}
                                    </p>
                                    <Button
                                        onClick={() => handleSave(key as keyof Policies)}
                                        disabled={saving}
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </Button>
                                </div>
                            </CardContent>
                        </TabsContent>
                    ))}
                </Tabs>
            </Card>
        </div>
    )
}
