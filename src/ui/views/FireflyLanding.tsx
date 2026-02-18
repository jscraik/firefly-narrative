import { ArrowRight } from 'lucide-react';
import claudeIcon from '../../assets/icons/claude-color.svg';
import geminiIcon from '../../assets/icons/gemini-color.svg';
import kimiIcon from '../../assets/icons/kimi-color.svg';
import ollamaIcon from '../../assets/icons/ollama.svg';
import openaiIcon from '../../assets/icons/openai.svg';

export function FireflyLanding() {
    return (
        <div className="min-h-full w-full bg-bg-primary text-text-primary font-sans relative overflow-hidden flex flex-col transition-colors duration-300">
            {/* Background Dots */}
            <div
                className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none text-text-tertiary"
                style={{
                    backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}
            />



            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10 mt-12">
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">

                    <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-text-primary leading-[1.1] flex flex-col md:block items-center justify-center">
                        <span className="brand-firefly mr-0 md:mr-4 animate-brand-breathe">Firefly</span>
                        <span>Narrative</span>
                    </h1>

                    <p className="text-2xl md:text-3xl text-text-secondary max-w-2xl mx-auto font-light leading-relaxed animate-fade-in-up delay-200">
                        A new way to discover the narrative, share and collaborate across GIT and Agent Traces.
                    </p>

                    <div className="pt-8 animate-fade-in-up delay-300">
                        <button type="button" className="bg-text-primary text-bg-primary px-8 py-3 rounded-full font-medium text-lg inline-flex items-center gap-2 transition-all duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] active:duration-75 active:scale-95 hover:scale-105 shadow-lg hover:shadow-[0_0_20px_rgba(var(--text-primary-rgb),0.3)]">
                            Get Started <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>

                </div>
            </main>

            {/* Footer / Logos Section */}
            <footer className="w-full py-16 px-4 relative z-10 border-t border-transparent animate-fade-in-up delay-500">
                <div className="max-w-5xl mx-auto">
                    <p className="text-text-tertiary font-medium mb-8 text-lg">
                        Works with your favorite agents
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-12 opacity-90">
                        {/* OpenAI */}
                        <div className="flex items-center gap-3 text-xl font-semibold text-text-secondary animate-float delay-100">
                            <img src={openaiIcon} alt="OpenAI" className="w-8 h-8 opacity-80" />
                            <span>OpenAI Codex CLI</span>
                        </div>

                        {/* Claude */}
                        <div className="flex items-center gap-3 text-xl font-semibold text-text-secondary animate-float delay-300">
                            <img src={claudeIcon} alt="Claude" className="w-8 h-8" />
                            <span>Claude Code</span>
                        </div>

                        {/* Gemini */}
                        <div className="flex items-center gap-3 text-xl font-semibold text-text-secondary animate-float delay-500">
                            <img src={geminiIcon} alt="Gemini" className="w-8 h-8" />
                            <span>Gemini CLI</span>
                        </div>

                        {/* Kimi */}
                        <div className="flex items-center gap-3 text-xl font-semibold text-text-secondary animate-float delay-700">
                            <img src={kimiIcon} alt="Kimi" className="w-8 h-8" />
                            <span>Kimi CLI</span>
                        </div>

                        {/* Ollama */}
                        <div className="flex items-center gap-3 text-xl font-semibold text-text-secondary animate-float delay-200">
                            <img src={ollamaIcon} alt="Ollama" className="w-8 h-8 dark:invert opacity-80" />
                            <span>Ollama</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
