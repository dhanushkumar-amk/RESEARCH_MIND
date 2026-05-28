import { Check, Info, Shield, Zap, Sparkles } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';

interface Plan {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  isPopular: boolean;
}

const PricingPage = () => {

  const plans: Plan[] = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      desc: 'Essential multi-agent research tools for individuals and starters.',
      features: [
        '5 Deep Research queries per day',
        'Upload up to 5 documents (Max 10MB each)',
        'Basic vector index routing',
        'Standard LLM fallback routing (Groq tier)',
        'Community FAQ support',
      ],
      cta: 'Get Started Free',
      isPopular: false,
    },
    {
      name: 'Pro',
      price: '$39',
      period: 'per month',
      desc: 'Complete power features for professional researchers and builders.',
      features: [
        'Unlimited Deep Research queries',
        'Upload up to 500 documents (Max 50MB each)',
        'Enhanced semantic reranking & hybrid search',
        'Premium LLM endpoints (Claude 3.5 & Gemini Pro)',
        'Export custom PDF research reports',
        'Nightly ETL index refresh cycles',
        'Priority email support (under 4 hours)',
      ],
      cta: 'Upgrade to Pro',
      isPopular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'tailored contracts',
      desc: 'Full workspace governance, custom API setups, and compliance checks.',
      features: [
        'Unlimited documents & vector spaces',
        'Dedicated secure Qdrant DB cluster isolation',
        'Custom local LLM routers configuration',
        'Active PII scrubbing & guardrails control',
        'Dedicated Slack channel support',
        'SLA guaranteed 99.9% uptime',
        'Custom training data integration services',
      ],
      cta: 'Contact Enterprise Sales',
      isPopular: false,
    },
  ];

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto space-y-6 lg:space-y-8 font-sans antialiased">
        
        {/* Top Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2.5">
          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-100">
            <Sparkles className="h-3 w-3" />
            Simple Transparent SaaS Pricing
          </span>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-neutral-900 tracking-tight leading-tight">
            Flexible plans for serious deep research
          </h1>
          <p className="text-sm text-neutral-500">
            Select a plan to accelerate your information retrieval workflows. Upgrade, downgrade, or cancel anytime.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {plans.map((plan, idx) => (
            <div 
              key={plan.name}
              className={`bg-white border rounded-2xl p-6 flex flex-col justify-between relative shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all ${
                plan.isPopular 
                  ? 'border-[#16a34a] ring-2 ring-[#16a34a]/10 scale-102 z-10' 
                  : 'border-neutral-200 hover:border-neutral-350'
              }`}
            >
              {plan.isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#16a34a] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                  Most Popular
                </span>
              )}

              <div className="space-y-5">
                {/* Plan meta details */}
                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg text-neutral-900">{plan.name}</h3>
                  <p className="text-xs text-neutral-450 leading-relaxed font-semibold">{plan.desc}</p>
                </div>

                {/* Price block */}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl lg:text-4xl font-black text-neutral-900 tracking-tight">{plan.price}</span>
                  <span className="text-xs font-bold text-neutral-400">/ {plan.period}</span>
                </div>

                {/* Divider */}
                <div className="border-t border-neutral-100" />

                {/* Features list */}
                <ul className="space-y-3.5 text-xs text-neutral-700 font-semibold">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5">
                      <div className="h-4.5 w-4.5 rounded-full bg-green-50 text-[#16a34a] flex items-center justify-center flex-shrink-0 mt-0.5 border border-green-100">
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Action button */}
              <button 
                className={`w-full font-bold py-2.5 rounded-xl text-xs mt-6 transition-all cursor-pointer ${
                  plan.isPopular 
                    ? 'bg-[#16a34a] text-white hover:bg-green-700 shadow-md shadow-green-600/10' 
                    : 'bg-neutral-950 text-white hover:bg-neutral-850 shadow-sm'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Feature Comparison highlight card */}
        <div className="bg-neutral-50/50 border border-neutral-200 rounded-2xl p-6 mt-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-neutral-850 flex items-center gap-1.5">
              <Shield className="h-4.5 w-4.5 text-[#16a34a]" />
              Enterprise Governance & Security
            </h4>
            <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
              Need HIPAA, SOC2 Type II compliance, or completely offline local model setups? Our sales engineers can design isolated secure virtual private networks.
            </p>
          </div>

          <button className="bg-white border border-neutral-200 hover:border-neutral-350 text-neutral-700 font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-sm cursor-pointer whitespace-nowrap">
            Schedule a Demo
          </button>
        </div>

      </div>
    </AppShell>
  );
};

export default PricingPage;
