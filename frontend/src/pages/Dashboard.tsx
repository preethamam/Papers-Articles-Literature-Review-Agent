import { BookOpen, FileText, Layers } from 'lucide-react'
import { useArticles } from '@/hooks/useArticles'

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-[12px] text-slate-500 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { articles, loading } = useArticles()

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  const total = articles.length
  const recent = articles.filter((a) => {
    const t = a.parsed_at ? new Date(a.parsed_at).getTime() : 0
    return Date.now() - t < 7 * 24 * 60 * 60 * 1000
  }).length

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of your article library</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Articles" value={total} icon={BookOpen} color="bg-gradient-to-br from-blue-500 to-indigo-600" />
        <StatCard label="Parsed (with XML)" value={total} icon={Layers} color="bg-gradient-to-br from-violet-500 to-purple-600" />
        <StatCard label="Added in last 7 days" value={recent} icon={FileText} color="bg-gradient-to-br from-emerald-500 to-teal-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100">
        <h2 className="font-semibold text-slate-800 mb-4">Quick start</h2>
        <p className="text-slate-600 text-sm">
          Use <strong>Upload</strong> to add PDFs and parse them with GROBID. Then open any article in <strong>Library</strong> to run metadata extraction, section summaries, or related work synthesis.
        </p>
      </div>
    </div>
  )
}
