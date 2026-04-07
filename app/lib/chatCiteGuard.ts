/** Ensure every cite: target in assistant output matches an allowed article id. */
export function validateCiteTargets(output: string, allowedIds: Set<string>): { ok: boolean; invalid: string[] } {
  const invalid: string[] = [];
  const re = /\]\(cite:([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(output)) !== null) {
    const id = m[1].trim();
    if (!allowedIds.has(id)) invalid.push(id);
  }
  return { ok: invalid.length === 0, invalid };
}
