import type { Review } from '@/lib/api'

const TASK2_DEPTH_ORDER = ['detailed', 'five_line', 'one_line', '']

export function pickReviewText(reviews: Review[], task: number): { text: string; depth?: string } | null {
  const subset = reviews.filter((r) => r.task === task)
  if (subset.length === 0) return null

  if (task === 2) {
    for (const depth of TASK2_DEPTH_ORDER) {
      const m = subset.find((r) => (r.review_depth || '') === depth)
      if (m?.result?.trim()) return { text: m.result, depth: m.review_depth || depth || undefined }
    }
    const sorted = [...subset].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    const m = sorted[0]
    return m?.result?.trim() ? { text: m.result, depth: m.review_depth || undefined } : null
  }

  const sorted = [...subset].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const m = sorted[0]
  return m?.result?.trim() ? { text: m.result } : null
}
