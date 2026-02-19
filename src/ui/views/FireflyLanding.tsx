import claudeIcon from '../../assets/icons/claude-color.svg';
import geminiIcon from '../../assets/icons/gemini-color.svg';
import kimiIcon from '../../assets/icons/kimi-color.svg';
import ollamaIcon from '../../assets/icons/ollama.svg';
import openaiIcon from '../../assets/icons/openai.svg';
import { FireflyHero } from '../components/FireflyHero';


export function FireflyLanding(props: { onGetStarted?: () => void }) {
    const { onGetStarted } = props;

    return (
        <div className="min-h-full w-full bg-bg-primary text-text-primary font-sans relative overflow-hidden flex flex-col transition-colors duration-300">
            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full pt-12">
                <FireflyHero onCtaClick={onGetStarted} />
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
