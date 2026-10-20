export const PROFILE_FILE_LIMITS = Object.freeze({ avatar: 512 * 1024, banner: 1024 * 1024, evidence: 1024 * 1024 })
export const MAX_PASSPORT_EVIDENCE_FILES = 3
export const MAX_PASSPORT_EVIDENCE_BYTES = 2 * 1024 * 1024
const imageTypes = ['image/png', 'image/jpeg', 'image/webp']

export function validateProfileFile(file, kind = 'avatar') {
  const limit = PROFILE_FILE_LIMITS[kind]
  if (!limit) throw new Error('Choose a supported file purpose.')
  if (file === null || file === undefined) return null
  const types = kind === 'evidence' ? [...imageTypes, 'application/pdf'] : imageTypes
  if (!file || typeof file !== 'object' || Array.isArray(file)
    || !types.includes(file.type) || typeof file.name !== 'string' || !file.name.trim()
    || file.name.length > 180 || /[\\/\u0000-\u001f]/.test(file.name)
    || !Number.isSafeInteger(file.size) || file.size < 1 || file.size > limit
    || typeof file.dataUrl !== 'string' || file.dataUrl.length > Math.ceil(limit / 3) * 4 + 80) {
    throw new Error(`Choose ${kind === 'evidence' ? 'a PDF, PNG, JPG or WebP' : 'a PNG, JPG or WebP image'} up to ${limit === 512 * 1024 ? '512 KB' : '1 MB'}.`)
  }
  const prefix = `data:${file.type};base64,`
  const encoded = file.dataUrl.slice(prefix.length)
  if (!file.dataUrl.startsWith(prefix) || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error('This file could not be read. Choose it again.')
  }
  const bytes = atob(encoded)
  const validSignature = file.type === 'application/pdf' ? bytes.startsWith('%PDF-')
    : file.type === 'image/png' ? bytes.startsWith('\x89PNG\r\n\x1a\n')
      : file.type === 'image/jpeg' ? bytes.startsWith('\xff\xd8\xff')
        : bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP'
  if (bytes.length !== file.size || !validSignature) throw new Error('The file contents do not match its type or size.')
  return { name: file.name.trim(), type: file.type, size: file.size, dataUrl: file.dataUrl }
}

export function readProfileFile(file, kind = 'avatar') {
  if (!file) return Promise.resolve(null)
  if (!PROFILE_FILE_LIMITS[kind] || file.size > PROFILE_FILE_LIMITS[kind]) return Promise.reject(new Error(`Choose a file up to ${kind === 'avatar' ? '512 KB' : '1 MB'}.`))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('This file could not be read. Choose it again.'))
    reader.onabort = () => reject(new Error('File reading was cancelled.'))
    reader.onload = () => {
      try { resolve(validateProfileFile({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result }, kind)) }
      catch (error) { reject(error) }
    }
    reader.readAsDataURL(file)
  })
}

export function validatePassportEvidence(value = []) {
  if (!Array.isArray(value) || value.length > MAX_PASSPORT_EVIDENCE_FILES) throw new Error('Attach up to 3 evidence files.')
  const files = value.map((file) => {
    const validated = validateProfileFile(file, 'evidence')
    if (!validated) throw new Error('Choose a valid evidence file.')
    return validated
  })
  if (files.reduce((total, file) => total + file.size, 0) > MAX_PASSPORT_EVIDENCE_BYTES) throw new Error('Keep all evidence files together within 2 MB.')
  return files
}
