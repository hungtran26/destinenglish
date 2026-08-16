/**
 * Kangaroo CBT — Image Storage
 *
 * Handles image uploads and placeholder replacement.
 * Uses Supabase Storage when configured, falls back to data URLs for localStorage.
 */

import { supabase, isSupabaseConfigured } from './supabase'

const IMAGE_PLACEHOLDER_RE = /\[IMAGE\s+(\d+)\]/g

// ─────────────────────────────────────────
// DETECT IMAGE PLACEHOLDERS
// ─────────────────────────────────────────

/**
 * Recursively scan a value for [IMAGE N] placeholders.
 * Returns a sorted array of unique placeholder numbers.
 */
export function detectImagePlaceholders(obj) {
  const numbers = new Set()

  function scan(val) {
    if (typeof val === "string") {
      let m
      const re = new RegExp(IMAGE_PLACEHOLDER_RE.source, "g")
      while ((m = re.exec(val)) !== null) {
        numbers.add(parseInt(m[1], 10))
      }
    } else if (Array.isArray(val)) {
      val.forEach(scan)
    } else if (val && typeof val === "object") {
      Object.values(val).forEach(scan)
    }
  }

  scan(obj)
  return [...numbers].sort((a, b) => a - b)
}

// ─────────────────────────────────────────
// REPLACE PLACEHOLDERS WITH URLS
// ─────────────────────────────────────────

/**
 * Replace all [IMAGE N] occurrences in a string with actual URLs.
 */
function replaceInString(str, urlMap) {
  return str.replace(new RegExp(IMAGE_PLACEHOLDER_RE.source, "g"), (match, num) => {
    const n = parseInt(num, 10)
    return urlMap[n] || match
  })
}

/**
 * Deep-clone and replace all [IMAGE N] placeholders in an object.
 * Returns a new object with URLs substituted.
 */
export function replacePlaceholders(obj, urlMap) {
  if (typeof obj === "string") {
    return replaceInString(obj, urlMap)
  }

  if (Array.isArray(obj)) {
    return obj.map(item => replacePlaceholders(item, urlMap))
  }

  if (obj && typeof obj === "object") {
    const result = {}
    for (const [key, val] of Object.entries(obj)) {
      // Handle image content blocks with placeholder src
      if (key === "src" && typeof val === "string") {
        const m = val.match(/^\[IMAGE\s+(\d+)\]$/)
        if (m) {
          const n = parseInt(m[1], 10)
          result[key] = urlMap[n] || val
          continue
        }
      }
      result[key] = replacePlaceholders(val, urlMap)
    }
    return result
  }

  return obj
}

// ─────────────────────────────────────────
// UPLOAD IMAGE
// ─────────────────────────────────────────

/**
 * Upload an image file for a test.
 * Returns the public URL of the uploaded image.
 *
 * @param {File} file - The image file to upload
 * @param {string} testTitle - The test title (used as folder name)
 * @param {number} imageNumber - The [IMAGE N] number
 * @returns {Promise<string>} The public URL or data URL
 */
export async function uploadImage(file, testTitle, imageNumber) {
  const ext = file.name.split(".").pop() || "png"
  const safeTitle = testTitle.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50)
  const path = `${safeTitle}/image-${imageNumber}.${ext}`

  if (isSupabaseConfigured) {
    const { error } = await supabase.storage
      .from("test-images")
      .upload(path, file, { upsert: true })

    if (error) {
      console.error("Supabase image upload error:", error.message)
      throw new Error(`Failed to upload image: ${error.message}`)
    }

    const { data } = supabase.storage.from("test-images").getPublicUrl(path)
    return data.publicUrl
  }

  // localStorage fallback: store as data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error("Failed to read image file"))
    reader.readAsDataURL(file)
  })
}

/**
 * Delete an image from storage.
 */
export async function deleteImage(testTitle, imageNumber) {
  if (!isSupabaseConfigured) return

  const safeTitle = testTitle.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50)
  // Try common extensions
  for (const ext of ["png", "jpg", "jpeg", "webp", "gif"]) {
    const path = `${safeTitle}/image-${imageNumber}.${ext}`
    await supabase.storage.from("test-images").remove([path])
  }
}
