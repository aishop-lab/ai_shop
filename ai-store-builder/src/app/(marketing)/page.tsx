import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Store,
  ArrowRight,
  Check,
  Megaphone,
  TrendingUp,
  Headphones,
  BarChart3,
  Settings,
  Zap,
  Bot,
} from 'lucide-react'

const agents = [
  {
    icon: Megaphone,
    name: 'Marketing Agent',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    glowHover: 'hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.15)]',
    description: 'Runs Meta & Google ad campaigns, creates content, manages social media.',
    highlight: 'Auto-optimizes ad spend based on ROAS',
  },
  {
    icon: TrendingUp,
    name: 'Sales Agent',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    glowHover: 'hover:shadow-[0_0_30px_-5px_rgba(52,211,153,0.15)]',
    description: 'Recovers abandoned carts, creates targeted discounts, segments customers.',
    highlight: 'Sends personalized recovery emails with dynamic discounts',
  },
  {
    icon: Headphones,
    name: 'Support Agent',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    glowHover: 'hover:shadow-[0_0_30px_-5px_rgba(96,165,250,0.15)]',
    description: 'Handles customer inquiries across chat, email, and WhatsApp.',
    highlight: 'Resolves 80% of queries without merchant involvement',
  },
  {
    icon: BarChart3,
    name: 'Analytics Agent',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    glowHover: 'hover:shadow-[0_0_30px_-5px_rgba(251,191,36,0.15)]',
    description: 'Surfaces insights, detects anomalies, generates daily reports.',
    highlight: 'Alerts you when metrics deviate from normal patterns',
  },
  {
    icon: Settings,
    name: 'Technical Agent',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    glowHover: 'hover:shadow-[0_0_30px_-5px_rgba(34,211,238,0.15)]',
    description: 'Optimizes SEO, generates structured data, audits images.',
    highlight: 'Maintains store health score and fixes issues automatically',
  },
]

const steps = [
  {
    number: '1',
    title: 'Describe Your Store',
    description: 'Tell us your business name and category. Pick a theme. That\'s it.',
  },
  {
    number: '2',
    title: 'Upload Products',
    description: 'Drop product images. AI extracts titles, descriptions, prices, and categories.',
  },
  {
    number: '3',
    title: 'Agents Take Over',
    description: 'Your AI team starts working immediately — optimizing SEO, recovering carts, answering customers.',
  },
]

const pricingTiers = [
  {
    name: 'Free',
    price: '0',
    period: '/month',
    features: [
      '50 products',
      '5 AI agent actions/day',
      'Website chat support',
      'Basic analytics',
      'SEO optimization',
    ],
    cta: 'Get Started Free',
    href: '/sign-up',
    popular: false,
  },
  {
    name: 'Pro',
    price: '2,999',
    period: '/month',
    features: [
      'Unlimited products',
      'Unlimited agent actions',
      'Email + WhatsApp support channels',
      'Advanced analytics & reports',
      'Priority agent execution',
    ],
    cta: 'Start Pro Trial',
    href: '/sign-up?plan=pro',
    popular: true,
  },
  {
    name: 'Business',
    price: '9,999',
    period: '/month',
    features: [
      'Everything in Pro',
      'Meta & Google Ads integration',
      'Custom agent configurations',
      'Dedicated support',
      'API access',
    ],
    cta: 'Contact Sales',
    href: '/sign-up?plan=business',
    popular: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Bot className="h-4.5 w-4.5 text-white" />
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

      {/* Hero Section */}
      <section className="relative pt-32 sm:pt-40 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-600/8 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[100px]" />
        </div>

        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
            <Zap className="h-3.5 w-3.5" />
            <span>5 AI Agents. One Command Center.</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
            Hire an AI team.
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent">
              Launch a store in 30 seconds.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Five autonomous AI agents run your entire online business — marketing, sales, support,
            analytics, and technical operations. You provide the products. They handle everything else.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white gap-2 text-base px-8 py-6 h-auto shadow-[0_0_20px_-3px_rgba(37,99,235,0.5)] hover:shadow-[0_0_25px_-3px_rgba(37,99,235,0.6)] transition-shadow">
                Launch Your Store
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button
                variant="outline"
                size="lg"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white bg-transparent text-base px-8 py-6 h-auto"
              >
                See How It Works
              </Button>
            </Link>
          </div>
          <p className="text-sm text-zinc-500 mt-6">
            Free to start &middot; No credit card required &middot; Store live in 30 seconds
          </p>
        </div>
      </section>

      {/* Agent Showcase Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        {/* Subtle section glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-blue-600/3 rounded-full blur-[150px]" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-blue-400 tracking-wide uppercase mb-3">Your AI Workforce</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              Meet Your AI Team
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Five specialized agents work 24/7, coordinating with each other to grow your business.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agents.map((agent) => (
              <div
                key={agent.name}
                className={`group bg-zinc-900/80 border ${agent.border} rounded-xl p-6 hover:bg-zinc-900 transition-all duration-300 ${agent.glowHover}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 ${agent.bg} rounded-lg flex items-center justify-center border ${agent.border}`}>
                    <agent.icon className={`h-5 w-5 ${agent.color}`} />
                  </div>
                  <h3 className={`text-base font-semibold ${agent.color}`}>{agent.name}</h3>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                  {agent.description}
                </p>
                <div className="flex items-start gap-2 text-sm bg-zinc-800/50 rounded-lg px-3 py-2.5 border border-zinc-700/50">
                  <Zap className={`h-3.5 w-3.5 ${agent.color} mt-0.5 shrink-0`} />
                  <span className="text-zinc-300 text-xs leading-relaxed">{agent.highlight}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-zinc-800/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-blue-400 tracking-wide uppercase mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              Live in 30 Seconds. Optimized 24/7.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative text-center">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-zinc-700 to-transparent" />
                )}
                <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-[0_0_20px_-5px_rgba(37,99,235,0.2)]">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-zinc-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-blue-400 tracking-wide uppercase mb-3">Why Us</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              Replace Your Entire Operations Team
            </h2>
          </div>
          <div className="space-y-3">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-zinc-400 text-sm mb-1">Hiring an agency</p>
                <p className="text-zinc-300 font-medium">Marketing, support, analytics staff</p>
              </div>
              <span className="text-zinc-400 font-semibold text-lg whitespace-nowrap line-through decoration-zinc-600">
                &#8377;50,000 &ndash; &#8377;2,00,000/mo
              </span>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-zinc-400 text-sm mb-1">Shopify + 6-12 apps</p>
                <p className="text-zinc-300 font-medium">Abandoned cart, SEO, analytics, support plugins</p>
              </div>
              <span className="text-zinc-400 font-semibold text-lg whitespace-nowrap line-through decoration-zinc-600">
                &#8377;15,000 &ndash; &#8377;50,000/mo
              </span>
            </div>
            <div className="bg-blue-600/8 border border-blue-500/25 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_30px_-10px_rgba(37,99,235,0.2)]">
              <div>
                <p className="text-blue-400 text-sm mb-1">StoreForge AI Agents</p>
                <p className="text-white font-medium">5 agents, all channels, fully autonomous</p>
              </div>
              <span className="text-blue-400 font-bold text-lg whitespace-nowrap">Free to start</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-zinc-800/50 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/3 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-blue-400 tracking-wide uppercase mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              Simple Pricing
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-xl p-6 sm:p-8 transition-all duration-300 ${
                  tier.popular
                    ? 'bg-zinc-900 border-2 border-blue-500/40 shadow-[0_0_40px_-10px_rgba(37,99,235,0.2)]'
                    : 'bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-[0_0_15px_-3px_rgba(37,99,235,0.5)]">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">{tier.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-bold text-white">&#8377;{tier.price}</span>
                    <span className="text-zinc-400 text-sm">{tier.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                      <span className="text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={tier.href}>
                  <Button
                    className={`w-full ${
                      tier.popular
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)]'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                    }`}
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-zinc-800/50 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Ready to run your business on autopilot?
          </h2>
          <p className="text-lg text-zinc-400 mb-8 max-w-xl mx-auto">
            Join merchants who replaced their entire operations team with 5 AI agents.
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white gap-2 text-base px-8 py-6 h-auto shadow-[0_0_20px_-3px_rgba(37,99,235,0.5)] hover:shadow-[0_0_25px_-3px_rgba(37,99,235,0.6)] transition-shadow">
              Launch Your Store Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
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
              <span className="text-zinc-500 cursor-default" title="Coming soon">Privacy</span>
              <span className="text-zinc-500 cursor-default" title="Coming soon">Terms</span>
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
