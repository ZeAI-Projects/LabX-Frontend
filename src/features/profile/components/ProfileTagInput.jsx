import { useId, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { tagsFromProfileText } from '../services/profile_tag_values.js'

export function ProfileTagInput({ label, value, suggestions, onChange, placeholder = 'Type to search or add your own' }) {
  const listId = useId()
  const tags = useMemo(() => tagsFromProfileText(value), [value])
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const matches = useMemo(() => {
    const search = query.trim().toLocaleLowerCase()
    if (!search) return []
    return suggestions.filter((suggestion) => suggestion.toLocaleLowerCase().includes(search)
      && !tags.some((tag) => tag.toLocaleLowerCase() === suggestion.toLocaleLowerCase())).slice(0, 6)
  }, [query, suggestions, tags])

  function addTag(tag) {
    const cleanTag = tag.trim()
    if (!cleanTag || tags.some((existing) => existing.toLocaleLowerCase() === cleanTag.toLocaleLowerCase())) {
      setQuery('')
      setOpen(false)
      return
    }
    onChange([...tags, cleanTag])
    setQuery('')
    setActiveIndex(0)
    setOpen(false)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' && matches.length) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index + 1) % matches.length)
    } else if (event.key === 'ArrowUp' && matches.length) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index - 1 + matches.length) % matches.length)
    } else if (event.key === 'Enter' || event.key === ',') {
      if ((event.key === 'Enter' && open && matches[activeIndex]) || query.trim()) {
        event.preventDefault()
        if (event.key === 'Enter' && open && matches[activeIndex]) addTag(matches[activeIndex])
        else addTag(query)
      }
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return <div className="pf-tag-input">
    <div className="pf-tag-input__selected" aria-label={`${label} selected values`}>
      {tags.map((tag) => <span className="pf-tag-input__tag" key={tag}>{tag}<button type="button" aria-label={`Remove ${tag}`} onMouseDown={(event) => event.preventDefault()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onChange(tags.filter((existing) => existing !== tag)) }}><X size={13} aria-hidden="true" /></button></span>)}
      <input
        aria-label={label}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        aria-activedescendant={open && matches.length ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        value={query}
        placeholder={tags.length ? 'Add another…' : placeholder}
        onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
    </div>
    {open && matches.length > 0 && <ul className="pf-tag-input__suggestions" id={listId} role="listbox" aria-label={`${label} suggestions`}>
      {matches.map((suggestion, index) => <li id={`${listId}-${index}`} key={suggestion} role="option" aria-selected={index === activeIndex} onMouseDown={(event) => event.preventDefault()} onClick={() => addTag(suggestion)}>{suggestion}</li>)}
    </ul>}
  </div>
}
