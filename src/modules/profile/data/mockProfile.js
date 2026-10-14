
/**
 * LabX Profile — Mock Data
 *
 * Purpose:
 * Sample profiles for frontend UI design and review.
 *
 * No API calls, authentication, or database connections.
 * All changes are temporary React state changes.
 *
 * Sample timeline: July 2026 – October 2026.
 */

// Create a mock community member.
const member = (id, name, handle) => ({
  id,
  name,
  handle,
  initials: name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase(),
});

export const mockProfiles = {

  // =====================================================
  // 1. LOGGED-IN FOUNDER PROFILE — THREE MONTHS OF ACTIVITY
  // =====================================================

  self: {
    id: 'demo-founder-01',

    name: 'Deshikh Raaj',
    handle: 'deshikhraaj24',
    role: 'Founder',
    email: 'deshikh@example.com',

    memberSince: '2026-07-14',

    bio:
      'Founder of NextGen Labs | Building AI-powered digital products. ' +
      'Passionate about turning ideas into practical solutions through ' +
      'software development, product design and continuous learning.',

    location: 'Chennai, Tamil Nadu, India',

    // Empty avatar displays the user's initial.
    avatar: '',

    domain: 'Artificial Intelligence & Machine Learning',

    // Professional skills.
    skills: [
      'React.js',
      'JavaScript',
      'Python',
      'FastAPI',
      'PostgreSQL',
      'SQLAlchemy',
      'UI/UX Design',
      'REST APIs',
      'Git & GitHub',
      'Product Development',
    ],

    // Interests and focus areas.
    interests: [
      'Artificial Intelligence',
      'Machine Learning',
      'SaaS Products',
      'Startup Ecosystem',
      'Web Development',
      'Business Analytics',
      'Product Management',
      'Automation',
    ],

    // Founder goals.
    goals: [
      'Launch the first working MVP of NextGen Labs',
      'Validate the product with 50 potential customers',
      'Build a founding team with complementary skills',
      'Improve product architecture and scalability',
      'Present the startup to mentors and investors',
    ],

    // Mock portfolio links.
    links: [
      {
        id: 1,
        label: 'GitHub',
        url: 'https://github.com',
      },
      {
        id: 2,
        label: 'LinkedIn',
        url: 'https://www.linkedin.com',
      },
      {
        id: 3,
        label: 'Portfolio',
        url: 'https://example.com',
      },
      {
        id: 4,
        label: 'Project Documentation',
        url: 'https://example.com/project',
      },
    ],

    // Startup progress shown in Venture Snapshot.
    startup: {
      name: 'NextGen Labs',

      description:
        'An early-stage technology startup focused on making ' +
        'intelligent digital tools accessible to individuals ' +
        'and growing businesses.',

      stage: 'Build',
      level: 'Level 4',
      guild: 'AI & Machine Learning Guild',
    },

    // Community connections.
    followers: [
      member('m1', 'Aarav Menon', 'aaravbuilds'),
      member('m2', 'Meera Krishnan', 'meeracreates'),
      member('m3', 'Karthik S', 'karthikcodes'),
      member('m4', 'Aditi Rao', 'aditiproduct'),
      member('m5', 'Naveen Kumar', 'naveeninnovates'),
      member('m6', 'Priya Sharma', 'priyadesigns'),
      member('m7', 'Rahul Dev', 'rahultech'),
      member('m8', 'Ananya R', 'ananyafounder'),
      member('m9', 'Arjun Prakash', 'arjunstartup'),
      member('m10', 'Sneha Iyer', 'snehabuilds'),
      member('m11', 'Vikram N', 'vikramai'),
      member('m12', 'Harini Raj', 'hariniproduct'),
    ],

    following: [
      member('m13', 'Aarav Menon', 'aaravbuilds'),
      member('m14', 'Meera Krishnan', 'meeracreates'),
      member('m15', 'Aditi Rao', 'aditiproduct'),
      member('m16', 'Karthik S', 'karthikcodes'),
      member('m17', 'Priya Sharma', 'priyadesigns'),
      member('m18', 'Rahul Dev', 'rahultech'),
      member('m19', 'Ananya R', 'ananyafounder'),
      member('m20', 'Naveen Kumar', 'naveeninnovates'),
      member('m21', 'Sneha Iyer', 'snehabuilds'),
    ],

    // Example balance for visual testing.
    coins: 3270,

    // Keep false to demonstrate the application UI.
    passportVerified: false,

    // Example achievements for the mock prototype.
    badges: [
      {
        id: 'badge-01',
        name: 'First Steps',
        icon: '🏆',
      },
      {
        id: 'badge-02',
        name: 'Idea Explorer',
        icon: '🏆',
      },
      {
        id: 'badge-03',
        name: 'Community Contributor',
        icon: '🏆',
      },
      {
        id: 'badge-04',
        name: 'Consistent Builder',
        icon: '🏆',
      },
      {
        id: 'badge-05',
        name: 'Prototype Creator',
        icon: '🏆',
      },
      {
        id: 'badge-06',
        name: 'Feedback Champion',
        icon: '🏆',
      },
    ],

    // =====================================================
    // COMMUNITY POSTS — JULY TO OCTOBER 2026
    // =====================================================

    posts: [

      {
        id: 'post-01',
        date: '13 Oct 2026',

        content:
          'Completed another iteration of our product dashboard. ' +
          'This week I focused on simplifying navigation, improving ' +
          'mobile responsiveness and making the user experience clearer. ' +
          'Small design decisions make a big difference.',

        likes: 47,
        liked: true,

        comments: [
          {
            id: 'c01',
            author: 'Meera Krishnan',
            text: 'The updated dashboard looks much cleaner!',
          },
          {
            id: 'c02',
            author: 'Aarav Menon',
            text: 'Great progress. Keep building!',
          },
          {
            id: 'c03',
            author: 'Priya Sharma',
            text: 'Would love to see a walkthrough.',
          },
        ],
      },

      {
        id: 'post-02',
        date: '8 Oct 2026',

        content:
          'Spent the week improving our backend architecture. ' +
          'Working with Python, FastAPI, PostgreSQL and SQLAlchemy ' +
          'has helped me better understand how to organize ' +
          'controllers, services and repositories.',

        likes: 36,
        liked: false,

        comments: [
          {
            id: 'c04',
            author: 'Karthik S',
            text: 'A clean layered architecture makes maintenance easier.',
          },
          {
            id: 'c05',
            author: 'Rahul Dev',
            text: 'Nice stack for building scalable products.',
          },
        ],
      },

      {
        id: 'post-03',
        date: '30 Sep 2026',

        content:
          'One lesson from building a startup: before adding more ' +
          'features, make sure the existing workflow solves a ' +
          'real user problem. We are reviewing our feature priorities ' +
          'and preparing for another round of feedback.',

        likes: 52,
        liked: true,

        comments: [
          {
            id: 'c06',
            author: 'Aditi Rao',
            text: 'Absolutely. Customer feedback should guide priorities.',
          },
          {
            id: 'c07',
            author: 'Ananya R',
            text: 'The simplest solution is often the most useful.',
          },
        ],
      },

      {
        id: 'post-04',
        date: '18 Sep 2026',

        content:
          'Reached an important milestone today. Our initial ' +
          'product screens and user flows are ready for internal ' +
          'review. Next step: collect feedback and refine the ' +
          'experience before moving ahead.',

        likes: 64,
        liked: false,

        comments: [
          {
            id: 'c08',
            author: 'Naveen Kumar',
            text: 'Congratulations on the milestone!',
          },
          {
            id: 'c09',
            author: 'Sneha Iyer',
            text: 'Looking forward to the next update.',
          },
          {
            id: 'c10',
            author: 'Meera Krishnan',
            text: 'User flow reviews are always worth the effort.',
          },
        ],
      },

      {
        id: 'post-05',
        date: '5 Sep 2026',

        content:
          'Had a productive discussion with other founders about ' +
          'building technology products. We spoke about early ' +
          'validation, MVP planning, product architecture and ' +
          'the challenges of finding the right target audience.',

        likes: 29,
        liked: false,

        comments: [
          {
            id: 'c11',
            author: 'Aarav Menon',
            text: 'Great discussion. Thanks for sharing your perspective.',
          },
        ],
      },

      {
        id: 'post-06',
        date: '24 Aug 2026',

        content:
          'Our team has started preparing a functional product ' +
          'prototype. We are concentrating on the most important ' +
          'customer journeys first and keeping the initial ' +
          'scope manageable.',

        likes: 41,
        liked: true,

        comments: [
          {
            id: 'c12',
            author: 'Priya Sharma',
            text: 'Good approach. Start simple and improve.',
          },
          {
            id: 'c13',
            author: 'Karthik S',
            text: 'Would be interesting to hear about your architecture.',
          },
        ],
      },

      {
        id: 'post-07',
        date: '12 Aug 2026',

        content:
          'Completed our first round of customer discovery ' +
          'conversations. The feedback gave us a clearer idea ' +
          'of what users expect, where current tools fall short ' +
          'and which problems are worth prioritizing.',

        likes: 58,
        liked: false,

        comments: [
          {
            id: 'c14',
            author: 'Aditi Rao',
            text: 'Talking to users early saves so much time.',
          },
          {
            id: 'c15',
            author: 'Harini Raj',
            text: 'Great to see the idea evolving through research.',
          },
        ],
      },

      {
        id: 'post-08',
        date: '31 Jul 2026',

        content:
          'Finished documenting the initial startup idea, ' +
          'target audience, problem statement and proposed ' +
          'solution. We are now exploring different approaches ' +
          'to validate our assumptions.',

        likes: 23,
        liked: false,

        comments: [
          {
            id: 'c16',
            author: 'Meera Krishnan',
            text: 'Solid first step!',
          },
        ],
      },

      {
        id: 'post-09',
        date: '21 Jul 2026',

        content:
          'Started connecting with other builders in the ' +
          'AI and Machine Learning community. I am excited ' +
          'to learn from their experiences, exchange ideas ' +
          'and contribute wherever possible.',

        likes: 19,
        liked: true,

        comments: [
          {
            id: 'c17',
            author: 'Vikram N',
            text: 'Welcome to the community!',
          },
          {
            id: 'c18',
            author: 'Aarav Menon',
            text: 'Happy to connect.',
          },
        ],
      },

      {
        id: 'post-10',
        date: '14 Jul 2026',

        content:
          'Hello LabX! I am Deshikh, an aspiring technology ' +
          'founder interested in AI, web development and ' +
          'building useful digital products. Starting my ' +
          'founder journey here and looking forward to ' +
          'learning, collaborating and sharing progress.',

        likes: 35,
        liked: false,

        comments: [
          {
            id: 'c19',
            author: 'Meera Krishnan',
            text: 'Welcome to LabX!',
          },
          {
            id: 'c20',
            author: 'Karthik S',
            text: 'All the best on your founder journey!',
          },
          {
            id: 'c21',
            author: 'Priya Sharma',
            text: 'Excited to follow your progress.',
          },
        ],
      },

    ],
  },

};

// Founder Passport application preview steps.
export const passportSteps = [
  'Application',
  'Admin validation',
  'Interview',
  'Feedback',
  'Issuance',
];
