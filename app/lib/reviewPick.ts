import type { Review } from "../db.js";

const TASK2_DEPTH_ORDER = ["detailed", "five_line", "one_line", ""];

/** Latest / preferred cached LLM text for export and API (matches Library article preview). */
export function pickReviewTextForTask(reviews: Review[], task: number): string | null {
  const subset = reviews.filter((r) => r.task === task);
  if (subset.length === 0) return null;

  if (task === 2) {
    for (const depth of TASK2_DEPTH_ORDER) {
      const m = subset.find((r) => (r.review_depth || "") === depth);
      if (m?.result?.trim()) return m.result;
    }
    const sorted = [...subset].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const m = sorted[0];
    return m?.result?.trim() ? m.result : null;
  }

  const sorted = [...subset].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const m = sorted[0];
  return m?.result?.trim() ? m.result : null;
}

export function pickIntroSummaryLit(reviews: Review[]): {
  intro: string | null;
  summary: string | null;
  literature_review: string | null;
} {
  return {
    intro: pickReviewTextForTask(reviews, 1),
    summary: pickReviewTextForTask(reviews, 2),
    literature_review: pickReviewTextForTask(reviews, 3),
  };
}
