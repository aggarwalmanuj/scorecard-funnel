/**
 * Security utilities — prompt sanitization, input cleaning, error redaction.
 */

/**
 * Sanitises user input before interpolating into LLM prompts.
 * Strips common prompt-injection patterns while preserving genuine content.
 */
export function sanitizeForPrompt(input: string): string {
  if (!input) return input

  let cleaned = input

  // Strip common prompt injection patterns (case-insensitive)
  const injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/gi,
    /ignore\s+(all\s+)?above\s+instructions/gi,
    /disregard\s+(all\s+)?previous/gi,
    /you\s+are\s+now\s+a/gi,
    /new\s+instructions?\s*:/gi,
    /system\s*:\s*/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
    /<<\s*SYS\s*>>/gi,
    /<<\s*\/SYS\s*>>/gi,
    /\bact\s+as\s+(a|an|the)\b/gi,
    /\bpretend\s+(you\s+are|to\s+be)\b/gi,
    /\brole\s*:\s*(system|assistant|user)\b/gi,
  ]

  for (const pattern of injectionPatterns) {
    cleaned = cleaned.replace(pattern, "[filtered]")
  }

  // Limit consecutive newlines to prevent layout injection
  cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n")

  return cleaned
}

/**
 * Redacts sensitive details from error messages before logging.
 */
export function redactError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error)
  // Redact anything that looks like a key/token/password
  return msg
    .replace(/sk-[a-zA-Z0-9\-_]{20,}/g, "sk-***REDACTED***")
    .replace(/-----BEGIN[^-]*-----[\s\S]*?-----END[^-]*-----/g, "***PEM_REDACTED***")
    .replace(/eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g, "***JWT_REDACTED***")
    .slice(0, 500)
}
