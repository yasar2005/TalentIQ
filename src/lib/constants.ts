export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "zh", label: "Chinese (中文)" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
] as const;

export const AI_TONES = [
  { value: "CASUAL", label: "Casual" },
  { value: "PROFESSIONAL", label: "Professional" },
  { value: "FORMAL", label: "Formal" },
  { value: "FRIENDLY", label: "Friendly" },
] as const;

export const FOLLOW_UP_DEPTHS = [
  { value: "LIGHT", label: "Light", description: "no follow-up" },
  { value: "MODERATE", label: "Moderate", description: "1-2 follow-ups" },
  { value: "DEEP", label: "Deep", description: "3-5 follow-ups" },
] as const;

export const DEFAULT_AI_NAME = "TalentIQ";

export const COMPANY_SIZES = [
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-500", label: "201–500 employees" },
  { value: "501-1000", label: "501–1,000 employees" },
  { value: "1001+", label: "1,001+ employees" },
] as const;

export const COMPANY_INDUSTRIES = [
  { value: "technology", label: "Technology" },
  { value: "finance", label: "Finance & Banking" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "retail", label: "Retail & E-commerce" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "consulting", label: "Consulting" },
  { value: "media", label: "Media & Entertainment" },
  { value: "real_estate", label: "Real Estate" },
  { value: "logistics", label: "Logistics & Supply Chain" },
  { value: "other", label: "Other" },
] as const;
