/** Structured fields extracted deterministically from GROBID TEI XML. */

export type ExtractedLinkItem = { url: string; name?: string; kind: "dataset" | "code" | "other" };

/** Title, authors (JSON array string), abstract — same fields as Excel “Articles” export. */
export function extractCoreFieldsFromTei(xml: string): { title: string; authors: string; abstract: string } {
  const titleMatch = xml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
  const authorMatches = xml.match(/<author[\s\S]*?<persName[^>]*>([\s\S]*?)<\/persName>/gi) || [];
  const authorList = authorMatches
    .map((a) => {
      const m = a.match(/<persName[^>]*>([\s\S]*?)<\/persName>/i);
      return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
    })
    .filter(Boolean);
  const authors = JSON.stringify(authorList);
  const abstractMatch = xml.match(/<abstract[\s\S]*?>([\s\S]*?)<\/abstract>/i);
  const abstract = abstractMatch
    ? abstractMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    : "";
  return { title, authors, abstract };
}

/** Full row for DB upsert after GROBID parse (aligned with library Excel export columns). */
export function buildArticleRecordFromTei(
  xml: string,
  meta: { id: string; pdf_path: string; parsed_at: string },
): {
  id: string;
  title: string | null;
  authors: string | null;
  abstract: string | null;
  pdf_path: string;
  xml: string;
  parsed_at: string;
  year: number | null;
  venue_type: string | null;
  venue_name: string | null;
  links_json: string | null;
} {
  const core = extractCoreFieldsFromTei(xml);
  const sup = extractSupplementalFromTei(xml);
  const linksJson = sup.links.length > 0 ? JSON.stringify(sup.links) : null;
  return {
    id: meta.id,
    title: core.title || null,
    authors: core.authors !== "[]" ? core.authors : null,
    abstract: core.abstract || null,
    pdf_path: meta.pdf_path,
    xml,
    parsed_at: meta.parsed_at,
    year: sup.year,
    venue_type: sup.venue_type || null,
    venue_name: sup.venue_name,
    links_json: linksJson,
  };
}

export function extractSupplementalFromTei(xml: string): {
  year: number | null;
  venue_type: string;
  venue_name: string | null;
  links: ExtractedLinkItem[];
} {
  let year: number | null = null;
  const whenDates = [...xml.matchAll(/<date[^>]*\bwhen="(\d{4})"/gi)];
  for (const m of whenDates) {
    const y = parseInt(m[1], 10);
    if (y >= 1900 && y <= 2100) {
      year = y;
      break;
    }
  }
  if (year == null) {
    const dm = xml.match(/<date[^>]*>(\d{4})<\/date>/i);
    if (dm) {
      const y = parseInt(dm[1], 10);
      if (y >= 1900 && y <= 2100) year = y;
    }
  }

  let venue_type = "unknown";
  let venue_name: string | null = null;

  const meetingM = xml.match(/<meeting[^>]*>([\s\S]*?)<\/meeting>/i);
  if (meetingM) {
    venue_type = "conference";
    venue_name = meetingM[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;
  }

  const journalTitle = xml.match(/<title[^>]*level="j"[^>]*>([\s\S]*?)<\/title>/i);
  if (journalTitle) {
    const name = journalTitle[1].replace(/<[^>]+>/g, "").trim();
    if (name) {
      if (venue_type === "unknown") venue_type = "journal";
      if (!venue_name) venue_name = name;
    }
  }

  if (venue_type === "unknown" && /<monogr/i.test(xml)) {
    const monoTitle = xml.match(/<monogr[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i);
    if (monoTitle && !journalTitle) {
      const name = monoTitle[1].replace(/<[^>]+>/g, "").trim();
      if (name) {
        venue_type = "book";
        venue_name = name;
      }
    }
  }

  const lowerXml = xml.toLowerCase();
  if (venue_type === "unknown" && (lowerXml.includes("arxiv") || lowerXml.includes("preprint"))) {
    venue_type = "preprint";
  }

  if (venue_type === "unknown" && /<note[^>]*type="report"/i.test(xml)) {
    venue_type = "report";
  }

  const urlRegex = /https?:\/\/[^\s<>"')\]]+/gi;
  const seen = new Set<string>();
  const links: ExtractedLinkItem[] = [];
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(xml)) !== null) {
    let url = match[0].replace(/[.,;:)]+$/, "");
    if (seen.has(url)) continue;
    seen.add(url);
    const start = Math.max(0, match.index - 100);
    const slice = xml.slice(start, match.index + 80).toLowerCase();
    let kind: ExtractedLinkItem["kind"] = "other";
    if (/dataset|data set|benchmark|corpus/.test(slice)) kind = "dataset";
    else if (/github|gitlab|code|repository|implementation|source/.test(slice)) kind = "code";
    links.push({ url, kind });
  }

  return { year, venue_type, venue_name, links };
}
