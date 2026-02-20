import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import claudeIcon from '../../assets/icons/claude-color.svg';
import geminiIcon from '../../assets/icons/gemini-color.svg';
import kimiIcon from '../../assets/icons/kimi-color.svg';
import ollamaIcon from '../../assets/icons/ollama.svg';
import openaiIcon from '../../assets/icons/openai.svg';
import { FireflyHero } from '../components/FireflyHero';

export function FireflyLanding(props: { onGetStarted?: () => void }) {
    const { onGetStarted } = props;
    const [isExiting, setIsExiting] = useState(false);

    const handleGetStarted = () => {
        if (isExiting) return;
        setIsExiting(true);
    };

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
                {/* FireflyHero — absolute layer, sits visually behind the h1 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                    <FireflyHero isExiting={isExiting} onExitComplete={onGetStarted} />
                </div>

                <div className="max-w-4xl mx-auto animate-fade-in-up relative">

                    <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-text-primary leading-[1.1] flex flex-col md:block items-center justify-center">
                        <span className="brand-firefly mr-0 md:mr-4">Firefly</span>
                        <span>Narrative</span>
                    </h1>

                    {/* Subtitle + CTA — mt: Tailwind mt-24 (96px) + 15px intentional drop = 111px */}
                    <div className="mt-[111px] space-y-8">
                        <p className="text-2xl md:text-3xl text-text-secondary max-w-3xl mx-auto font-light leading-relaxed animate-fade-in-up delay-200" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                            Capture the ghost in the machine, discover the narrative.<br />A living trace of your intent, woven into every commit.
                        </p>

                        {/* pt-[50px]: extra breathing room above the CTA button */}
                        <div className="pt-[50px] relative z-20 animate-fade-in-up delay-300">
                            <button
                                type="button"
                                id="cta-get-started"
                                onClick={handleGetStarted}
                                disabled={isExiting}
                                className="bg-text-primary text-bg-primary px-8 py-3 rounded-full font-medium text-lg inline-flex items-center gap-2 transition-all duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] active:duration-75 active:scale-95 hover:scale-105 shadow-lg hover:shadow-[0_0_20px_rgba(var(--text-primary-rgb),0.3)] disabled:opacity-60 disabled:scale-100 disabled:cursor-default"
                            >
                                Get Started <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
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
