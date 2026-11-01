/**
 * Rough token count without a tokenizer, for display only (labelled "추정" in the UI).
 * English averages about 4 characters per token; Hangul and other non-ASCII text is
 * close to one token per character in current tokenizers, so it is counted that way.
 */
export function estimateTokens(text: string): number {
  let ascii = 0;
  let other = 0;
  for (const ch of text) {
    if (ch.charCodeAt(0) < 128) ascii++;
    else other++;
  }
  return Math.ceil(ascii / 4) + other;
}
