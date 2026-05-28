import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Check, ChevronRight, ChevronLeft, Upload, 
  Globe, Cpu, Brain, Rocket, ShieldCheck, Database
} from 'lucide-react';
import { ROUTES } from '@/constants';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1: Selected Topics
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const availableTopics = [
    'Solid-State Battery Tech', 'Post-Quantum Cryptography',
    'Sub-Orbital Launch Vehicles', 'Biofuel Propellants',
    'KV Cache Optimization', 'Transformer Quantization',
    'Autonomous Driving L3/L4', 'Fusion Energy Physics',
    'Graphene Superconductors', 'CRISPR Gene Therapies'
  ];

  // Step 2: Ingested source
  const [firstDocName, setFirstDocName] = useState('');
  const [firstUrl, setFirstUrl] = useState('');

  // Step 3: LLM Model
  const [selectedModel, setSelectedModel] = useState('groq-llama-3.3-70b-versatile');
  const modelsList = [
    { id: 'groq-llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', desc: 'Fast inference, optimal outline synthesis', speed: 'Very Fast', cost: 'Free Tier' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Google)', desc: 'Huge 2M context window, great for large papers', speed: 'Moderate', cost: 'Free Tier' },
    { id: 'openrouter-claude-3-5-sonnet', name: 'Claude 3.5 Sonnet (Anthropic)', desc: 'Highest reasoning and accuracy scores', speed: 'Fast', cost: 'Pro Tier' },
  ];

  const handleTopicToggle = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const handleNextStep = () => {
    if (step < 3) {
      setStep(prev => prev + 1);
    } else {
      // Done Onboarding! Save state/flag and navigate to dashboard
      localStorage.setItem('researchmind.onboarded', 'true');
      navigate(ROUTES.DASHBOARD);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans antialiased relative flex flex-col justify-center items-center py-10 px-4 overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-green-500/[0.02] rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-green-500/[0.01] rounded-full blur-[100px] pointer-events-none" />

      {/* Brand logo */}
      <div className="flex items-center gap-2 mb-6 text-center select-none">
        <div className="bg-[#16a34a] text-white p-2 rounded-lg shadow-sm">
          <Brain className="h-5 w-5" />
        </div>
        <span className="font-extrabold text-lg text-neutral-900">ResearchMind Workspace</span>
      </div>

      {/* Main wizard wrapper */}
      <div className="max-w-xl w-full bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-6">
        
        {/* Progress indicator at top */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
            <span>Step {step} of 3</span>
            <span>{step === 1 ? 'Configure Interests' : step === 2 ? 'Upload Source' : 'Select Core Model'}</span>
          </div>
          
          <div className="flex gap-2">
            {[1, 2, 3].map(sIdx => (
              <div 
                key={sIdx} 
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  sIdx <= step ? 'bg-[#16a34a]' : 'bg-neutral-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Dynamic content rendering depending on active step */}
        <div className="min-h-[260px] flex flex-col justify-center">
          
          {/* STEP 1: Choose research topics */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-neutral-950 flex items-center gap-1.5">
                  <Rocket className="h-5 w-5 text-[#16a34a]" />
                  What are you researching?
                </h2>
                <p className="text-xs text-neutral-500">
                  Select your core topics. Our agents will auto-tune search index priorities for these fields.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1.5">
                {availableTopics.map(topic => {
                  const isSel = selectedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => handleTopicToggle(topic)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        isSel 
                          ? 'bg-green-50 border-[#16a34a] text-[#16a34a]' 
                          : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-350'
                      }`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Ingest first source */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-neutral-950 flex items-center gap-1.5">
                  <Database className="h-5 w-5 text-[#16a34a]" />
                  Ingest your first document
                </h2>
                <p className="text-xs text-neutral-500">
                  Upload a PDF paper, or paste a reference URL web page to populate your vector database library.
                </p>
              </div>

              <div className="space-y-4 pt-1.5">
                {/* File picker */}
                <div className="border border-dashed border-neutral-200 rounded-2xl p-4 text-center hover:bg-neutral-50/50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    id="onboarding-file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setFirstDocName(e.target.files[0].name);
                      }
                    }}
                  />
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-50 border border-neutral-100 rounded-lg text-neutral-600">
                      <Upload className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-neutral-800">
                        {firstDocName || 'Upload a PDF or Word document'}
                      </p>
                      <p className="text-[10px] text-neutral-450">Drag and drop file here, or click to browse</p>
                    </div>
                  </div>
                </div>

                {/* URL paste */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Or Paste Research Web URL</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                    <input
                      type="url"
                      placeholder="https://arxiv.org/abs/..."
                      value={firstUrl}
                      onChange={(e) => setFirstUrl(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#16a34a] bg-white text-neutral-900"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Select LLM Model */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-neutral-950 flex items-center gap-1.5">
                  <Cpu className="h-5 w-5 text-[#16a34a]" />
                  Select preferred routing model
                </h2>
                <p className="text-xs text-neutral-500">
                  Choose which model anchors your deep research reports by default. You can change fallbacks in settings.
                </p>
              </div>

              <div className="space-y-2.5 pt-1.5">
                {modelsList.map(m => {
                  const isSel = selectedModel === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                        isSel 
                          ? 'border-[#16a34a] bg-green-50/20' 
                          : 'border-neutral-200 hover:border-neutral-350 bg-white'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-neutral-850">{m.name}</p>
                        <p className="text-[10px] text-neutral-500">{m.desc}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-[#16a34a] bg-green-50 px-1.5 py-0.5 rounded uppercase">
                          {m.speed}
                        </span>
                        <p className="text-[9px] text-neutral-400 mt-1 font-semibold">{m.cost}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

        </div>

        {/* Bottom Actions Row */}
        <div className="flex justify-between items-center pt-4 border-t border-neutral-100">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={step === 1}
            className="px-4 py-2 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 hover:border-neutral-350 hover:bg-neutral-50 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          
          <button
            type="button"
            onClick={handleNextStep}
            className="bg-neutral-950 hover:bg-neutral-850 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-sm"
          >
            <span>{step === 3 ? 'Finish Setup' : 'Next Step'}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default OnboardingPage;
