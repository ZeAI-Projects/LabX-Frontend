import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import EmojiPicker from 'emoji-picker-react'
import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Heart, MessageCircle, MoreHorizontal, Paperclip, Plus, Search, Send, Share2, Smile, Trash2, Users, X } from 'lucide-react'
import { ProfileAvatar } from '../../../components/common/ProfileAvatar.jsx'
import { useAuth } from '../../../hooks/use_auth.js'
import { getRoleLabel } from '../../../utils/roles.js'
import { profileStore } from '../../profile/services/profile_store.js'
import { createSocialDemoData, readCreatedSocialPosts, saveCreatedSocialPost, writeCreatedSocialPosts } from '../services/social_demo_data.js'
import './SocialPage.css'

const relativeTime = (date) => {
  const seconds = Math.max(0, Math.floor((Date.now() - date) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
const messageTime = (date) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)
const conversationActivity = (conversation) => conversation.messages.at(-1)?.createdAt || conversation.startedAt || 0

function SocialProfileControl({ user, className, available, onUnavailable, onSelect, ariaLabel, role, to, children }) {
  if (to) return <Link className={className} to={to} aria-label={ariaLabel} role={role}>{children}</Link>
  if (available) return <Link className={className} to={`/profile?userId=${encodeURIComponent(user.id)}`} aria-label={ariaLabel} role={role}>{children}</Link>
  if (onSelect || onUnavailable) return <button className={className} type="button" aria-label={ariaLabel} title={onUnavailable ? 'Profile not created' : undefined} onClick={() => (onSelect || onUnavailable)(user)} role={role}>{children}</button>
  return <span className={className} role={role}>{children}</span>
}

function SocialMediaPreview({ mediaItems, initialIndex, onClose }) {
  const dialogRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const media = mediaItems[activeIndex]

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return <dialog ref={dialogRef} className="social-media-preview" aria-label="Post image preview" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <button className="social-icon-button" type="button" aria-label="Close image preview" onClick={onClose}><X size={20} /></button>
    <img src={media.src} alt={media.alt} />
    {mediaItems.length > 1 && <>
      <button className="social-media-preview__nav social-media-preview__nav--previous" type="button" aria-label="Previous image" onClick={() => setActiveIndex(index => (index - 1 + mediaItems.length) % mediaItems.length)}><ChevronLeft size={22} /></button>
      <button className="social-media-preview__nav social-media-preview__nav--next" type="button" aria-label="Next image" onClick={() => setActiveIndex(index => (index + 1) % mediaItems.length)}><ChevronRight size={22} /></button>
      <span className="social-media-preview__count" aria-live="polite">{activeIndex + 1} / {mediaItems.length}</span>
    </>}
  </dialog>
}

function SocialIdentity({ user, profile, compact = false, profileAvailable = false, onUnavailableProfile, onSelect, profileHref, showHandle = true }) {
  const assessment = user.assessment_result || {}
  const details = [profile?.startup?.name, user.domain || assessment.domain, user.stage || assessment.stage, (user.level || assessment.level) && `Level ${user.level || assessment.level}`].filter(Boolean)
  return <div className={`social-identity${compact ? ' social-identity--compact' : ''}`}>
    <SocialProfileControl className="social-identity__avatar" user={user} available={profileAvailable} onUnavailable={onUnavailableProfile} onSelect={onSelect} to={profileHref} ariaLabel={`${onSelect ? 'Select' : 'Open'} ${user.full_name || user.username}'s ${onSelect ? 'conversation' : 'profile'}`}><ProfileAvatar user={user} /></SocialProfileControl>
    <div className="social-identity__copy">
      <SocialProfileControl className="social-identity__name" user={user} available={profileAvailable} onUnavailable={onUnavailableProfile} onSelect={onSelect} to={profileHref}>{user.full_name || user.username}</SocialProfileControl>
      {showHandle && <SocialProfileControl className="social-identity__handle" user={user} available={profileAvailable} onUnavailable={onUnavailableProfile} onSelect={onSelect} to={profileHref}>@{user.username || user.email?.split('@')[0]}</SocialProfileControl>}
      {!compact && <span className="social-identity__role">{[getRoleLabel(user.role), ...details].join(' · ')}</span>}
    </div>
  </div>
}

function CreatePostAudience({ audience, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const optionRefs = useRef([])
  const options = ['Everyone', 'Connections', 'Only me']

  useEffect(() => {
    if (!open) return undefined
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return <div className="social-audience__control" ref={rootRef}>
    <button className="social-audience__select" type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <Users size={15} />{audience}<ChevronDown size={14} />
    </button>
    {open && <div className="social-audience__options" role="listbox" aria-label="Post audience">
      {options.map((option, index) => <button
        key={option}
        ref={element => { optionRefs.current[index] = element }}
        type="button"
        role="option"
        aria-selected={audience === option}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            event.preventDefault()
            setOpen(false)
            rootRef.current?.querySelector('.social-audience__select')?.focus()
            return
          }
          const nextIndex = event.key === 'ArrowDown' ? (index + 1) % options.length : event.key === 'ArrowUp' ? (index - 1 + options.length) % options.length : event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : -1
          if (nextIndex >= 0) {
            event.preventDefault()
            optionRefs.current[nextIndex]?.focus()
          }
        }}
        onClick={() => { onChange(option); setOpen(false) }}
      >{option}</button>)}
    </div>}
  </div>
}

function CreatePostDialog({ user, profile, onClose, onPublish }) {
  const dialogRef = useRef(null)
  const editorRef = useRef(null)
  const emojiButtonRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const selectionRef = useRef([0, 0])
  const [text, setText] = useState('')
  const [audience, setAudience] = useState('Everyone')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    editorRef.current?.focus()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    if (!emojiOpen) return undefined
    function handlePointerDown(event) {
      if (!emojiPickerRef.current?.contains(event.target) && !emojiButtonRef.current?.contains(event.target)) setEmojiOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setEmojiOpen(false)
        emojiButtonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [emojiOpen])

  function addEmoji(emoji) {
    const editor = editorRef.current
    if (!editor) return
    const [start, end] = selectionRef.current
    const next = `${text.slice(0, start)}${emoji}${text.slice(end)}`
    setText(next)
    requestAnimationFrame(() => {
      editor.focus()
      const cursor = start + emoji.length
      editor.setSelectionRange(cursor, cursor)
      selectionRef.current = [cursor, cursor]
    })
  }

  function submit(event) {
    event.preventDefault()
    if (!text.trim()) {
      setError('Write something before publishing.')
      editorRef.current?.focus()
      return
    }
    if (text.trim().length > 5000) {
      setError('Posts must be 5,000 characters or fewer.')
      return
    }
    onPublish({ text: text.trim(), audience })
  }

  return <dialog ref={dialogRef} className="social-dialog" aria-labelledby="social-create-title" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <header className="social-dialog__header"><div><span className="social-eyebrow">Share with your community</span><h2 id="social-create-title">Create post</h2></div><button className="social-icon-button" type="button" aria-label="Close create post" onClick={onClose}><X size={19} /></button></header>
    <form onSubmit={submit}>
      <SocialIdentity user={user} profile={profile} profileAvailable compact />
      <label className="social-audience"><span>Post audience</span><CreatePostAudience audience={audience} onChange={setAudience} /></label>
      <textarea ref={editorRef} className="social-editor" value={text} onBlur={event => { selectionRef.current = [event.currentTarget.selectionStart, event.currentTarget.selectionEnd] }} onSelect={event => { selectionRef.current = [event.currentTarget.selectionStart, event.currentTarget.selectionEnd] }} onChange={(event) => { setText(event.target.value); setError('') }} placeholder="What are you building or thinking about?" maxLength={5000} aria-label="Post text" />
      <div className="social-dialog__note">Local preview only — posts are not shared with other accounts.</div>
      <div className="social-composer-tools" aria-label="Available post tools">
        <div className="social-emoji-picker-wrap" ref={emojiPickerRef}>
          <button ref={emojiButtonRef} type="button" aria-haspopup="dialog" aria-expanded={emojiOpen} onPointerDown={() => { const editor = editorRef.current; if (editor) selectionRef.current = [editor.selectionStart, editor.selectionEnd] }} onClick={() => setEmojiOpen(value => !value)} aria-label="Open emoji picker"><Smile size={18} /><span>Emoji</span></button>
          {emojiOpen && <section className="social-emoji-picker" role="dialog" aria-label="Choose an emoji">
            <EmojiPicker
              className="social-emoji-picker__widget"
              width="100%"
              height={340}
              colorScheme="dark"
              emojiStyle="native"
              lazyLoadEmojis
              previewConfig={{ showPreview: false }}
              onEmojiClick={({ emoji }) => addEmoji(emoji)}
            />
          </section>}
        </div>
        <span className="social-character-count">{text.length}/5000</span>
      </div>
      {error && <p className="social-error" role="alert">{error}</p>}
      <footer className="social-dialog__footer"><span>Visibility is a local preview setting.</span><button className="social-primary-button" type="submit">Post</button></footer>
    </form>
  </dialog>
}

function ShareLinkDialog({ url, onClose }) {
  const dialogRef = useRef(null)
  const closeTimerRef = useRef(null)
  const copyInProgressRef = useRef(false)
  const isOpenRef = useRef(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    isOpenRef.current = true
    return () => {
      isOpenRef.current = false
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  function showCopied() {
    if (closeTimerRef.current !== null || !isOpenRef.current) return
    setError('')
    setCopied(true)
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      onClose()
    }, 3000)
  }

  async function copyLink() {
    if (copyInProgressRef.current || closeTimerRef.current !== null) return
    copyInProgressRef.current = true
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable in this browser. Select and copy the link instead.')
      await navigator.clipboard.writeText(url)
      if (!isOpenRef.current) return
      showCopied()
    } catch (copyError) {
      copyInProgressRef.current = false
      if (!isOpenRef.current) return
      setError(copyError instanceof Error ? copyError.message : 'Unable to copy the post link.')
    }
  }

  return <dialog className="social-dialog social-share-dialog" ref={dialogRef} aria-labelledby="social-share-title" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <header className="social-dialog__header"><div><span className="social-eyebrow">Share post</span><h2 id="social-share-title">Copy link</h2></div><button className="social-icon-button" type="button" aria-label="Close share dialog" onClick={onClose}><X size={19} /></button></header>
    <p className="social-share-dialog__description">Anyone with this link can open this post in the current app session.</p>
    <label className="social-sr-only" htmlFor="social-share-url">Post link</label>
    <input id="social-share-url" className="social-share-dialog__url" value={url} readOnly onFocus={event => event.currentTarget.select()} onCopy={showCopied} />
    {error && <p className="social-error" role="alert">{error}</p>}
    {copied && <p className="social-share-dialog__status" role="status">Link copied.</p>}
    <footer className="social-dialog__footer"><span>Direct post URL only</span><button className="social-primary-button" type="button" onClick={copyLink} disabled={copied}>{copied ? <><Check size={16} />Copied!</> : <><Copy size={16} />Copy Link</>}</button></footer>
  </dialog>
}

function SocialPost({ post, user, profile, people, onDelete, onLike, onComment, onUnavailableProfile }) {
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [likesOpen, setLikesOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [comment, setComment] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [previewMediaIndex, setPreviewMediaIndex] = useState(null)
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const swipeStartRef = useRef(null)
  const liked = post.likes.includes(user.id)
  const timestamp = relativeTime(post.createdAt)
  const postUrl = `${window.location.origin}${window.location.pathname}#post-${post.id}`
  const mediaItems = post.media ? (Array.isArray(post.media) ? post.media : [post.media]) : []
  const activeMedia = mediaItems[activeMediaIndex]
  const likerPeople = post.likes.map(id => people.find(person => person.id === id)).filter(Boolean)

  function showPreviousMedia() {
    setActiveMediaIndex(index => (index - 1 + mediaItems.length) % mediaItems.length)
  }

  function showNextMedia() {
    setActiveMediaIndex(index => (index + 1) % mediaItems.length)
  }

  function startMediaSwipe(event) {
    swipeStartRef.current = event.pointerType === 'touch' ? event.clientX : null
  }

  function finishMediaSwipe(event) {
    if (swipeStartRef.current === null) return
    const distance = event.clientX - swipeStartRef.current
    swipeStartRef.current = null
    if (Math.abs(distance) < 45) return
    if (distance > 0) showPreviousMedia()
    else showNextMedia()
  }

  function submitComment(event) {
    event.preventDefault()
    if (!comment.trim()) return
    onComment(post.id, comment.trim(), replyTo)
    setComment('')
    setReplyTo(null)
  }

  return <article className="social-post" id={`post-${post.id}`}>
    <header className="social-post__header">
      <SocialIdentity user={post.author} profile={post.author.id === user.id ? profile : null} profileAvailable={post.author.id === user.id} onUnavailableProfile={onUnavailableProfile} />
      <div className="social-post__header-end"><time dateTime={new Date(post.createdAt).toISOString()}>{timestamp}</time><div className="social-post__menu-wrap">
        {post.author.id === user.id && <>
          <button className="social-icon-button" type="button" aria-label="Post options" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={20} /></button>
          {menuOpen && <div className="social-post__menu"><button type="button" onClick={() => { onDelete(post.id); setMenuOpen(false) }}><Trash2 size={15} />Delete post</button></div>}
        </>}
      </div></div>
    </header>
    <p className="social-post__text">{post.text}</p>
    {mediaItems.length > 0 && <div className="social-post__carousel" onPointerDown={startMediaSwipe} onPointerUp={finishMediaSwipe} onPointerCancel={() => { swipeStartRef.current = null }} onPointerLeave={() => { swipeStartRef.current = null }} role="group" aria-label={`${activeMediaIndex + 1} of ${mediaItems.length} post images`}>
      <button className="social-post__media-item" type="button" onClick={() => setPreviewMediaIndex(activeMediaIndex)} aria-label={`Open image ${activeMediaIndex + 1} of ${mediaItems.length}`}>
        <img key={activeMediaIndex} className="social-post__media social-post__media--grid" src={activeMedia.src} alt={activeMedia.alt} loading="lazy" />
      </button>
      {mediaItems.length > 1 && <>
        <button className="social-post__carousel-arrow social-post__carousel-arrow--previous" type="button" aria-label="Previous photo" onClick={showPreviousMedia}><ChevronLeft size={22} /></button>
        <button className="social-post__carousel-arrow social-post__carousel-arrow--next" type="button" aria-label="Next photo" onClick={showNextMedia}><ChevronRight size={22} /></button>
        <span className="social-post__carousel-count" aria-live="polite">{activeMediaIndex + 1} / {mediaItems.length}</span>
      </>}
    </div>}
    <div className="social-post__actions" aria-label="Post actions">
      <div className="social-action-like" onMouseLeave={() => setLikesOpen(false)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setLikesOpen(false) }}>
        <button className={`social-post__action-group${liked ? ' is-liked' : ''}`} type="button" aria-label={liked ? `Unlike post${post.likes.length ? `, ${post.likes.length} likes` : ''}` : `Like post${post.likes.length ? `, ${post.likes.length} likes` : ''}`} title={liked ? 'Unlike' : 'Like'} aria-pressed={liked} aria-expanded={likesOpen && likerPeople.length > 0} onFocus={() => { if (likerPeople.length) setLikesOpen(true) }} onKeyDown={event => { if (event.key === 'Escape') setLikesOpen(false) }} onClick={() => onLike(post.id)} onMouseEnter={() => { if (likerPeople.length) setLikesOpen(true) }}><Heart size={18} fill={liked ? 'currentColor' : 'none'} />{post.likes.length > 0 && <span>{post.likes.length}</span>}</button>
        {likesOpen && likerPeople.length > 0 && <div className="social-likes-popover" role="dialog" aria-label="People who liked this post"><strong>Liked by</strong>{likerPeople.map(person => <SocialProfileControl key={person.id} className="social-like-person" user={person} to={`/profile?userId=${encodeURIComponent(person.id)}`}><ProfileAvatar user={person} />{person.full_name}</SocialProfileControl>)}</div>}
      </div>
      <button className="social-post__action-group" type="button" aria-label={`Comment on post${post.comments.length ? `, ${post.comments.length} comments` : ''}`} title="Comment" aria-expanded={commentsOpen} onClick={() => setCommentsOpen(!commentsOpen)}><MessageCircle size={18} />{post.comments.length > 0 && <span>{post.comments.length}</span>}</button>
      <button className="social-post__action-group" type="button" aria-label="Share post" title="Share" onClick={() => setShareOpen(true)}><Share2 size={18} /></button>
    </div>
    {post.audience !== 'Everyone' && <span className="social-post__audience">{post.audience} · local preview</span>}
    {commentsOpen && <section className="social-comments" aria-label="Comments">
      {post.comments.map((item) => <article className={`social-comment${item.replyTo ? ' social-comment--reply' : ''}`} key={item.id}>
        <SocialProfileControl className="social-comment__avatar" user={item.author} available={item.author.id === user.id} onUnavailable={onUnavailableProfile} ariaLabel={`Open ${item.author.full_name}'s profile`}><ProfileAvatar user={item.author} /></SocialProfileControl>
        <div><p><SocialProfileControl className="social-comment__author" user={item.author} available={item.author.id === user.id} onUnavailable={onUnavailableProfile}><strong>{item.author.full_name || item.author.username}</strong></SocialProfileControl><span>{item.text}</span></p><button type="button" onClick={() => setReplyTo(item.id)}>Reply</button></div>
      </article>)}
      {!post.comments.length && <p className="social-comments__empty">Start the conversation.</p>}
      <form className="social-comment-form" onSubmit={submitComment}>
        {replyTo && <span className="social-reply-label">Replying to a comment <button type="button" aria-label="Cancel reply" onClick={() => setReplyTo(null)}><X size={13} /></button></span>}
        <ProfileAvatar user={user} />
        <label className="social-sr-only" htmlFor={`comment-${post.id}`}>Write a comment</label>
        <input id={`comment-${post.id}`} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a comment…" maxLength={1000} />
        <button type="submit" disabled={!comment.trim()} aria-label={replyTo ? 'Send reply' : 'Send comment'}><Send size={16} /></button>
      </form>
    </section>}
    {shareOpen && <ShareLinkDialog url={postUrl} onClose={() => setShareOpen(false)} />}
    {previewMediaIndex !== null && <SocialMediaPreview mediaItems={mediaItems} initialIndex={previewMediaIndex} onClose={() => setPreviewMediaIndex(null)} />}
  </article>
}

function MessagesPanel({ user, people, followedUsers, initialConversations }) {
  const [search, setSearch] = useState('')
  const [newMessage, setNewMessage] = useState(false)
  const [query, setQuery] = useState('')
  const [recipientSearchOpen, setRecipientSearchOpen] = useState(false)
  const [conversations, setConversations] = useState(initialConversations)
  const [selectedId, setSelectedId] = useState(initialConversations[0]?.id || null)
  const [mobileChat, setMobileChat] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [notice, setNotice] = useState('')
  const threadRef = useRef(null)
  const recipientPanelRef = useRef(null)
  const newMessageButtonRef = useRef(null)
  const recipientSearchRef = useRef(null)
  const selected = conversations.find(conversation => conversation.id === selectedId)
  const followedRecipients = [...new Map(followedUsers.filter(person => person.canMessage).map(person => [person.id, person])).values()]
  const matches = followedRecipients.filter(person => `${person.full_name} ${person.username}`.toLowerCase().includes(query.trim().toLowerCase()))
  const visibleConversations = conversations
    .filter(conversation => `${conversation.person.full_name} ${conversation.person.username}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => conversationActivity(b) - conversationActivity(a))

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [selectedId, selected?.messages.length])

  useEffect(() => {
    if (!newMessage) return undefined
    function handlePointerDown(event) {
      if (recipientPanelRef.current?.contains(event.target) || newMessageButtonRef.current?.contains(event.target)) return
      setNewMessage(false)
      setRecipientSearchOpen(false)
      setQuery('')
    }
    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setNewMessage(false)
      setRecipientSearchOpen(false)
      setQuery('')
      newMessageButtonRef.current?.focus()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [newMessage])

  useEffect(() => {
    if (recipientSearchOpen) recipientSearchRef.current?.focus()
  }, [recipientSearchOpen])

  function closeRecipientPanel() {
    setNewMessage(false)
    setRecipientSearchOpen(false)
    setQuery('')
  }

  function openConversation(conversation) {
    setSelectedId(conversation.id)
    setConversations(current => current.map(item => item.id === conversation.id ? { ...item, unreadCount: 0 } : item))
    setMobileChat(true)
    closeRecipientPanel()
  }

  function openPerson(person) {
    const existing = conversations.find(conversation => conversation.person.id === person.id)
    if (existing) {
      openConversation(existing)
      return
    }
    if (!person.canMessage) {
      setNotice('This user is not available for messages.')
      return
    }
    const startedAt = conversations.reduce((latest, item) => Math.max(latest, conversationActivity(item)), 0) + 1
    const conversation = { id: `social-demo-conversation-${person.id}`, person, unreadCount: 0, startedAt, messages: [] }
    setConversations(current => [conversation, ...current])
    openConversation(conversation)
  }

  function sendMessage(event) {
    event.preventDefault()
    if (!selected || (!messageText.trim() && !attachment)) return
    const nextMessage = {
      id: crypto.randomUUID(),
      senderId: user.id,
      text: messageText.trim(),
      attachment,
      createdAt: Date.now(),
    }
    setConversations(current => current.map(conversation => conversation.id === selected.id
      ? { ...conversation, unreadCount: 0, startedAt: conversation.startedAt || nextMessage.createdAt, messages: [...conversation.messages, nextMessage] }
      : conversation))
    setMessageText('')
    setAttachment(null)
    setNotice('')
  }

  function chooseAttachment(event) {
    const file = event.target.files?.[0]
    if (file) setAttachment({ name: file.name, size: file.size })
    event.target.value = ''
  }

  return <section className="social-messages" aria-label="Messages">
    <aside className={`social-inbox${mobileChat ? ' social-inbox--hidden' : ''}`}>
      <header className="social-inbox__header"><div><h2>Messages</h2><p>Your conversations</p></div><button ref={newMessageButtonRef} className="social-icon-button social-compose-button" type="button" aria-label="New message" title="New message" aria-expanded={newMessage} onClick={() => { setNewMessage(value => !value); setQuery(''); setRecipientSearchOpen(false) }}><Plus size={20} /></button></header>
      <label className="social-search social-search--inbox"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" /></label>
      {newMessage && <section className="social-recipient-panel" ref={recipientPanelRef} role="dialog" aria-modal="false" aria-label="New message recipient selection">
        <header><h3>New Message</h3><div><button type="button" className="social-icon-button" onClick={() => setRecipientSearchOpen(value => !value)} aria-label={recipientSearchOpen ? 'Close recipient search' : 'Search followed users'} aria-expanded={recipientSearchOpen}><Search size={17} /></button><button type="button" className="social-icon-button" onClick={closeRecipientPanel} aria-label="Close new message"><X size={17} /></button></div></header>
        {recipientSearchOpen && <label className="social-search social-recipient-search"><Search size={15} /><input ref={recipientSearchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people you follow" aria-label="Search followed users" /></label>}
        <div className="social-recipient-list">
          {!followedRecipients.length ? <p>You're not following anyone yet.</p> : !matches.length ? <p>No matching users found.</p> : matches.map(person => <button className="social-recipient" type="button" key={person.id} onClick={() => openPerson(person)}>
            <ProfileAvatar user={person} /><span><strong>{person.full_name}</strong><small>@{person.username}</small></span>
          </button>)}
        </div>
      </section>}
      {notice && <p className="social-inbox__notice" role="status">{notice}</p>}
      <div className="social-conversation-list" aria-label="Conversation list">
        {!visibleConversations.length ? <div className="social-inbox__empty"><MessageCircle size={24} /><strong>{search.trim() ? 'No conversations found' : 'No conversations yet'}</strong><span>{search.trim() ? 'Try another name or username.' : 'Your conversations will appear here.'}</span></div> : visibleConversations.map(conversation => {
          const lastMessage = conversation.messages.at(-1)
          return <div className="social-conversation" key={conversation.id} aria-current={selectedId === conversation.id ? 'true' : undefined}>
            <button className="social-conversation__avatar" type="button" aria-label={`Open conversation with ${conversation.person.full_name}`} onClick={() => openConversation(conversation)}><ProfileAvatar user={conversation.person} /></button>
            <span className="social-conversation__copy">
              <Link className="social-conversation__name" to={`/profile?userId=${encodeURIComponent(conversation.person.id)}`}>{conversation.person.full_name}</Link>
              <button className="social-conversation__preview" type="button" onClick={() => openConversation(conversation)}>{lastMessage?.text || (lastMessage?.attachment ? `Attachment: ${lastMessage.attachment.name}` : 'Start a conversation')}</button>
            </span>
            <button className="social-conversation__meta" type="button" aria-label={`Open conversation with ${conversation.person.full_name}`} onClick={() => openConversation(conversation)}><time>{lastMessage ? relativeTime(lastMessage.createdAt) : 'New'}</time>{conversation.unreadCount > 0 && <span className="social-unread">{conversation.unreadCount}</span>}</button>
          </div>
        })}
      </div>
    </aside>
    <section className={`social-chat${mobileChat ? ' social-chat--active' : ''}`} aria-label="Conversation">
      {selected ? <>
        <header className="social-chat__header">
          <button className="social-chat__back" type="button" onClick={() => setMobileChat(false)}><ArrowLeft size={17} /><span className="social-sr-only">Back to conversations</span></button>
          <SocialIdentity user={selected.person} compact profileHref={`/profile?userId=${encodeURIComponent(selected.person.id)}`} showHandle={false} />
        </header>
        <div className={`social-chat__thread${selected.messages.length ? '' : ' social-chat__thread--empty'}`} ref={threadRef} aria-live="polite">
          {selected.messages.length ? selected.messages.map(message => {
            const sender = people.find(person => person.id === message.senderId) || user
            const ownMessage = message.senderId === user.id
            return <article className={`social-message${ownMessage ? ' social-message--own' : ''}`} key={message.id}>
              {!ownMessage && <ProfileAvatar user={sender} />}
              <div className="social-message__bubble">
                {message.text && <p>{message.text}</p>}
                {message.attachment && <span className="social-message__attachment"><Paperclip size={14} />{message.attachment.name}</span>}
                <time dateTime={new Date(message.createdAt).toISOString()}>{messageTime(message.createdAt)}</time>
              </div>
            </article>
          }) : <div className="social-chat__welcome"><span><MessageCircle size={22} /></span><strong>Start a conversation with {selected.person.full_name}</strong><p>Send a message to introduce yourself and get the conversation going.</p></div>}
        </div>
        {notice && <p className="social-chat__notice" role="status">{notice}</p>}
        <form className="social-message-composer" onSubmit={sendMessage}>
          <label className="social-attach-button" title="Attach a local file">
            <Paperclip size={18} /><span className="social-sr-only">Attach a file</span>
            <input type="file" onChange={chooseAttachment} />
          </label>
          <button type="button" className="social-emoji-button" aria-label="Insert sparkle emoji" onClick={() => setMessageText(current => `${current}✨`)}><Smile size={18} /></button>
          <label className="social-sr-only" htmlFor="social-message-input">Write a message</label>
          <input id="social-message-input" value={messageText} onChange={event => setMessageText(event.target.value)} placeholder="Write a message…" maxLength={2000} />
          <button className="social-send-button" type="submit" disabled={!messageText.trim() && !attachment} aria-label="Send message"><Send size={17} /></button>
          {attachment && <span className="social-attachment-preview"><Paperclip size={13} />{attachment.name}<button type="button" aria-label="Remove attachment" onClick={() => setAttachment(null)}><X size={13} /></button></span>}
        </form>
        <p className="social-chat__demo-note">Demo conversation · messages and attachments stay in this browser session.</p>
      </> : <div className="social-chat__empty"><span className="social-chat__icon"><MessageCircle size={24} /></span><h2>Select a conversation</h2><p>Choose an existing conversation to see your messages here.</p></div>}
    </section>
  </section>
}

export function SocialPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab = requestedTab === 'messages' || requestedTab === 'posts' ? requestedTab : 'home'
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [demo] = useState(() => createSocialDemoData(user))
  const [posts, setPosts] = useState(() => [...readCreatedSocialPosts(user.id), ...demo.posts].sort((a, b) => b.createdAt - a.createdAt))
  const [notice, setNotice] = useState('')
  const [profileUnavailable, setProfileUnavailable] = useState('')
  const [profile] = useState(() => profileStore.read(user.id))

  const visiblePosts = posts.filter(post => !search.trim() || `${post.author.full_name} ${post.author.username} ${post.text}`.toLowerCase().includes(search.trim().toLowerCase()))
  const ownPosts = posts.filter(post => post.author.id === user.id)

  function selectTab(nextTab) {
    setSearchParams(current => {
      const next = new URLSearchParams(current)
      if (nextTab === 'home') next.delete('tab')
      else next.set('tab', nextTab)
      return next
    })
  }

  function showUnavailableProfile(person) {
    setProfileUnavailable(`${person.full_name || person.username}'s profile has not been created.`)
  }

  function publish({ text, audience }) {
    const post = { id: crypto.randomUUID(), author: user, text, audience, createdAt: Date.now(), likes: [], comments: [] }
    saveCreatedSocialPost(user.id, post)
    setPosts(current => [post, ...current])
    setShowCreate(false)
    setNotice('Post added to this local preview. It has not been shared with other accounts.')
  }

  function updatePost(postId, update) {
    setPosts(current => current.map(post => post.id === postId ? update(post) : post))
  }

  function deletePost(postId) {
    setPosts(current => {
      const next = current.filter(post => post.id !== postId)
      writeCreatedSocialPosts(user.id, next)
      return next
    })
  }

  return <div className={`social-page${tab === 'messages' ? ' social-page--messages' : ''}`}>
    <nav className="social-tabs" aria-label="Social sections">
      <button type="button" aria-current={tab === 'home' ? 'page' : undefined} onClick={() => selectTab('home')}>Home</button>
      <button type="button" aria-current={tab === 'messages' ? 'page' : undefined} onClick={() => selectTab('messages')}>Messages</button>
    </nav>
    <div className="social-home-view" hidden={tab !== 'home'}>
      <div className="social-home-controls">
        <label className="social-search social-search--founders"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search founders" aria-label="Search founders" /></label>
        <button className="social-primary-button" type="button" onClick={() => { setShowCreate(true); setNotice('') }}><Plus size={17} />Create Post</button>
      </div>
      {notice && <p className="social-page-notice" role="status"><Check size={15} />{notice}</p>}
      {profileUnavailable && <p className="social-profile-unavailable" role="status">{profileUnavailable}</p>}
      <div className="social-feed">
          {visiblePosts.map(post => <SocialPost
            key={post.id}
            post={post}
            user={user}
            profile={profile}
            people={demo.users}
            onUnavailableProfile={showUnavailableProfile}
            onLike={id => updatePost(id, item => ({
              ...item,
              likes: item.likes.includes(user.id) ? item.likes.filter(likedBy => likedBy !== user.id) : [...item.likes, user.id],
            }))}
            onComment={(id, text, replyTo) => updatePost(id, item => ({
              ...item,
              comments: [...item.comments, { id: crypto.randomUUID(), author: user, text, replyTo }],
            }))}
            onDelete={deletePost}
          />)}
          {!visiblePosts.length && <section className="social-empty"><span className="social-empty__icon"><Users size={23} /></span><h2>{search.trim() ? 'No matching founders' : 'Your community feed is ready'}</h2><p>{search.trim() ? 'Try another name or username.' : 'There are no posts to show yet. Share a progress update to start the conversation.'}</p>{!search.trim() && <button className="social-primary-button" type="button" onClick={() => setShowCreate(true)}><Plus size={16} />Create your first post</button>}</section>}
      </div>
    </div>
    <div className="social-my-posts" hidden={tab !== 'posts'}>
      <header className="social-my-posts__header"><div><h2>My posts</h2><p>Your post history in this browser session</p></div><button className="social-secondary-button" type="button" onClick={() => selectTab('home')}><ArrowLeft size={15} />Back to Home</button></header>
      <div className="social-feed social-feed--own">
        {ownPosts.map(post => <SocialPost
          key={post.id}
          post={post}
          user={user}
          profile={profile}
          people={demo.users}
          onUnavailableProfile={showUnavailableProfile}
          onLike={id => updatePost(id, item => ({
            ...item,
            likes: item.likes.includes(user.id) ? item.likes.filter(likedBy => likedBy !== user.id) : [...item.likes, user.id],
          }))}
          onComment={(id, text, replyTo) => updatePost(id, item => ({
            ...item,
            comments: [...item.comments, { id: crypto.randomUUID(), author: user, text, replyTo }],
          }))}
          onDelete={deletePost}
        />)}
        {!ownPosts.length && <section className="social-empty"><span className="social-empty__icon"><Users size={23} /></span><h2>No posts yet</h2><p>Posts you create will be collected here.</p><button className="social-primary-button" type="button" onClick={() => setShowCreate(true)}><Plus size={16} />Create your first post</button></section>}
      </div>
    </div>
    <div className="social-messages-view" hidden={tab !== 'messages'}>
      <MessagesPanel user={user} people={demo.users} followedUsers={demo.followedUsers} initialConversations={demo.conversations} />
    </div>
    {showCreate && <CreatePostDialog user={user} profile={profile} onClose={() => setShowCreate(false)} onPublish={publish} />}
  </div>
}
