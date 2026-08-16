/**
 * Kangaroo CBT — Canonical Import Schema v1.1
 *
 * This file documents the expected structure of imported tests.
 * It is NOT enforced at runtime (no TypeScript), but serves as
 * the authoritative reference for the conversion prompt and validator.
 *
 * SCHEMA VERSION: 1.1
 *
 * ─────────────────────────────────────────────
 * FORMATTED TEXT
 * ─────────────────────────────────────────────
 *
 * A FormattedText value is EITHER:
 *   - A plain string: "Hello world"
 *   - An array of segments: [{ text: "Hello ", bold: true }, { text: "world" }]
 *
 * Segment properties:
 *   text: string (required)
 *   bold?: boolean
 *   italic?: boolean
 *   underline?: boolean
 *
 * ─────────────────────────────────────────────
 * TOP LEVEL
 * ─────────────────────────────────────────────
 *
 * {
 *   schema_version: "1.1",
 *   test: {
 *     title: string,
 *     description?: FormattedText,
 *     time_limit_minutes?: number,
 *     exercises: Exercise[]
 *   }
 * }
 *
 * ─────────────────────────────────────────────
 * EXERCISE
 * ─────────────────────────────────────────────
 *
 * {
 *   id: string,               // unique within test, e.g. "A", "B"
 *   title?: string,           // e.g. "Exercise A"
 *   instruction: FormattedText,
 *   content?: ContentBlock[],
 *   questions: Question[]
 * }
 *
 * ─────────────────────────────────────────────
 * CONTENT BLOCKS
 * ─────────────────────────────────────────────
 *
 * { type: "text", value: FormattedText }
 * { type: "image", src: string, alt?: string }
 *   - src can be a real URL or an image placeholder like "[IMAGE 1]"
 *   - Placeholders are replaced with actual URLs during admin import
 * { type: "example", value: FormattedText }
 * { type: "word_bank", words: string[] }
 * { type: "table", rows: string[][] }
 *
 * ─────────────────────────────────────────────
 * IMAGE PLACEHOLDERS
 * ─────────────────────────────────────────────
 *
 * The external AI may output [IMAGE N] placeholders in:
 * - Content blocks: { type: "image", src: "[IMAGE N]" }
 * - Text strings: "Some text [IMAGE 1] more text"
 * - Passage strings: "Amber (1) ___ up early. [IMAGE 2] The sun..."
 *
 * The admin import flow replaces these with actual uploaded image URLs.
 * The placeholder number is scoped per test (not global).
 * Duplicate [IMAGE N] references show the same uploaded image.
 *
 * ─────────────────────────────────────────────
 * QUESTIONS — COMMON FIELDS
 * ─────────────────────────────────────────────
 *
 * All questions have:
 *   id: number | string       // unique within exercise
 *   type: string              // question type
 *   number?: number | string  // display number (extracted from source, NOT duplicated in text)
 *
 * ─────────────────────────────────────────────
 * QUESTION TYPES
 * ─────────────────────────────────────────────
 *
 * fill-blank:
 * {
 *   id, type: "fill-blank",
 *   number?: number,
 *   prompt: FormattedText,      // text with ___ marking the blank
 *   blank_text?: string,
 *   answer: AnswerKey
 * }
 *
 * fill-blank-passage (continuous passage with numbered blanks):
 * {
 *   id, type: "fill-blank-passage",
 *   number?: number,
 *   passage: string,            // full passage text with ___ at each blank position
 *   blanks: [                   // one entry per blank, in order
 *     { number: number, accepted: string[] },
 *     ...
 *   ]
 * }
 *
 * multiple-choice:
 * {
 *   id, type: "multiple-choice",
 *   number?: number,
 *   prompt: FormattedText,
 *   options: FormattedText[],
 *   answer: number              // index of correct option
 * }
 *
 * rewrite:
 * {
 *   id, type: "rewrite",
 *   number?: number,
 *   prompt: FormattedText,      // the incorrect sentence to rewrite
 *   answer: AnswerKey
 * }
 *
 * circle:
 * {
 *   id, type: "circle",
 *   number?: number,
 *   prompt: FormattedText,
 *   options: FormattedText[],
 *   answer: number
 * }
 *
 * error-correction (interactive — student selects errors from paragraph):
 * {
 *   id, type: "error-correction",
 *   number?: number,
 *   source_paragraph: FormattedText,    // the paragraph with errors (EXACT source text)
 *   required_error_count: number,       // how many errors student must find
 *   errors: [                           // answer key — what the errors are
 *     { wrong: string, correct: string },
 *     ...
 *   ]
 * }
 *
 * ─────────────────────────────────────────────
 * ANSWER KEY
 * ─────────────────────────────────────────────
 *
 * {
 *   accepted: string[],           // all accepted correct answers
 *   case_sensitive?: boolean,     // default false
 *   exact_match?: boolean,        // default false
 *   strip_punctuation?: boolean   // default true
 * }
 *
 * Or simply a string (shorthand for { accepted: [string] })
 */
