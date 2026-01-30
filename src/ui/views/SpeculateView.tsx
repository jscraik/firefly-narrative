export function SpeculateView() {
  return (
    <div className="h-full overflow-auto p-10 bg-[#f5f5f4]">
      <div className="mx-auto max-w-5xl">
        <div className="card p-5">
          <div className="section-header">SPECULATIVE QUERY</div>
          <div className="mt-2 text-2xl font-semibold text-stone-800">What if we use websockets instead of polling?</div>
        </div>

        <div className="mt-10 card p-6">
          <svg
            viewBox="0 0 1200 420"
            className="h-[420px] w-full"
            role="img"
            aria-labelledby="speculative-chart-title"
          >
            <title id="speculative-chart-title">Speculative architecture outcomes chart</title>
            {/* baseline */}
            <line x1="60" y1="300" x2="1140" y2="300" stroke="#e7e5e4" strokeWidth="2" />
            <circle cx="60" cy="300" r="7" fill="#a8a29e" />
            <text x="40" y="330" fill="#78716c" fontSize="14">
              current
            </text>

            {/* arcs */}
            <path d="M 60 300 C 300 100, 600 80, 900 130" fill="none" stroke="#0ea5e9" strokeWidth="3" opacity="0.7" />
            <path d="M 60 300 C 320 160, 620 150, 760 170" fill="none" stroke="#10b981" strokeWidth="3" opacity="0.6" />
            <path d="M 60 300 C 340 250, 600 250, 710 250" fill="none" stroke="#f59e0b" strokeWidth="3" opacity="0.5" />
            <path d="M 60 300 C 260 360, 520 380, 680 360" fill="none" stroke="#78716c" strokeWidth="3" opacity="0.4" />
            <path d="M 60 300 C 220 410, 480 430, 620 410" fill="none" stroke="#a8a29e" strokeWidth="3" opacity="0.3" />

            {/* nodes + labels */}
            <circle cx="900" cy="130" r="7" fill="#0ea5e9" />
            <text x="920" y="126" fill="#1c1917" fontSize="16" fontWeight="500">
              WebSocket + fallback
            </text>
            <text x="920" y="148" fill="#059669" fontSize="12">
              recommended · +47% · -8 PRs
            </text>

            <circle cx="760" cy="170" r="7" fill="#10b981" />
            <text x="780" y="166" fill="#1c1917" fontSize="16" fontWeight="500">
              Direct WebSocket
            </text>
            <text x="780" y="188" fill="#d97706" fontSize="12">
              caution · breaks offline
            </text>

            <circle cx="710" cy="250" r="7" fill="#f59e0b" />
            <text x="730" y="246" fill="#1c1917" fontSize="16" fontWeight="500">
              Server-Sent Events
            </text>
            <text x="730" y="268" fill="#78716c" fontSize="12">
              viable · +31% · -5 PRs
            </text>

            <circle cx="680" cy="360" r="7" fill="#78716c" />
            <text x="700" y="356" fill="#57534e" fontSize="16" fontWeight="500">
              Socket.io
            </text>
            <text x="700" y="378" fill="#dc2626" fontSize="12">
              breaks auth PR #47
            </text>

            <circle cx="620" cy="410" r="7" fill="#a8a29e" />
            <text x="640" y="406" fill="#78716c" fontSize="16" fontWeight="500">
              GraphQL Subs
            </text>

            <text x="1100" y="290" textAnchor="end" fill="#a8a29e" fontSize="14">
              future →
            </text>
          </svg>

          <div className="mt-4 text-sm text-stone-500">
            MVP note: this screen is static. The intent is to eventually simulate narrative "futures" from the codebase's
            past + current context.
          </div>
        </div>
      </div>
    </div>
  );
}
