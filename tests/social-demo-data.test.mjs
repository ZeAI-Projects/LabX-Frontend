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

test('Social mock data includes media, reactions, comments, follows, and conversations', () => {
  const data = createSocialDemoData(user)
  assert.equal(data.posts.length, 3)
  assert.ok(data.posts.every(post => post.media?.src && post.media?.alt && post.likes.length && post.createdAt))
  assert.ok(data.posts.some(post => post.comments.length > 0))
  assert.deepEqual(data.followedUsers.map(person => person.id), ['social-demo-ava', 'social-demo-noah'])
  assert.ok(data.conversations.length >= 2)
  assert.ok(data.conversations.every(conversation => conversation.messages.length > 0))

  for (const post of data.posts) {
    const asset = fileURLToPath(new URL(`../public${post.media.src}`, import.meta.url))
    assert.ok(existsSync(asset), `Expected mock media asset ${post.media.src}`)
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
