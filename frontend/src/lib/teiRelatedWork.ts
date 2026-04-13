/** Strip TEI/XML tags for readable preview text. */
function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** True if section head looks like a related-work / literature block. */
function isRelatedWorkHeadLabel(raw: string): boolean {
  const t = stripTags(raw).toLowerCase()
  return (
    /related\s+work/.test(t) ||
    /prior\s+work/.test(t) ||
    /^background\s*$/.test(t) ||
    /background\s+and\s+related/.test(t) ||
    /literature\s+review/.test(t) ||
    /literature\s+survey/.test(t)
  )
}

export function extractIntroductionSectionFromTei(xml: string): string | null {
  if (!xml?.trim()) return null
  const headRe = /<head[^>]*>([\s\S]*?)<\/head>/gi
  let m: RegExpExecArray | null
  while ((m = headRe.exec(xml)) !== null) {
    const label = stripTags(m[1])
    const t = label.toLowerCase()
    if (/^1\s+introduction|^introduction\s*$/.test(t) || /^introduction$/i.test(label.trim())) {
      const after = xml.slice(m.index + m[0].length)
      const nextHead = after.search(/<head[^>]/i)
      const slice = nextHead >= 0 ? after.slice(0, nextHead) : after.slice(0, 12000)
      const text = stripTags(slice)
      return text.length > 40 ? text : null
    }
  }
  return null
}

/**
 * Best-effort extracted "Related work" text from GROBID TEI (same paper as XML).
 * Matches common <head> labels; takes content until the next <head> or a large cap.
 */
export function extractRelatedWorkSectionFromTei(xml: string): string | null {
  if (!xml?.trim()) return null
  const headRe = /<head[^>]*>([\s\S]*?)<\/head>/gi
  let m: RegExpExecArray | null
  while ((m = headRe.exec(xml)) !== null) {
    if (!isRelatedWorkHeadLabel(m[1])) continue
    const after = xml.slice(m.index + m[0].length)
    const nextHead = after.search(/<head[^>]/i)
    const slice = nextHead >= 0 ? after.slice(0, nextHead) : after.slice(0, 20000)
    const text = stripTags(slice)
    if (text.length > 40) return text.slice(0, 50000)
  }
  return null
}
