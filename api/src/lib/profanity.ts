/**
 * Profanity filter
 *
 * Uses leo-profanity as the base word list (~1,400 English words/slurs).
 * South African / local terms are added below — extend this list as needed.
 *
 * Strategy: original text is ALWAYS stored in the database so admins retain
 * full evidence for moderation. The `censor()` helper is applied on the way
 * OUT of public API endpoints so end-users only see asterisked output.
 * Admin routes skip censoring so moderators see the real content.
 */

import leoProfanity from "leo-profanity";

// Load the built-in English dictionary
leoProfanity.loadDictionary("en");

// ─── South African / local additions ──────────────────────────────────────
// Add any terms relevant to your community here.
// All entries are lower-case; matching is case-insensitive.
const localTerms: string[] = [
  // South African racial/ethnic slurs
  "kaffir",
  "kaffer",
  "kafir",
  "bobbejaan",
  "hotnot",
  "hotnotsie",
  "koellie",
  "koeli",
  "coolie",
  "charra",
  "boesman",
  "darkie",
  "coon",

  // Xenophobic slurs
  "kwerekwere",
  "makwerekwere",
  "grigamba",

  // Highly offensive Afrikaans profanity
  "poes",
  "doos",
  "naai",
  "fok",
  "fokken",
  "fokkol",
  "piel",
  "slet",
  "teef",
  "hoer",

  // Highly offensive Nguni profanity
  "msunu",
  "nquza",
  "sunu",
  "kanyoko",

  // Moderate/Casual South African profanity (Comment out if a more lenient filter is preferred)
  "kak",
  "voetsek",
  "moer",
  "bliksem",
  "donner",
  "gat",
  "hol",
  "pomp",
  "naaier",
];

if (localTerms.length > 0) {
  leoProfanity.add(localTerms);
}
// ──────────────────────────────────────────────────────────────────────────

/**
 * Returns a censored copy of the string with bad words replaced by asterisks.
 * e.g. "you stupid idiot" → "you ****** *****"
 */
export function censor(text: string): string {
  return leoProfanity.clean(text);
}

/**
 * Returns true if the text contains any flagged words.
 * Useful for logging / flagging content for review without blocking submission.
 */
export function containsProfanity(text: string): boolean {
  return leoProfanity.check(text);
}
