/**
 * Single source of truth for legal-document constants.
 *
 * Anything that might change later (operator name, contact email, version
 * date) lives here so the Privacy Policy, Terms of Service, Cookie Policy
 * and registration flow can never drift apart. Update this file whenever
 * the underlying facts change and remember to bump `lastUpdated` so users
 * are notified of material policy changes.
 *
 * TODO: replace the placeholder physical address before going live — POPIA
 * requires the responsible party's address to be available to data subjects.
 */
export const LEGAL = {
  /** Trading name shown to users — keep human-friendly. */
  appName: "SardineWatch",

  /** Legal entity that operates the service. */
  operator: "William Addison (sole proprietor)",

  /** Physical postal address — POPIA s.18(1)(b). Replace before launch. */
  address: "[YOUR_PHYSICAL_ADDRESS], South Africa",

  /** Information Officer contact — required by POPIA s.55. */
  infoOfficerEmail: "support@sardinewatch.co.za",

  /** Date the privacy / terms / cookies were last materially updated. */
  lastUpdated: "15 June 2026",

  /** Document version — bump on every material change. */
  version: "1.0",
} as const;
