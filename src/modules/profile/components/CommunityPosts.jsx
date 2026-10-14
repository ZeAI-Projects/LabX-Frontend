import {usePreviewDialog} from '../usePreviewDialog';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft as ChevronLeft, ChevronRight, FileText, Heart, MessageCircle, Send, X } from 'lucide-react';

// 1. Latest-first ordering. Undated sample posts retain their existing order.
function newestFirst(posts) {
  const items = Array.isArray(posts) ? posts : [];
  if (!items.every((post) => Number.isFinite(Date.parse(post?.date)))) return items;
  return [...items].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

// 2. Responsive post count. No ResizeObserver is needed for this prototype.
function usePostsPerPage() {
  const [count, setCount] = useState(3);

  useEffect(() => {
    const update = () => setCount(window.innerWidth <= 640 ? 1 : window.innerWidth <= 1100 ? 2 : 3);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return count;
}

export default function CommunityPosts({ profile, posts = [], onLike, onComment, isSelf = true }) {
  const items = useMemo(() => newestFirst(posts), [posts]);
  const perPage = usePostsPerPage();
  const [offset, setOffset] = useState(0);
  const [commentPostId, setCommentPostId] = useState(null);
  const [commentInput, setCommentInput] = useState('');

  const maxOffset = Math.max(0, items.length - perPage);
  const index = Math.min(Math.max(0, offset), maxOffset);
  const shown = items.slice(index, index + perPage);
  const currentPost = items.find((item) => item.id === commentPostId);
  const dialogRef = usePreviewDialog(Boolean(currentPost), () => setCommentPostId(null));
  const name = profile?.name || 'LabX Member';
  const avatar = profile?.avatar || '';

  function addComment(event) {
    event.preventDefault();
    if (!commentInput.trim() || !currentPost) return;
    onComment?.(currentPost.id, commentInput.trim());
    setCommentInput('');
  }

  return (
    <section className="lp-community-section" aria-label="Community footprint">
      <div className="lp-section-title">
        <div>
          <span className="lp-kicker">COMMUNITY FOOTPRINT</span>
          <h3>{isSelf ? 'Your posts' : `${name.split(' ')[0]}'s posts`}</h3>
        </div>
        <span />
      </div>

      {items.length === 0 ? (
        <div className="lp-post lp-no-posts">
          <FileText size={26} />
          <strong>No posts yet</strong>
          <p>Community updates will appear here.</p>
        </div>
      ) : (
        <>
          <div className="lp-posts lp-posts--slider" style={{ '--visible-posts': perPage }} key={`${profile?.id}-${index}-${perPage}`}>
            {shown.map((post) => (
              <article className="lp-post" key={post.id}>
                <div className="lp-post__author">
                  <span className="lp-post__avatar" aria-hidden="true">
                    {avatar ? <img src={avatar} alt="" /> : name[0]?.toUpperCase()}
                  </span>
                  <div><strong>{name}</strong><small>{post.date || 'Recent'}</small></div>
                </div>
                <p>{post.content || ''}</p>
                <div className="lp-post__actions">
                  <button type="button" className={post.liked ? 'is-liked' : ''} onClick={() => onLike?.(post.id)}>
                    <Heart size={16} fill={post.liked ? 'currentColor' : 'none'} /> {post.likes ?? 0} Likes
                  </button>
                  <button type="button" onClick={() => setCommentPostId(post.id)}>
                    <MessageCircle size={16} /> {post.comments?.length ?? 0} Comments
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="lp-carousel-footer">
            <span className="lp-carousel-count">Showing {index + 1}–{index + shown.length} of {items.length} posts</span>
            <div className="lp-carousel-controls">
              <button type="button" disabled={index === 0} onClick={() => setOffset(Math.max(0, index - 1))} aria-label="Newer posts">
                <ChevronLeft size={18} /> Newer
              </button>
              <button type="button" disabled={index === maxOffset} onClick={() => setOffset(Math.min(maxOffset, index + 1))} aria-label="Older posts">
                Older <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* 4. Local mock comments modal: never calls an API. */}
      {currentPost && (
        <div className="lp-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommentPostId(null); }}>
          <section ref={dialogRef} className="lp-modal lp-modal--small" role="dialog" aria-modal="true" aria-labelledby="comment-title">
            <div className="lp-modal__heading">
              <div><span className="lp-kicker">COMMUNITY</span><h3 id="comment-title">Comments</h3></div>
              <button className="lp-icon-button" type="button" aria-label="Close comments" onClick={() => setCommentPostId(null)}><X size={19} /></button>
            </div>
            <div className="lp-modal__content">
              <p className="lp-comment-post">{currentPost.content}</p>
              <div className="lp-comments">
                {currentPost.comments?.length ? currentPost.comments.map((comment) => (
                  <div key={comment.id}><strong>{comment.author}</strong><span>{comment.text}</span></div>
                )) : <p className="lp-empty-text">No comments yet. Start the conversation.</p>}
              </div>
            </div>
            <form className="lp-modal__footer" onSubmit={addComment}>
              <input required maxLength={280} aria-label="Comment" placeholder="Write a comment..." value={commentInput} onChange={(event) => setCommentInput(event.target.value)} />
              <button className="lp-button lp-button--primary" type="submit" aria-label="Post comment"><Send size={17} /></button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
