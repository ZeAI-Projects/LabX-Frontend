import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronDown, Heart, MessageCircle, MoreHorizontal, Paperclip, Plus, Search, Send, Share2, Smile, Trash2, Users, X } from 'lucide-react'
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

function SocialIdentity({ user, profile, compact = false }) {
  const destination = `/profile?userId=${encodeURIComponent(user.id)}`
  const assessment = user.assessment_result || {}
  const details = [profile?.startup?.name, user.domain || assessment.domain, user.stage || assessment.stage, (user.level || assessment.level) && `Level ${user.level || assessment.level}`].filter(Boolean)
  return <div className={`social-identity${compact ? ' social-identity--compact' : ''}`}>
    <Link className="social-identity__avatar" to={destination} aria-label={`Open ${user.full_name || user.username}'s profile`}><ProfileAvatar user={user} /></Link>
    <div className="social-identity__copy">
      <Link to={destination} className="social-identity__name">{user.full_name || user.username}</Link>
      <Link to={destination} className="social-identity__handle">@{user.username || user.email?.split('@')[0]}</Link>
      {!compact && <span className="social-identity__role">{[getRoleLabel(user.role), ...details].join(' · ')}</span>}
    </div>
  </div>
}

function CreatePostDialog({ user, profile, onClose, onPublish }) {
  const dialogRef = useRef(null)
  const editorRef = useRef(null)
  const [text, setText] = useState('')
  const [audience, setAudience] = useState('Everyone')
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

  function addEmoji() {
    const editor = editorRef.current
    if (!editor) return
    const start = editor.selectionStart
    const end = editor.selectionEnd
    const next = `${text.slice(0, start)}✨${text.slice(end)}`
    setText(next)
    requestAnimationFrame(() => {
      editor.focus()
      editor.setSelectionRange(start + 1, start + 1)
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
      <SocialIdentity user={user} profile={profile} compact />
      <label className="social-audience"><span>Post audience</span><span className="social-audience__select"><Users size={15} /><select value={audience} onChange={(event) => setAudience(event.target.value)} aria-label="Post audience"><option>Everyone</option><option>Connections</option><option>Only me</option></select><ChevronDown size={14} /></span></label>
      <textarea ref={editorRef} className="social-editor" value={text} onChange={(event) => { setText(event.target.value); setError('') }} placeholder="What are you building or thinking about?" maxLength={5000} aria-label="Post text" />
      <div className="social-dialog__note">Local preview only — posts are not shared with other accounts.</div>
      <div className="social-composer-tools" aria-label="Available post tools">
        <button type="button" onClick={addEmoji} aria-label="Insert sparkle emoji"><Smile size={18} /><span>Emoji</span></button>
        <span className="social-character-count">{text.length}/5000</span>
      </div>
      {error && <p className="social-error" role="alert">{error}</p>}
      <footer className="social-dialog__footer"><span>Visibility is a local preview setting.</span><button className="social-primary-button" type="submit">Post</button></footer>
    </form>
  </dialog>
}

function ShareLinkDialog({ url, onClose }) {
  const dialogRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  async function copyLink() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable in this browser. Select and copy the link instead.')
      await navigator.clipboard.writeText(url)
      onClose()
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : 'Unable to copy the post link.')
    }
  }

  return <dialog className="social-dialog social-share-dialog" ref={dialogRef} aria-labelledby="social-share-title" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <header className="social-dialog__header"><div><span className="social-eyebrow">Share post</span><h2 id="social-share-title">Copy link</h2></div><button className="social-icon-button" type="button" aria-label="Close share dialog" onClick={onClose}><X size={19} /></button></header>
    <p className="social-share-dialog__description">Anyone with this link can open this post in the current app session.</p>
    <label className="social-sr-only" htmlFor="social-share-url">Post link</label>
    <input id="social-share-url" className="social-share-dialog__url" value={url} readOnly onFocus={event => event.currentTarget.select()} />
    {error && <p className="social-error" role="alert">{error}</p>}
    <footer className="social-dialog__footer"><span>Direct post URL only</span><button className="social-primary-button" type="button" onClick={copyLink}>Copy link</button></footer>
  </dialog>
}

function SocialPost({ post, user, profile, people, onDelete, onLike, onComment }) {
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [likesOpen, setLikesOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [comment, setComment] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const liked = post.likes.includes(user.id)
  const likers = post.likes.map(id => people.find(person => person.id === id)).filter(Boolean)
  const timestamp = relativeTime(post.createdAt)
  const postUrl = `${window.location.origin}${window.location.pathname}#post-${post.id}`

  function submitComment(event) {
    event.preventDefault()
    if (!comment.trim()) return
    onComment(post.id, comment.trim(), replyTo)
    setComment('')
    setReplyTo(null)
  }

  return <article className="social-post" id={`post-${post.id}`}>
    <header className="social-post__header">
      <SocialIdentity user={post.author} profile={post.author.id === user.id ? profile : null} />
      <div className="social-post__header-end"><time dateTime={new Date(post.createdAt).toISOString()}>{timestamp}</time><div className="social-post__menu-wrap">
        {post.author.id === user.id && <>
          <button className="social-icon-button" type="button" aria-label="Post options" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={20} /></button>
          {menuOpen && <div className="social-post__menu"><button type="button" onClick={() => { onDelete(post.id); setMenuOpen(false) }}><Trash2 size={15} />Delete post</button></div>}
        </>}
      </div></div>
    </header>
    <p className="social-post__text">{post.text}</p>
    {post.media && <img className="social-post__media" src={post.media.src} alt={post.media.alt} loading="lazy" />}
    {post.audience !== 'Everyone' && <span className="social-post__audience">{post.audience} · local preview</span>}
    <div className="social-post__stats">
      <button type="button" onClick={() => setCommentsOpen(!commentsOpen)}>{post.comments.length} {post.comments.length === 1 ? 'comment' : 'comments'}</button>
    </div>
    <div className="social-post__actions" aria-label="Post actions">
      <div className="social-action-like">
        <button type="button" className={liked ? 'is-liked' : ''} aria-pressed={liked} onClick={() => onLike(post.id)}><Heart size={17} fill={liked ? 'currentColor' : 'none'} />{liked ? 'Liked' : 'Like'}</button>
        <div className="social-like-count" onMouseEnter={() => setLikesOpen(true)} onMouseLeave={() => setLikesOpen(false)}>
          <button type="button" aria-label={`Show ${post.likes.length} people who liked this post`} aria-expanded={likesOpen} onBlur={() => setLikesOpen(false)} onClick={() => setLikesOpen(open => !open)}>{post.likes.length}</button>
          {likesOpen && <div className="social-likes-popover" role="status">{likers.length ? likers.map(liker => <Link to={`/profile?userId=${encodeURIComponent(liker.id)}`} key={liker.id}><ProfileAvatar user={liker} />{liker.full_name || liker.username}</Link>) : <span>No likes yet</span>}</div>}
        </div>
      </div>
      <button type="button" aria-expanded={commentsOpen} onClick={() => setCommentsOpen(!commentsOpen)}><MessageCircle size={17} />Comment</button>
      <button type="button" onClick={() => setShareOpen(true)}><Share2 size={17} />Share</button>
    </div>
    {commentsOpen && <section className="social-comments" aria-label="Comments">
      {post.comments.map((item) => <article className={`social-comment${item.replyTo ? ' social-comment--reply' : ''}`} key={item.id}>
        <Link className="social-comment__avatar" to={`/profile?userId=${encodeURIComponent(item.author.id)}`} aria-label={`Open ${item.author.full_name}'s profile`}><ProfileAvatar user={item.author} /></Link>
        <div><p><Link to={`/profile?userId=${encodeURIComponent(item.author.id)}`}><strong>{item.author.full_name || item.author.username}</strong></Link><span>{item.text}</span></p><button type="button" onClick={() => setReplyTo(item.id)}>Reply</button></div>
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
  </article>
}

function MessagesPanel({ user, people, followedUsers, initialConversations }) {
  const [search, setSearch] = useState('')
  const [newMessage, setNewMessage] = useState(false)
  const [query, setQuery] = useState('')
  const [conversations, setConversations] = useState(initialConversations)
  const [selectedId, setSelectedId] = useState(initialConversations[0]?.id || null)
  const [mobileChat, setMobileChat] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [notice, setNotice] = useState('')
  const threadRef = useRef(null)
  const selected = conversations.find(conversation => conversation.id === selectedId)
  const matches = followedUsers.filter(person => `${person.full_name} ${person.username}`.toLowerCase().includes(query.trim().toLowerCase()))
  const visibleConversations = conversations.filter(conversation => `${conversation.person.full_name} ${conversation.person.username}`.toLowerCase().includes(search.trim().toLowerCase()))

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [selectedId, selected?.messages.length])

  function openConversation(conversation) {
    setSelectedId(conversation.id)
    setConversations(current => current.map(item => item.id === conversation.id ? { ...item, unreadCount: 0 } : item))
    setMobileChat(true)
    setNewMessage(false)
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
    const conversation = { id: `social-demo-conversation-${person.id}`, person, unreadCount: 0, messages: [] }
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
      ? { ...conversation, unreadCount: 0, messages: [...conversation.messages, nextMessage] }
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
      <header className="social-inbox__header"><div><h2>Messages</h2><p>Your conversations</p></div><button className="social-icon-button social-compose-button" type="button" aria-label="New message" title="New message" onClick={() => { setNewMessage(true); setQuery('') }}><Plus size={20} /></button></header>
      <label className="social-search social-search--inbox"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" /></label>
      {newMessage && <section className="social-recipient-panel" aria-label="New message recipient selection">
        <header><h3>New Message</h3><button type="button" className="social-icon-button" onClick={() => setNewMessage(false)} aria-label="Close new message"><X size={17} /></button></header>
        <label className="social-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people you follow" aria-label="Search followed users" /></label>
        <div className="social-recipient-list">
          {!followedUsers.length ? <p>You're not following anyone yet.</p> : !matches.length ? <p>No matching users found.</p> : matches.map(person => <button className="social-recipient" type="button" key={person.id} onClick={() => openPerson(person)}>
            <ProfileAvatar user={person} /><span><strong>{person.full_name}</strong><small>@{person.username}</small></span>
          </button>)}
        </div>
      </section>}
      {notice && <p className="social-inbox__notice" role="status">{notice}</p>}
      <div className="social-conversation-list" aria-label="Conversation list">
        {!visibleConversations.length ? <div className="social-inbox__empty"><MessageCircle size={24} /><strong>{search.trim() ? 'No conversations found' : 'No conversations yet'}</strong><span>{search.trim() ? 'Try another name or username.' : 'Your conversations will appear here.'}</span></div> : visibleConversations.map(conversation => {
          const lastMessage = conversation.messages.at(-1)
          return <div className="social-conversation" key={conversation.id} aria-current={selectedId === conversation.id ? 'true' : undefined}>
            <Link className="social-conversation__avatar" to={`/profile?userId=${encodeURIComponent(conversation.person.id)}`} aria-label={`Open ${conversation.person.full_name}'s profile`}><ProfileAvatar user={conversation.person} /></Link>
            <span className="social-conversation__copy">
              <Link className="social-conversation__name" to={`/profile?userId=${encodeURIComponent(conversation.person.id)}`}>{conversation.person.full_name}</Link>
              <button className="social-conversation__preview" type="button" onClick={() => openConversation(conversation)}>{lastMessage?.text || (lastMessage?.attachment ? `Attachment: ${lastMessage.attachment.name}` : 'Start a conversation')}</button>
            </span>
            <button className="social-conversation__meta" type="button" aria-label={`Open conversation with ${conversation.person.full_name}`} onClick={() => openConversation(conversation)}><time>{lastMessage ? relativeTime(lastMessage.createdAt) : ''}</time>{conversation.unreadCount > 0 && <span className="social-unread">{conversation.unreadCount}</span>}</button>
          </div>
        })}
      </div>
    </aside>
    <section className={`social-chat${mobileChat ? ' social-chat--active' : ''}`} aria-label="Conversation">
      {selected ? <>
        <header className="social-chat__header">
          <button className="social-chat__back" type="button" onClick={() => setMobileChat(false)}><ArrowLeft size={17} /><span className="social-sr-only">Back to conversations</span></button>
          <SocialIdentity user={selected.person} compact />
        </header>
        <div className="social-chat__thread" ref={threadRef} aria-live="polite">
          {selected.messages.map(message => {
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
          })}
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

  return <div className="social-page">
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
      <div className="social-feed">
          {visiblePosts.map(post => <SocialPost
            key={post.id}
            post={post}
            user={user}
            profile={profile}
            people={demo.users}
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
