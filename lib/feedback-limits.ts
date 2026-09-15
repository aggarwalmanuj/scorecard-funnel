/**
 * Length limits for beat feedback, shared by the beat screen (what the
 * participant can type) and /api/sheets/append (what is stored).
 *
 * The stored value is "<option> | <note>", so the server's cap must leave
 * room for the longest option label on top of the note. Keep
 * FEEDBACK_MAX_CHARS comfortably above FEEDBACK_NOTE_MAX_CHARS + 40.
 */
export const FEEDBACK_NOTE_MAX_CHARS = 1000
export const FEEDBACK_MAX_CHARS = 1200
