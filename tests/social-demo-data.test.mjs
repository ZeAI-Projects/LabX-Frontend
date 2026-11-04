import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { createSocialDemoData, readCreatedSocialPosts, saveCreatedSocialPost, writeCreatedSocialPosts } from '../src/features/social/services/social_demo_data.js'

const user = {
  id: `social-test-${crypto.randomUUID()}`,
  full_name: 'Test Founder',
  username: 'testfounder',
  email: 'test@example.demo',
  role: 'founder',
}

test('Social mock data includes image and text-only posts, reactions, follows, and conversations', () => {
  const data = createSocialDemoData(user)
  assert.equal(data.posts.length, 12)
  assert.ok(data.posts.every((post, index) => index === 0 || data.posts[index - 1].createdAt >= post.createdAt))
  assert.ok(data.posts.every(post => {
    const media = post.media ? (Array.isArray(post.media) ? post.media : [post.media]) : []
    return media.every(item => item.src && item.alt) && Array.isArray(post.likes) && Array.isArray(post.comments) && post.createdAt
  }))
  assert.ok(data.posts.some(post => post.media))
  assert.ok(data.posts.some(post => !post.media))
  const longTextPost = data.posts.find(post => post.id === 'social-demo-post-long-text')
  assert.ok(longTextPost)
  assert.equal(longTextPost.text.trim().split(/\s+/).length, 3000)
  assert.equal(longTextPost.media, undefined)
  assert.ok(data.posts.some(post => post.comments.length > 0))
  assert.equal(data.followedUsers.length, 12)
  assert.equal(new Set(data.followedUsers.map(person => person.id)).size, data.followedUsers.length)
  assert.ok(data.followedUsers.every(person => person.canMessage))
  assert.ok(data.conversations.length >= 2)
  assert.ok(data.conversations.every(conversation => conversation.messages.length > 0))
  assert.ok(data.conversations.reduce((total, conversation) => total + conversation.messages.length, 0) >= 15)
  assert.ok(data.conversations.every(conversation => data.posts.some(post => post.author.id === conversation.person.id)))

  for (const post of data.posts) {
    const media = post.media ? (Array.isArray(post.media) ? post.media : [post.media]) : []
    for (const item of media) {
      const asset = fileURLToPath(new URL(`../public${item.src}`, import.meta.url))
      assert.ok(existsSync(asset), `Expected mock media asset ${item.src}`)
    }
  }
})

test('created founder posts are available in the session-only post history', () => {
  const post = {
    id: 'social-test-created-post',
    author: user,
    text: 'Testing a founder post.',
    createdAt: Date.now(),
    audience: 'Everyone',
    likes: [],
    comments: [],
  }

  saveCreatedSocialPost(user.id, post)
  assert.deepEqual(readCreatedSocialPosts(user.id), [post])
  writeCreatedSocialPosts(user.id, [])
  assert.deepEqual(readCreatedSocialPosts(user.id), [])
})
