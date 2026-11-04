import { useState } from 'react'
import { Heart, MessageCircle, Users } from 'lucide-react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/use_auth.js'
import { profileStore } from '../../profile/services/profile_store.js'
import { ProfileAvatar } from '../../profile/components/ProfileDialog.jsx'
import { mockPosts } from '../services/mock_social.js'
import './SocialPage.css'

function PostCard({ post, author }) {
  const [liked, setLiked] = useState(false)
  return <article className="social-post">
    <header className="social-post__author">
      <ProfileAvatar profile={author} small />
      <div><strong>{author.full_name}</strong><span>@{author.username}</span></div>
      <time>{post.time}</time>
    </header>
    <p className="social-post__content">{post.content}</p>
    <div className="social-post__actions">
      <button type="button" className={liked ? 'is-liked' : ''} aria-pressed={liked} onClick={() => setLiked((value) => !value)}>
        <Heart size={16} aria-hidden="true" />{post.likes + Number(liked)} Likes
      </button>
      <span><MessageCircle size={16} aria-hidden="true" />{post.comments} Comments</span>
    </div>
  </article>
}

export function SocialPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  if (user.role !== 'founder') return <Navigate to="/dashboard" replace />
  const profile = profileStore.read(user.id)
  const author = { ...profile, full_name: user.full_name, username: user.username }
  const myPosts = searchParams.get('view') === 'mine'

  return <section className="social-page">
    <header className="social-page__heading">
      <span className="social-page__eyebrow"><Users size={15} aria-hidden="true" />Founder community</span>
      <h1>Social</h1>
      <p>Share what you are building and learn from other founders.</p>
    </header>
    {myPosts && <header className="social-page__view-heading"><h2>My Posts</h2><p>Your posts shared with the LabX community.</p></header>}
    <section className="social-page__feed" aria-label={myPosts ? 'My posts' : 'Social posts'}>
      {mockPosts.map((post) => <PostCard key={post.id} post={post} author={author} />)}
    </section>
  </section>
}
