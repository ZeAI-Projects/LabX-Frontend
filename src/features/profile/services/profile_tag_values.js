function normalizeTags(value) {
  const values = Array.isArray(value) ? value : value ? value.split(/\r?\n/) : []
  const seen = new Set()
  return values.map((tag) => tag.trim()).filter((tag) => {
    const key = tag.toLocaleLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function tagsFromProfileText(value) {
  return normalizeTags(value)
}

export function profileTextFromTags(value) {
  return normalizeTags(value).join('\n')
}
