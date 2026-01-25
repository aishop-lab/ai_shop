import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Store,
  CreditCard,
  Truck,
  BarChart3,
  Shield,
  ArrowRight,
  Check,
  Zap,
  Globe,
  Smartphone
} from 'lucide-react'

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Setup',
    description: 'Describe your business and let AI create product descriptions, suggest prices, and generate store content.'
  },
  {
    icon: CreditCard,
    title: 'Indian Payments',
    description: 'Accept UPI, cards, net banking, and COD through Razorpay. Built for Indian customers.'
  },
  {
    icon: Truck,
    title: 'Shipping Integration',
    description: 'Automatic Shiprocket integration for nationwide delivery with real-time tracking.'
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track sales, revenue, and customer behavior with detailed analytics and reports.'
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security with automatic SSL, secure payments, and data protection.'
  },
  {
    icon: Globe,
    title: 'Your Own Domain',
    description: 'Get yourstore.storeforge.site instantly, or connect your custom domain.'
  }
]

const pricingFeatures = [
  'Unlimited products',
  'AI product descriptions',
  'UPI & card payments',
  'Shiprocket shipping',
  'Custom subdomain',
  'Analytics dashboard',
  'GST invoices',
  'Email notifications',
  '24/7 support'
]

export default function LandingPage() {
  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Store className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">StoreForge</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/sign-in">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/sign-up">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            AI-Powered E-commerce
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Build Your Online Store
            <br />
            <span className="text-primary">In Minutes, Not Days</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            The AI-first e-commerce platform built for Indian merchants. Accept payments, ship products,
            and grow your business - all with intelligent automation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2 text-lg px-8 py-6">
                Start Free Trial
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                See Features
              </Button>
            </Link>
          </div>
          <p className="text-sm text-slate-500 mt-4">
            No credit card required. Setup in 10 minutes.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-2">1000+</div>
              <div className="text-slate-400">Active Stores</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-2">50K+</div>
              <div className="text-slate-400">Products Listed</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-2">10M+</div>
              <div className="text-slate-400">GMV Processed</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-2">4.9/5</div>
              <div className="text-slate-400">Merchant Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything You Need to Sell Online
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              From AI-powered product management to integrated shipping, we handle the complexity
              so you can focus on your business.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Launch Your Store in 3 Steps
            </h2>
            <p className="text-xl text-slate-600">
              Our AI-powered onboarding makes setup effortless
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Describe Your Business</h3>
              <p className="text-slate-600">
                Tell us about your products and target customers. Our AI understands your needs.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Upload Products</h3>
              <p className="text-slate-600">
                Add product photos and let AI generate titles, descriptions, and price suggestions.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Start Selling</h3>
              <p className="text-slate-600">
                Your store is live with payments and shipping ready. Share your link and start selling!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Preview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Smartphone className="h-4 w-4" />
                Mobile-First Design
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                Beautiful Stores That Work Everywhere
              </h2>
              <p className="text-xl text-slate-600 mb-6">
                Your customers shop on mobile. Our themes are optimized for phones, tablets, and
                desktops - ensuring a seamless experience everywhere.
              </p>
              <ul className="space-y-4">
                {['4 professional themes', 'Custom colors & fonts', 'Fast loading times', 'SEO optimized'].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl p-8">
                <div className="bg-white rounded-2xl shadow-2xl p-4 max-w-xs mx-auto">
                  <div className="aspect-[9/16] bg-slate-100 rounded-xl flex items-center justify-center">
                    <div className="text-center text-slate-400">
                      <Store className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">Store Preview</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-slate-400 mb-12">
            Start free, upgrade as you grow. No hidden fees.
          </p>
          <div className="bg-white text-slate-900 rounded-3xl p-8 sm:p-12 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              Most Popular
            </div>
            <div className="mb-6">
              <span className="text-5xl font-bold">Free</span>
              <span className="text-slate-500 ml-2">to start</span>
            </div>
            <p className="text-slate-600 mb-8">
              Only pay transaction fees when you make sales. 2% per transaction.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {pricingFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-left">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <Link href="/sign-up">
              <Button size="lg" className="w-full text-lg py-6">
                Create Your Store
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Ready to Start Selling?
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            Join thousands of Indian merchants who trust StoreForge for their online business.
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="gap-2 text-lg px-8 py-6">
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              <span className="font-bold">StoreForge</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <Link href="/privacy" className="hover:text-primary">Privacy</Link>
              <Link href="/terms" className="hover:text-primary">Terms</Link>
              <Link href="/contact" className="hover:text-primary">Contact</Link>
            </div>
            <p className="text-sm text-slate-500">
              Made in India
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}
