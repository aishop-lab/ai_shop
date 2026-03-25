import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Bot,
  Zap,
  Megaphone,
  TrendingUp,
  Headphones,
  BarChart3,
  Settings,
  Check,
  ChevronDown,
} from 'lucide-react'

// ─── Data ──────────────────────────────────────────────────────────────────

const chiefs = [
  {
    codename: 'PRISM',
    role: 'Chief Marketing Officer',
    department: 'Marketing',
    subAgents: 8,
    tagline: 'Turns browsers into buyers.',
    color: 'purple',
    accent: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    glow: 'hover:shadow-[0_0_40px_-8px_rgba(168,85,247,0.2)]',
    glowPing: 'bg-purple-400',
    icon: Megaphone,
    capabilities: [
      'Runs Meta & Google ad campaigns autonomously',
      'Generates social content and email sequences',
      'Auto-optimises ad spend based on live ROAS',
    ],
  },
  {
    codename: 'FORGE',
    role: 'Chief Revenue Officer',
    department: 'Sales',
    subAgents: 7,
    tagline: 'Every rupee recovered, every cart closed.',
    color: 'emerald',
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    glow: 'hover:shadow-[0_0_40px_-8px_rgba(52,211,153,0.2)]',
    glowPing: 'bg-emerald-400',
    icon: TrendingUp,
    capabilities: [
      'Recovers abandoned carts with personalised offers',
      'Segments customers and creates targeted discounts',
      'Upsells and cross-sells at the right moment',
    ],
  },
  {
    codename: 'SENTINEL',
    role: 'Chief Customer Officer',
    department: 'Support',
    subAgents: 8,
    tagline: 'Happy customers, zero effort from you.',
    color: 'blue',
    accent: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    glow: 'hover:shadow-[0_0_40px_-8px_rgba(96,165,250,0.2)]',
    glowPing: 'bg-blue-400',
    icon: Headphones,
    capabilities: [
      'Handles queries on chat, email, and WhatsApp',
      'Resolves 80%+ of tickets without your involvement',
      'Escalates edge cases with full context',
    ],
  },
  {
    codename: 'PULSE',
    role: 'Chief Analytics Officer',
    department: 'Analytics',
    subAgents: 7,
    tagline: 'Knows your numbers before you ask.',
    color: 'amber',
    accent: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    glow: 'hover:shadow-[0_0_40px_-8px_rgba(251,191,36,0.2)]',
    glowPing: 'bg-amber-400',
    icon: BarChart3,
    capabilities: [
      'Surfaces daily insights and revenue anomalies',
      'Tracks cohorts, LTV, and repeat purchase rates',
      'Sends proactive alerts when metrics shift',
    ],
  },
  {
    codename: 'CIPHER',
    role: 'Chief Technology Officer',
    department: 'Technical',
    subAgents: 7,
    tagline: 'Your store, always healthy and fast.',
    color: 'cyan',
    accent: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    glow: 'hover:shadow-[0_0_40px_-8px_rgba(34,211,238,0.2)]',
    glowPing: 'bg-cyan-400',
    icon: Settings,
    capabilities: [
      'Optimises SEO and generates structured data',
      'Audits images, speed, and store health daily',
      'Fixes technical issues before customers notice',
    ],
  },
]

const steps = [
  {
    number: '01',
    title: 'Create your store in 30 seconds',
    description:
      'Give us your store name, describe what you sell, and pick a theme. StoreForge generates your storefront instantly — no technical skills required.',
    accent: 'text-blue-400',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/10',
    glow: 'hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.3)]',
  },
  {
    number: '02',
    title: 'Meet your AI team',
    description:
      'Five Chiefs — PRISM, FORGE, SENTINEL, PULSE, and CIPHER — introduce themselves and configure their workflows around your business.',
    accent: 'text-purple-400',
    border: 'border-purple-500/20',
    bg: 'bg-purple-500/10',
    glow: 'hover:shadow-[0_0_60px_-15px_rgba(168,85,247,0.3)]',
  },
  {
    number: '03',
    title: 'Watch them work',
    description:
      'Your agents start immediately. Marketing campaigns go live. Carts get recovered. Customers get answers. You get daily reports — and your time back.',
    accent: 'text-emerald-400',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/10',
    glow: 'hover:shadow-[0_0_60px_-15px_rgba(52,211,153,0.3)]',
  },
]

const agentDotColors = [
  'bg-purple-400',
  'bg-emerald-400',
  'bg-blue-400',
  'bg-amber-400',
  'bg-cyan-400',
] as const

const stats = [
  { value: '37', label: 'AI specialists working 24/7' },
  { value: '5', label: 'Departments fully automated' },
  { value: '30s', label: 'Store live in 30 seconds' },
  { value: '0', label: 'Technical skills needed' },
]

// ─── Page ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 scroll-smooth">
      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">StoreForge</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/sign-in">
                <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button className="bg-blue-600 hover:bg-blue-500 text-white">
                  Launch Your Store
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative pt-36 sm:pt-48 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-blue-600/6 rounded-full blur-[140px]" />
          <div className="absolute top-1/2 left-1/4 w-[500px] h-[400px] bg-purple-600/4 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 right-1/4 w-[500px] h-[400px] bg-cyan-600/4 rounded-full blur-[120px]" />
        </div>

        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium tracking-wide uppercase mb-10">
            <Zap className="h-3 w-3" />
            <span>37 AI Agents. 5 Departments. One Platform.</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.05] tracking-tight">
            The store that
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
              runs itself.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            37 AI agents. 5 departments. One platform. Your entire e-commerce business —
            marketing, sales, support, analytics, and technical — run by AI.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-500 text-white gap-2 text-base px-8 py-6 h-auto shadow-[0_0_24px_-4px_rgba(37,99,235,0.5)] hover:shadow-[0_0_28px_-4px_rgba(37,99,235,0.65)] transition-shadow"
              >
                Launch Your AI Store
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button
                variant="outline"
                size="lg"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white bg-transparent text-base px-8 py-6 h-auto gap-2"
              >
                See how it works
                <ChevronDown className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <p className="text-sm text-zinc-600 mt-7">
            Free to start &middot; No credit card required &middot; Store live in 30 seconds
          </p>
        </div>
      </section>

      {/* ── Impact Numbers ────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-y border-zinc-800/50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800/40 rounded-2xl overflow-hidden">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-zinc-950 px-8 py-10 text-center"
              >
                <p className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-2">
                  {stat.value}
                </p>
                <p className="text-sm text-zinc-500 leading-snug">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="py-28 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-xs font-semibold text-blue-400 tracking-widest uppercase mb-4">
              How It Works
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              From zero to autonomous in minutes.
            </h2>
          </div>

          <div className="space-y-6">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`group relative bg-zinc-900/60 border ${step.border} ${step.glow} rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row gap-8 items-start transition-all duration-300`}
              >
                {/* Step number */}
                <div className={`shrink-0 w-16 h-16 ${step.bg} border ${step.border} rounded-2xl flex items-center justify-center`}>
                  <span className={`font-mono text-lg font-bold ${step.accent}`}>{step.number}</span>
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-zinc-400 leading-relaxed">{step.description}</p>
                </div>

                {/* Connector */}
                {index < steps.length - 1 && (
                  <div className="hidden sm:block absolute left-[3.25rem] top-full w-px h-6 bg-gradient-to-b from-zinc-700 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The AI Team ───────────────────────────────────────────────── */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 border-t border-zinc-800/50 relative">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-indigo-600/3 rounded-full blur-[180px]" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-xs font-semibold text-blue-400 tracking-widest uppercase mb-4">
              Your AI Workforce
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              Five Chiefs. 37 specialists.
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Each Chief leads a department of sub-agents that work around the clock — no overtime, no sick days, no micromanagement.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {chiefs.map((chief) => (
              <div
                key={chief.codename}
                className={`group bg-zinc-900/70 border ${chief.border} rounded-2xl p-7 ${chief.glow} hover:bg-zinc-900 transition-all duration-300 flex flex-col`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 ${chief.bg} border ${chief.border} rounded-xl flex items-center justify-center shrink-0`}>
                      <chief.icon className={`h-5 w-5 ${chief.accent}`} />
                    </div>
                    <div>
                      <p className={`font-mono text-sm font-bold tracking-widest ${chief.accent}`}>
                        {chief.codename}
                      </p>
                      <p className="text-zinc-400 text-xs mt-0.5">{chief.role}</p>
                    </div>
                  </div>
                  <span className={`text-xs ${chief.accent} ${chief.bg} border ${chief.border} rounded-full px-2.5 py-1 font-medium shrink-0`}>
                    {chief.subAgents} agents
                  </span>
                </div>

                {/* Tagline */}
                <p className="text-zinc-300 text-sm font-medium mb-4 leading-snug">
                  {chief.tagline}
                </p>

                {/* Capabilities */}
                <ul className="space-y-2.5 mt-auto">
                  {chief.capabilities.map((cap) => (
                    <li key={cap} className="flex items-start gap-2.5 text-sm">
                      <Check className={`h-3.5 w-3.5 ${chief.accent} mt-0.5 shrink-0`} />
                      <span className="text-zinc-400 leading-snug">{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* "More agents" overflow card */}
            <div className="md:col-span-2 lg:col-span-2 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-7 flex flex-col sm:flex-row items-center gap-6">
              {/* Mini grid of colored dots representing sub-agents */}
              <div className="shrink-0 grid grid-cols-7 gap-1.5" aria-hidden="true">
                {Array.from({ length: 37 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${agentDotColors[i % agentDotColors.length]} opacity-70`}
                  />
                ))}
              </div>
              <div>
                <p className="text-white font-semibold text-lg mb-1">37 agents, one team.</p>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Every sub-agent is purpose-built for a specific job — from ad creative generation to order tracking to SEO audits. They share context, handoff tasks, and escalate to you only when it matters.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison ────────────────────────────────────────────────── */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 border-t border-zinc-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-blue-400 tracking-widest uppercase mb-4">Why StoreForge</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Replace your entire operations team.
            </h2>
          </div>
          <div className="space-y-3">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-zinc-500 text-xs mb-1 uppercase tracking-wide">Hiring an agency</p>
                <p className="text-zinc-300 font-medium">Marketing, support &amp; analytics staff</p>
              </div>
              <span className="text-zinc-500 font-semibold whitespace-nowrap line-through decoration-zinc-700">
                &#8377;50,000 &ndash; &#8377;2,00,000/mo
              </span>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-zinc-500 text-xs mb-1 uppercase tracking-wide">Shopify + 6–12 apps</p>
                <p className="text-zinc-300 font-medium">Abandoned cart, SEO, analytics, support plugins</p>
              </div>
              <span className="text-zinc-500 font-semibold whitespace-nowrap line-through decoration-zinc-700">
                &#8377;15,000 &ndash; &#8377;50,000/mo
              </span>
            </div>
            <div className="bg-blue-600/8 border border-blue-500/25 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_40px_-12px_rgba(37,99,235,0.25)]">
              <div>
                <p className="text-blue-400 text-xs mb-1 uppercase tracking-wide">StoreForge AI Agents</p>
                <p className="text-white font-medium">37 agents, all channels, fully autonomous</p>
              </div>
              <span className="text-blue-400 font-bold whitespace-nowrap">Free to start</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 border-t border-zinc-800/50 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
        </div>
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
            Stop managing.
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
              Start growing.
            </span>
          </h2>
          <p className="text-lg text-zinc-400 mb-10 max-w-xl mx-auto leading-relaxed">
            Join Indian merchants who handed their entire business operations to an AI team and reclaimed their time.
          </p>
          <Link href="/sign-up">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-500 text-white gap-2 text-base px-10 py-7 h-auto shadow-[0_0_24px_-4px_rgba(37,99,235,0.5)] hover:shadow-[0_0_32px_-4px_rgba(37,99,235,0.7)] transition-shadow"
            >
              Launch Your AI Store — Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-sm text-zinc-600 mt-6">No credit card &middot; Store live in 30 seconds &middot; Cancel anytime</p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-zinc-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-zinc-300">StoreForge</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-400">
              <Link href="/sign-up" className="hover:text-zinc-200 transition-colors">Get Started</Link>
              <Link href="/sign-in" className="hover:text-zinc-200 transition-colors">Sign In</Link>
              <span className="text-zinc-600 cursor-default" title="Coming soon">Privacy</span>
              <span className="text-zinc-600 cursor-default" title="Coming soon">Terms</span>
            </div>
            <p className="text-sm text-zinc-400">
              &copy; {new Date().getFullYear()} StoreForge. Built in India.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
