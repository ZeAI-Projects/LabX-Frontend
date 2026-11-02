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
    bio: 'Building practical climate tools with the people who will use them every day.',
    city: 'Pune',
    country: 'India',
    skills: ['Product research', 'Hardware prototyping', 'Climate innovation'],
    interests: ['Regenerative farming', 'Open data', 'Community-led design'],
    goals: 'Partner with farms to make soil health easier to understand and improve.',
    professional_background: 'Product designer focused on accessible tools for local agriculture.',
    education: 'Environmental design and human-centered technology.',
    startup: { name: 'Groundwork', description: 'Affordable soil monitoring designed with small farms.', problem: 'Farmers often lack timely, practical soil health information.', solution: 'A simple sensor and clear guidance for everyday decisions.' },
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
    bio: 'Making the first steps into care easier for patients and clinic teams.',
    city: 'Seoul',
    country: 'South Korea',
    skills: ['Service design', 'User interviews', 'Healthcare operations'],
    interests: ['Community health', 'Inclusive research', 'Thoughtful technology'],
    goals: 'Help small clinics create calmer and more accessible patient experiences.',
    professional_background: 'Product builder working with independent clinics and care teams.',
    education: 'Public health and interaction design.',
    startup: { name: 'Carepath', description: 'A clearer appointment journey for community clinics.', problem: 'Patients can find booking and preparation steps confusing.', solution: 'A lightweight flow that makes each next step clear.' },
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
  {
    id: 'social-demo-sam',
    full_name: 'Sam Rivera',
    username: 'samrivera',
    email: 'sam@example.demo',
    role: 'founder',
    domain: 'AssistiveTech',
    stage: 'Prototype',
    level: 2,
    canMessage: true,
  },
  {
    id: 'social-demo-leila',
    full_name: 'Leila Chen',
    username: 'leilagrows',
    email: 'leila@example.demo',
    role: 'founder',
    domain: 'Food Systems',
    stage: 'Early stage',
    level: 2,
    canMessage: true,
  },
  {
    id: 'social-demo-omar',
    full_name: 'Omar Davis',
    username: 'omardavis',
    email: 'omar@example.demo',
    role: 'founder',
    domain: 'FinTech',
    stage: 'Prototype',
    level: 3,
    canMessage: true,
  },
  {
    id: 'social-demo-priya',
    full_name: 'Priya Nair',
    username: 'priyanair',
    email: 'priya@example.demo',
    role: 'founder',
    domain: 'Creator Tools',
    stage: 'Idea',
    level: 1,
    canMessage: true,
  },
  {
    id: 'social-demo-ethan',
    full_name: 'Ethan Brooks',
    username: 'ethanbuilds',
    email: 'ethan@example.demo',
    role: 'founder',
    domain: 'Accessibility',
    stage: 'Early stage',
    level: 2,
    canMessage: true,
  },
  {
    id: 'social-demo-noor',
    full_name: 'Noor Hassan',
    username: 'noorhassan',
    email: 'noor@example.demo',
    role: 'founder',
    domain: 'Clean Energy',
    stage: 'Prototype',
    level: 2,
    canMessage: true,
  },
  {
    id: 'social-demo-elena',
    full_name: 'Elena Park',
    username: 'elenapark',
    email: 'elena@example.demo',
    role: 'founder',
    domain: 'Learning Tools',
    stage: 'Early stage',
    level: 3,
    canMessage: true,
  },
  {
    id: 'social-demo-mateo',
    full_name: 'Mateo Silva',
    username: 'mateosilva',
    email: 'mateo@example.demo',
    role: 'founder',
    domain: 'Local Commerce',
    stage: 'Idea',
    level: 1,
    canMessage: true,
  },
  {
    id: 'social-demo-grace',
    full_name: 'Grace Okafor',
    username: 'graceokafor',
    email: 'grace@example.demo',
    role: 'founder',
    domain: 'HealthTech',
    stage: 'Prototype',
    level: 2,
    canMessage: true,
  },
  {
    id: 'social-demo-aiden',
    full_name: 'Aiden Lee',
    username: 'aidenlee',
    email: 'aiden@example.demo',
    role: 'founder',
    domain: 'ClimateTech',
    stage: 'Early stage',
    level: 2,
    canMessage: true,
  },
]

export function findSocialDemoPerson(userId) {
  return demoPeople.find(person => person.id === userId) || null
}

export function createSocialDemoData(currentUser) {
  const [ava, noah, mira, sam, leila, omar, priya, ethan, noor, elena, mateo, grace, aiden] = demoPeople
  const users = [currentUser, ...demoPeople]
  const longPostSentences = [
    'This week reminded me that building a useful product begins with listening carefully before deciding what the solution should become.',
    'Our small team spent time with community members, taking notes about their routines, constraints, questions, and moments of uncertainty.',
    'The most valuable insights were not dramatic announcements but ordinary details that changed how we understood the problem.',
    'We learned to ask open questions, leave room for silence, and avoid turning an early assumption into a feature too quickly.',
    'Every conversation helped us see that a promising idea needs patience, context, and a willingness to change direction.',
    'Our first prototype was deliberately simple so people could react to the experience instead of being distracted by polish.',
    'Some people understood the flow immediately, while others showed us exactly where our language and expectations were unclear.',
    'We are treating those pauses as useful evidence and making the next version more welcoming, predictable, and accessible.',
    'A thoughtful product should respect the time people give us and make its purpose clear without requiring a long explanation.',
    'The team has started writing down what we know, what we still need to learn, and which questions deserve another conversation.',
    'This process is slower than guessing, but it gives us a stronger foundation for decisions that affect real people.',
    'We are also learning to make progress visible by sharing small experiments, honest results, and the next steps we can take.',
    'Not every test confirmed our expectations, and that was a good reminder to stay curious rather than defend an early plan.',
    'We will keep the scope focused, invite feedback from different perspectives, and improve one meaningful part of the experience at a time.',
    'The goal is not to add more features but to make the essential task feel clear, trustworthy, and genuinely useful.',
    'I am grateful to everyone who shared their time and helped us notice the details we would have otherwise missed.',
    'Our next milestone is another round of testing with a more accessible prototype and a simpler introduction for first-time visitors.',
    'We will compare what people expect with what they actually experience and use those observations to guide our next decisions.',
    'Progress can look like a smaller plan, a better question, or the confidence to remove something that does not help.',
    'I hope this update encourages other builders to share their learning while the work is still in progress.',
  ]
  const longPostWords = []
  while (longPostWords.length < 3000) {
    const sentence = longPostSentences[Math.floor(longPostWords.length / 20) % longPostSentences.length]
    longPostWords.push(...sentence.split(/\s+/))
  }
  const longPostText = longPostWords.slice(0, 3000).join(' ')
  return {
    users,
    followedUsers: [ava, noah, sam, leila, omar, priya, ethan, noor, elena, mateo, grace, aiden],
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
        text: 'This week I am talking with teachers about the small classroom moments where students get stuck. If you have run a useful discovery interview, I would love to hear what helped you ask better questions.',
        createdAt: minutesAgo(360),
        audience: 'Everyone',
        likes: [],
        comments: [],
      },
      {
        id: 'social-demo-post-sam',
        author: sam,
        media: [
          { src: '/social-demo/soil-sensor.svg', alt: 'Illustration of a soil sensor in a green field' },
          { src: '/social-demo/classroom.svg', alt: 'Illustration of a bright collaborative classroom' },
        ],
        text: 'We spent this week testing our updated navigation with screen-reader users. The small changes to labels made the biggest difference, so we are carrying those lessons into the next prototype.',
        createdAt: minutesAgo(31),
        audience: 'Everyone',
        likes: [ava.id, currentUser.id],
        comments: [],
      },
      {
        id: 'social-demo-post-leila',
        author: leila,
        media: [
          { src: '/social-demo/classroom.svg', alt: 'Illustration of a bright collaborative classroom' },
          { src: '/social-demo/soil-sensor.svg', alt: 'Illustration of a soil sensor in a green field' },
          { src: '/social-demo/clinic-flow.svg', alt: 'Illustration of a welcoming health clinic' },
        ],
        text: 'Our first neighborhood produce pickup is in the books. We learned a lot about making collection times work for busy families, and have a few ideas to test with our partners next week.',
        createdAt: minutesAgo(53),
        audience: 'Everyone',
        likes: [noah.id],
        comments: [],
      },
      {
        id: 'social-demo-post-omar',
        author: omar,
        media: [
          { src: '/social-demo/clinic-flow.svg', alt: 'Illustration of a welcoming health clinic' },
          { src: '/social-demo/classroom.svg', alt: 'Illustration of a bright collaborative classroom' },
        ],
        text: 'We mapped the onboarding journey with a handful of first-time users today. Seeing where people paused was more useful than another round of internal review.',
        createdAt: minutesAgo(77),
        audience: 'Everyone',
        likes: [sam.id, currentUser.id],
        comments: [],
      },
      {
        id: 'social-demo-post-priya',
        author: priya,
        media: [
          { src: '/social-demo/classroom.svg', alt: 'Illustration of a bright collaborative classroom' },
          { src: '/social-demo/clinic-flow.svg', alt: 'Illustration of a welcoming health clinic' },
          { src: '/social-demo/soil-sensor.svg', alt: 'Illustration of a soil sensor in a green field' },
        ],
        text: 'Three creators tried our draft publishing flow this week. They all wanted a clearer preview before sharing, so that is now the next experiment on our list.',
        createdAt: minutesAgo(108),
        audience: 'Everyone',
        likes: [leila.id],
        comments: [],
      },
      {
        id: 'social-demo-post-ethan',
        author: ethan,
        text: 'A useful reminder from our latest feedback session: accessibility needs to be part of the first draft, not the final checklist. We are updating our test plan to reflect that.',
        createdAt: minutesAgo(137),
        audience: 'Everyone',
        likes: [],
        comments: [],
      },
      {
        id: 'social-demo-post-long-text',
        author: noor,
        text: longPostText,
        createdAt: minutesAgo(180),
        audience: 'Everyone',
        likes: [],
        comments: [],
      },
    ].sort((a, b) => b.createdAt - a.createdAt),
    conversations: [
      {
        id: 'social-demo-conversation-ava',
        person: ava,
        unreadCount: 2,
        messages: [
          { id: 'social-demo-message-ava-1', senderId: ava.id, text: 'Hi! I saw your update about the prototype. How did you organize the first test?', createdAt: minutesAgo(165) },
          { id: 'social-demo-message-ava-2', senderId: currentUser.id, text: 'We started with a short task and asked people to think aloud.', createdAt: minutesAgo(158) },
          { id: 'social-demo-message-ava-3', senderId: ava.id, text: 'That is helpful, thanks. I will try that with our next round.', createdAt: minutesAgo(152) },
          { id: 'social-demo-message-ava-4', senderId: currentUser.id, text: 'A short task helped keep the feedback focused.', createdAt: minutesAgo(143) },
          { id: 'social-demo-message-ava-5', senderId: ava.id, text: 'That makes sense. I will try a simpler first-use task.', createdAt: minutesAgo(137) },
          { id: 'social-demo-message-ava-6', senderId: currentUser.id, text: 'Let me know how it goes with the next group.', createdAt: minutesAgo(129) },
          { id: 'social-demo-message-ava-7', senderId: ava.id, text: 'We have another farm visit scheduled for Friday.', createdAt: minutesAgo(118) },
          { id: 'social-demo-message-ava-8', senderId: currentUser.id, text: 'Nice. I hope the revised calibration step feels clearer.', createdAt: minutesAgo(108) },
          { id: 'social-demo-message-ava-9', senderId: ava.id, text: 'I will make a note of where people pause this time.', createdAt: minutesAgo(99) },
          { id: 'social-demo-message-ava-10', senderId: currentUser.id, text: 'That should give you a useful comparison with the first test.', createdAt: minutesAgo(90) },
        ],
      },
      {
        id: 'social-demo-conversation-noah',
        person: noah,
        unreadCount: 0,
        messages: [
          { id: 'social-demo-message-noah-1', senderId: currentUser.id, text: 'Would you be open to sharing notes on user interviews?', createdAt: minutesAgo(720) },
          { id: 'social-demo-message-noah-2', senderId: noah.id, text: 'Absolutely. I can send over a few prompts that worked for us.', createdAt: minutesAgo(708) },
          { id: 'social-demo-message-noah-3', senderId: currentUser.id, text: 'That would be great. We are planning another round next week.', createdAt: minutesAgo(700) },
          { id: 'social-demo-message-noah-4', senderId: noah.id, text: 'I will share a few prompts that helped us get useful detail.', createdAt: minutesAgo(690) },
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
