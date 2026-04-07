import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  FileUp,
  MessageSquare,
  Database,
  Sparkles,
  Zap,
  Layers,
  CheckCircle2,
} from 'lucide-react'
import { useArticles } from '@/hooks/useArticles'

const features = [
  {
    to: '/upload',
    icon: FileUp,
    title: 'Ingest PDFs',
    desc: 'Upload papers and parse with GROBID into structured TEI — titles, abstracts, venues, and links.',
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    to: '/library',
    icon: BookOpen,
    title: 'Library & reviews',
    desc: 'Run intro/metadata, section summaries, and related-work synthesis. Everything is cached per article.',
    accent: 'from-blue-500 to-indigo-600',
  },
  {
    to: '/query',
    icon: MessageSquare,
    title: 'Research chat',
    desc: 'Multi-paper scope, streaming answers, and citations tied to your uploaded library.',
    accent: 'from-violet-500 to-purple-600',
  },
  {
    to: '/metadata',
    icon: Database,
    title: 'Metadata & Excel',
    desc: 'Inspect SQLite paths and browse export-aligned columns — abstract plus LLM intro, summary, and lit review.',
    accent: 'from-amber-500 to-orange-600',
  },
] as const

const steps = [
  { n: '1', title: 'Upload & parse', text: 'Drop PDFs; GROBID extracts TEI and fills the article row (same fields as export).' },
  { n: '2', title: 'Generate insights', text: 'From Library, run tasks for intro, section summary, and literature review.' },
  { n: '3', title: 'Synthesize & export', text: 'Use Chat across papers; export XLSX with TEI + cached LLM columns.' },
]

export default function Dashboard() {
  const { articles, loading } = useArticles()

  const total = articles.length
  const recent = articles.filter((a) => {
    const t = a.parsed_at ? new Date(a.parsed_at).getTime() : 0
    return Date.now() - t < 7 * 24 * 60 * 60 * 1000
  }).length
  const withXml = articles.filter((a) => a.xml && String(a.xml).trim().length > 0).length

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
      {/* Ambient background */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-90 dark:opacity-60"
        style={{
          background:
            'linear-gradient(135deg, #0f172a 0%, #1e1b4b 35%, #312e81 55%, #1e293b 100%)',
          backgroundSize: '200% 200%',
        }}
      />
      <div className="pointer-events-none absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full bg-fuchsia-500/25 blur-[100px] animate-float" />
      <div
        className="pointer-events-none absolute top-1/3 -left-32 h-[380px] w-[380px] rounded-full bg-cyan-500/20 blur-[90px] animate-float"
        style={{ animationDelay: '2s' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-500/25 blur-[80px] animate-float"
        style={{ animationDelay: '4s' }}
      />

      <div className="relative max-w-6xl mx-auto px-6 py-12 md:py-16">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-20">
          <div
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-widest text-slate-300 mb-6 opacity-0 animate-slide-up [animation-fill-mode:forwards] [animation-delay:0ms]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Standalone literature review agent
          </div>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-5 opacity-0 animate-slide-up [animation-fill-mode:forwards] [animation-delay:80ms]"
            style={{ textShadow: '0 2px 40px rgba(0,0,0,0.35)' }}
          >
            From PDF to{' '}
            <span className="bg-gradient-to-r from-cyan-200 via-white to-violet-200 bg-clip-text text-transparent">
              synthesis
            </span>
          </h1>
          <p
            className="text-lg text-slate-300 leading-relaxed opacity-0 animate-slide-up [animation-fill-mode:forwards] [animation-delay:160ms]"
          >
            Parse papers with GROBID, cache LLM-powered summaries and related work, chat across your library, and export
            everything — TEI metadata plus intro, section summary, and literature review — to Excel.
          </p>
          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-3 opacity-0 animate-slide-up [animation-fill-mode:forwards] [animation-delay:240ms]"
          >
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 rounded-2xl bg-white text-slate-900 px-6 py-3.5 text-[15px] font-semibold shadow-lg shadow-black/20 hover:bg-slate-100 transition-transform hover:-translate-y-0.5"
            >
              Start with upload
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/library"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Open library
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-16 md:mb-20 opacity-0 animate-slide-up [animation-fill-mode:forwards] [animation-delay:320ms]"
        >
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
            ))
          ) : (
            [
              { label: 'Articles in library', value: total, icon: Layers },
              { label: 'Added last 7 days', value: recent, icon: Zap },
              { label: 'With TEI XML', value: withXml, icon: FileUp },
              { label: 'LLM workflows', value: 3, icon: Sparkles, sub: 'Intro · summary · lit review' },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm px-4 py-4 text-left hover:border-white/20 transition-colors"
              >
                <s.icon className="w-5 h-5 text-cyan-300/90 mb-2" />
                <p className="text-2xl md:text-3xl font-bold text-white tabular-nums">{s.value}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-1">{s.label}</p>
                {'sub' in s && s.sub && <p className="text-[10px] text-slate-500 mt-0.5">{s.sub}</p>}
              </div>
            ))
          )}
        </div>

        {/* Feature grid */}
        <div className="mb-20 md:mb-24">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-slate-400 mb-10">
            What you can do
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
            {features.map((f, i) => (
              <Link
                key={f.to}
                to={f.to}
                className="group relative rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-7 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 opacity-0 animate-slide-up [animation-fill-mode:forwards]"
                style={{ animationDelay: `${400 + i * 70}ms` }}
              >
                <div
                  className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${f.accent} shadow-lg mb-4`}
                >
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-100 transition-colors">
                  {f.title}
                </h3>
                <p className="text-[13px] text-slate-400 leading-relaxed">{f.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-cyan-300/90 opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Workflow */}
        <div
          className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-transparent px-6 py-10 md:px-12 md:py-12 opacity-0 animate-slide-up [animation-fill-mode:forwards] [animation-delay:680ms]"
        >
          <h2 className="text-center text-xl md:text-2xl font-bold text-white mb-10">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8 md:gap-6">
            {steps.map((step, i) => (
              <div key={step.n} className="relative text-center md:text-left">
                <div className="flex md:block justify-center mb-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-sm shadow-lg">
                    {step.n}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-[13px] text-slate-400 leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-[12px] text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Exports include abstract, intro, section summary, and literature review columns when cached
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center opacity-0 animate-slide-up [animation-fill-mode:forwards] [animation-delay:800ms]">
          <p className="text-slate-500 text-sm mb-4">Configure GROBID URL and models in Settings anytime.</p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 text-cyan-300/90 hover:text-cyan-200 text-[14px] font-medium"
          >
            Open settings <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
