export function mostRecent(items, dateKey) {
  return [...items].sort((first, second) => (
    (Date.parse(second[dateKey]) || 0) - (Date.parse(first[dateKey]) || 0)
    || String(first.id).localeCompare(String(second.id))
  )).slice(0, 3)
}
