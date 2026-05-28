import { useState } from 'react';
import { 
  HelpCircle, Search, Mail, MessageSquare, BookOpen, 
  ChevronDown, ChevronUp, Sparkles, FileText, Globe
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const HelpPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // FAQs list mock
  const faqs: FaqItem[] = [
    {
      id: 1,
      category: 'Research',
      question: 'How does the autonomous multi-agent deep research process work?',
      answer: 'When you ask a research question, our pipeline triggers multiple agents. The Retrieval Agent extracts relevant contexts from your uploaded files. The Research Agent triggers search queries (e.g. via Tavily) to scrape current web articles. The Critic Agent cross-references these details to detect hallucinations, and the Summary Agent formats a final grounded report.'
    },
    {
      id: 2,
      category: 'Security',
      question: 'Is my uploaded data safe and private?',
      answer: 'Yes. All uploads are stored in an isolated secure AWS S3 bucket and private Qdrant vector database. Data is never shared with third-party providers or used to train public LLM models. Enterprise users can also enable automated PII (Personally Identifiable Information) scrubbing.'
    },
    {
      id: 3,
      category: 'Models',
      question: 'How does the fallback routing gateway function?',
      answer: 'ResearchMind utilizes LiteLLM as an internal router gateway. If a selected primary provider (e.g. Groq) encounters connection timeouts or rate limits, the request automatically falls back to secondary options (e.g. Google Gemini or Anthropic Claude) under the hood to ensure service continuity.'
    },
    {
      id: 4,
      category: 'Library',
      question: 'What file formats are supported for document indexing?',
      answer: 'We support PDF, DOCX (Word), TXT, website URLs, and YouTube video transcripts. Upon ingestion, documents are chunked and converted into vector embeddings for semantic lookup.'
    },
    {
      id: 5,
      category: 'Billing',
      question: 'Can I cancel or upgrade my subscription plan anytime?',
      answer: 'Absolutely. You can manage your subscription settings directly inside the Settings page or billing portal. Upgrades are applied instantly, and cancellations take effect at the end of the billing period.'
    }
  ];

  const handleToggleFaq = (id: number) => {
    setExpandedFaq(prev => prev === id ? null : id);
  };

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppShell>
      <div className="max-w-[900px] mx-auto space-y-6 lg:space-y-8 font-sans antialiased">
        
        {/* Top Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Help & Documentation Center
          </h1>
          <p className="text-sm text-neutral-500">
            Search our frequently asked questions, configuration guides, and security policies.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search FAQs (e.g., 'security', 'ingestion', 'routing')..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#16a34a] bg-white transition-all text-neutral-900 placeholder-neutral-400 shadow-inner"
          />
        </div>

        {/* FAQ Accordions List */}
        <div className="space-y-4">
          <h2 className="font-bold text-base text-neutral-850 uppercase tracking-wider flex items-center gap-2">
            <HelpCircle className="h-4.5 w-4.5 text-[#16a34a]" />
            Frequently Asked Questions
          </h2>

          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const isExpanded = expandedFaq === faq.id;
              return (
                <div 
                  key={faq.id}
                  className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all"
                >
                  <button
                    onClick={() => handleToggleFaq(faq.id)}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-bold text-sm text-neutral-850 hover:bg-neutral-50/50 transition-colors cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <div className="text-neutral-400">
                      {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-neutral-100 p-4 sm:p-5 bg-neutral-50/30 text-xs sm:text-sm text-neutral-650 leading-relaxed font-semibold"
                      >
                        {faq.answer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            
            {filteredFaqs.length === 0 && (
              <div className="text-center py-10 border border-dashed border-neutral-200 rounded-xl bg-white text-neutral-450 font-medium">
                No FAQs matches your search parameters. Try searching general topics.
              </div>
            )}
          </div>
        </div>

        {/* Contact Support Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col justify-between items-start gap-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-neutral-850 flex items-center gap-1.5">
                <Mail className="h-4.5 w-4.5 text-[#16a34a]" />
                Email Support Ticket
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                Submit a question or bug report directly to our core engineering team. Average turnaround is under 24 hours.
              </p>
            </div>
            <button className="bg-neutral-950 hover:bg-neutral-850 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer">
              Send Email Support
            </button>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col justify-between items-start gap-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-neutral-850 flex items-center gap-1.5">
                <MessageSquare className="h-4.5 w-4.5 text-[#16a34a]" />
                Join Community Slack
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                Chat with other AI builders, request features, and get updates on system fallbacks and vector indexes.
              </p>
            </div>
            <button className="bg-[#16a34a] hover:bg-green-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer">
              Join Discord/Slack Community
            </button>
          </div>
        </div>

      </div>
    </AppShell>
  );
};

export default HelpPage;
