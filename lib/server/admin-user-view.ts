import type { UserDocument } from "@/lib/server/cosmos-db"

/**
 * The respondent's raw answers are private user data. They are written by the
 * funnel and read back only to generate that same user's beats/score/report;
 * they must never leave the server through the admin console.
 *
 * Enforced twice: the Cosmos query projects an allowlist (so answer text is
 * never even read for admin listings), and `toAdminUserView` re-applies the
 * same allowlist in JS so a future `SELECT *` can't leak them either.
 */
export const ANSWER_FIELDS = [
  "question1",
  "question2",
  "question3",
  "question4",
  "question5",
] as const

type AnswerField = (typeof ANSWER_FIELDS)[number]

/** A user row as the admin console sees it: no answer text, only whether
 *  each question was answered (index 0 = Q1). */
export type AdminUserView = Omit<UserDocument, AnswerField> & {
  answered: [boolean, boolean, boolean, boolean, boolean]
}

/**
 * Every non-answer column the admin may see. An allowlist, not a denylist, so
 * a column added to UserDocument stays hidden until someone opts it in here;
 * the exhaustiveness check below turns that decision into a compile error
 * instead of a silent omission.
 */
export const ADMIN_VISIBLE_FIELDS = [
  "id",
  "firstName",
  "email",
  "phone",
  "audience",
  "question1_text",
  "question2_text",
  "question3_text",
  "question4_text",
  "question5_text",
  "beat1_feedback",
  "beat2_feedback",
  "beat3_feedback",
  "beat4_feedback",
  "beat5_feedback",
  "beat1_output",
  "beat2_output",
  "beat3_output",
  "beat4_output",
  "beat5_output",
  "score_json",
  "report_json",
  "summary_text",
  "summary_audio_url",
  "ph_session_id",
  "ph_distinct_id",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "ttclid",
  "msclkid",
  "ref",
  "lp",
  "vertical",
  "referrer",
  "landing_page",
  "paid_tier",
  "paid_amount",
  "paid_at",
  "offer_viewed_at",
  "createdAt",
  "firstSignupAt",
  "signupCount",
] as const satisfies readonly Exclude<keyof UserDocument, AnswerField>[]

// Compile-time: fails if UserDocument gains a column that is neither an answer
// nor listed above. Decide whether the admin should see it, then add it.
type UnclassifiedField = Exclude<
  keyof UserDocument,
  AnswerField | (typeof ADMIN_VISIBLE_FIELDS)[number]
>
const _allFieldsClassified: [UnclassifiedField] extends [never] ? true : UnclassifiedField = true
void _allFieldsClassified

/** Non-empty-string test, evaluated inside Cosmos so the text never ships. */
const answeredExpr = (field: AnswerField) =>
  `(IS_STRING(c.${field}) AND LENGTH(TRIM(c.${field})) > 0)`

/**
 * SELECT list for admin user listings: the visible columns plus one boolean
 * per answer (`answered1`..`answered5`). Missing properties are simply omitted
 * from Cosmos results, so older rows stay valid.
 */
export const ADMIN_USER_PROJECTION = [
  ...ADMIN_VISIBLE_FIELDS.map((f) => `c.${f}`),
  ...ANSWER_FIELDS.map((f, i) => `${answeredExpr(f)} AS answered${i + 1}`),
].join(", ")

/** Same predicate as the projection, for WHERE clauses. */
export const ANSWERED_PREDICATE = answeredExpr

/**
 * Shape a raw Cosmos row into what the admin API returns. Accepts either a
 * projected row (answeredN flags) or a full document (raw answers), and in
 * both cases emits only allowlisted columns.
 */
export function toAdminUserView(row: Record<string, unknown>): AdminUserView {
  const out: Record<string, unknown> = {}
  for (const field of ADMIN_VISIBLE_FIELDS) {
    if (row[field] !== undefined) out[field] = row[field]
  }
  const answered = ANSWER_FIELDS.map((field, i) => {
    const flag = row[`answered${i + 1}`]
    if (typeof flag === "boolean") return flag
    const raw = row[field]
    return typeof raw === "string" && raw.trim().length > 0
  }) as AdminUserView["answered"]
  return { ...(out as Omit<AdminUserView, "answered">), answered }
}
