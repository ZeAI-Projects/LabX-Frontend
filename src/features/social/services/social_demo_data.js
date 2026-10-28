import { sessionStore } from '../../../services/storage/local_storage.js'

const minutesAgo = (minutes) => Date.now() - minutes * 60_000
const socialPostsKey = (userId) => `labx:social-demo-posts:v1:${encodeURIComponent(userId)}`

const demoPeople = [
  {
    id: 'social-demo-ava',
    full_name: 'Ava Patel',
    username: 'avapatel',
    email: 'ava@example.demo',
    role: 'founder',
    domain: 'ClimateTech',
    stage: 'Prototype',
    level: 2,
    canMessage: true,
  },
  {
    id: 'social-demo-noah',
    full_name: 'Noah Kim',
    username: 'noahbuilds',
    email: 'noah@example.demo',
    role: 'founder',
    domain: 'HealthTech',
    stage: 'Early stage',
    level: 3,
    canMessage: true,
  },
  {
    id: 'social-demo-mira',
    full_name: 'Mira Shah',
    username: 'mirashah',
    email: 'mira@example.demo',
    role: 'founder',
    domain: 'EdTech',
    stage: 'Idea',
    level: 1,
  },
]

export function createSocialDemoData(currentUser) {
  const [ava, noah, mira] = demoPeople
  const users = [currentUser, ...demoPeople]
  return {
    users,
    followedUsers: [ava, noah],
    posts: [
      {
        id: 'social-demo-post-ava',
        author: ava,
        media: { src: '/social-demo/soil-sensor.svg', alt: 'Illustration of a soil sensor in a green field' },
        text: 'We tested our first low-cost soil sensor with three local farms this week. The best feedback came from watching people use it without any instructions. Back to the prototype with a much clearer idea of what matters. 🌱',
        createdAt: minutesAgo(18),
        audience: 'Everyone',
        likes: [noah.id, currentUser.id],
        comments: [
          { id: 'social-demo-comment-ava-1', author: noah, text: 'That hands-on feedback is invaluable. What are you changing first?', replyTo: null },
          { id: 'social-demo-comment-ava-2', author: ava, text: 'Making the calibration step more visible and much shorter.', replyTo: 'social-demo-comment-ava-1' },
        ],
      },
      {
        id: 'social-demo-post-noah',
        author: noah,
        media: { src: '/social-demo/clinic-flow.svg', alt: 'Illustration of a welcoming health clinic' },
        text: 'A small milestone for our team: the first clinic has agreed to review our appointment-flow prototype. We are keeping the next round focused on listening before we add another feature.',
        createdAt: minutesAgo(94),
        audience: 'Everyone',
        likes: [ava.id],
        comments: [
          { id: 'social-demo-comment-noah-1', author: mira, text: 'Congratulations! Starting with their workflow is such a good call.', replyTo: null },
        ],
      },
      {
        id: 'social-demo-post-mira',
        author: mira,
        media: { src: '/social-demo/classroom.svg', alt: 'Illustration of a bright collaborative classroom' },
        text: 'This week I am talking with teachers about the small classroom moments where students get stuck. If you have run a useful discovery interview, I would love to hear what helped you ask better questions.',
        createdAt: minutesAgo(360),
        audience: 'Everyone',
        likes: [ava.id, noah.id, currentUser.id],
        comments: [],
      },
    ],
    conversations: [
      {
        id: 'social-demo-conversation-ava',
        person: ava,
        unreadCount: 2,
        messages: [
          { id: 'social-demo-message-ava-1', senderId: ava.id, text: 'Hi! I saw your update about the prototype. How did you organize the first test?', createdAt: minutesAgo(165) },
          { id: 'social-demo-message-ava-2', senderId: currentUser.id, text: 'We started with a short task and asked people to think aloud.', createdAt: minutesAgo(158) },
          { id: 'social-demo-message-ava-3', senderId: ava.id, text: 'That is helpful, thanks. I will try that with our next round.', createdAt: minutesAgo(152) },
        ],
      },
      {
        id: 'social-demo-conversation-noah',
        person: noah,
        unreadCount: 0,
        messages: [
          { id: 'social-demo-message-noah-1', senderId: currentUser.id, text: 'Would you be open to sharing notes on user interviews?', createdAt: minutesAgo(720) },
          { id: 'social-demo-message-noah-2', senderId: noah.id, text: 'Absolutely. I can send over a few prompts that worked for us.', createdAt: minutesAgo(708) },
        ],
      },
      {
        id: 'social-demo-conversation-mira',
        person: mira,
        unreadCount: 1,
        messages: [
          { id: 'social-demo-message-mira-1', senderId: mira.id, text: 'I am hosting a small founder feedback session next week. Let me know if you would like to join.', createdAt: minutesAgo(1440) },
        ],
      },
    ],
  }
}

export function readCreatedSocialPosts(userId) {
  const saved = sessionStore.readJSON(socialPostsKey(userId), [])
  if (!Array.isArray(saved)) return []
  return saved.filter(post => post && post.author?.id === userId && typeof post.id === 'string' && typeof post.text === 'string' && Number.isFinite(post.createdAt))
}

export function saveCreatedSocialPost(userId, post) {
  const current = readCreatedSocialPosts(userId)
  sessionStore.writeJSON(socialPostsKey(userId), [post, ...current.filter(item => item.id !== post.id)])
}

export function writeCreatedSocialPosts(userId, posts) {
  sessionStore.writeJSON(socialPostsKey(userId), posts.filter(post => post.author?.id === userId))
}
