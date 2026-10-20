// Illustrative listings for the local preview, not live offers or applications.
const allRoles = {
  roles: ['founder', 'mentor', 'investor'],
  eligibility: 'Founder, mentor and investor accounts',
}

export const OPPORTUNITY_PREVIEWS = [
  {
    id: 'fundraising-webinar', category: 'Webinar', title: 'Inside an Early-Stage Investment',
    description: 'Explore how founders and investors prepare for a first conversation, with a sample investment memo and time for questions.',
    schedule: '16:00: investment walkthrough. 16:40: founder and investor Q&A.',
    startsAt: '2026-10-27T16:00:00+05:30', endsAt: '2026-10-27T17:00:00+05:30', deadline: '2026-10-26T18:00:00+05:30',
    ...allRoles,
  },
  {
    id: 'product-training', category: 'Training', title: 'From Research to Product Decisions',
    description: 'Practice turning customer observations into a prioritized product plan during this guided, small-group sample training.',
    schedule: '10:00: research synthesis. 11:00: prioritization exercises. 12:30: peer review.',
    startsAt: '2026-10-29T10:00:00+05:30', endsAt: '2026-10-29T13:00:00+05:30', deadline: '2026-10-28T18:00:00+05:30',
    fee: '₹499 · illustrative fee; no payment is collected', feeAmount: 499,
    registrationMethod: 'external', registrationUrl: 'https://example.org/?labx-demo=training',
    paymentUrl: 'https://example.org/?labx-demo=payment',
  },
  {
    id: 'incubator-intro', category: 'Incubator', title: 'First Venture Incubator: Open Session',
    description: 'Learn what an incubator provides and prepare your problem statement for a sample cohort application.',
    schedule: '11:00: program overview. 11:30: application preparation.',
    startsAt: '2026-11-03T11:00:00+05:30', endsAt: '2026-11-03T12:00:00+05:30', deadline: '2026-11-02T18:00:00+05:30',
    roles: ['founder'], eligibility: 'Founders exploring a first venture',
  },
  {
    id: 'accelerator-preview', category: 'Accelerator', title: 'Launchpad Accelerator Preview',
    description: 'Explore a sample accelerator for teams with a working prototype. Preview the external application journey and save your own confirmation.',
    schedule: '14:00: cohort overview. 14:30: eligibility and application Q&A.',
    startsAt: '2026-10-30T14:00:00+05:30', endsAt: '2026-10-30T15:00:00+05:30', deadline: '2026-10-29T18:00:00+05:30',
    roles: ['founder'], eligibility: 'Founder accounts; a prototype is recommended',
    registrationMethod: 'external', registrationUrl: 'https://example.org/?labx-demo=accelerator',
  },
  {
    id: 'venture-job', category: 'Job', title: 'Venture Studio: Product Builder Briefing',
    description: 'An illustrative opportunity briefing about product roles at a venture studio. No vacancy or hiring outcome is promised in this preview.',
    schedule: '15:00: role overview. 15:30: portfolio preparation.',
    startsAt: '2026-11-05T15:00:00+05:30', endsAt: '2026-11-05T16:00:00+05:30', deadline: '2026-11-04T18:00:00+05:30',
    ...allRoles,
  },
  {
    id: 'research-internship', category: 'Internship', title: 'Startup Research Internship: Open House',
    description: 'Discover how a sample startup research internship is structured, from customer interviews to market mapping.',
    schedule: '11:00: internship overview. 11:30: sample research exercise.',
    startsAt: '2026-11-06T11:00:00+05:30', endsAt: '2026-11-06T12:00:00+05:30', deadline: '2026-11-05T18:00:00+05:30',
  },
  {
    id: 'funding-forum', category: 'Funding opportunity', title: 'Founder & Investor Funding Forum',
    description: 'Compare sample funding routes and discuss readiness with the community. This session does not make funding commitments.',
    schedule: '16:00: funding routes. 16:45: community discussion.',
    startsAt: '2026-11-07T16:00:00+05:30', endsAt: '2026-11-07T17:30:00+05:30', deadline: '2026-11-06T18:00:00+05:30',
    ...allRoles,
  },
  {
    id: 'pitch-night', category: 'Pitch event', title: 'Five-Minute Founder Pitch Night',
    description: 'Practice a concise venture pitch and collect constructive feedback from mentors and investors.',
    schedule: '17:00: introductions. 17:15: founder pitches. 18:15: feedback.',
    startsAt: '2026-11-09T17:00:00+05:30', endsAt: '2026-11-09T19:00:00+05:30', deadline: '2026-11-08T18:00:00+05:30',
    format: 'Hybrid', location: 'Demo Community Studio, Chennai / online',
    prize: 'Peer feedback and a sample showcase mention', ...allRoles,
  },
  {
    id: 'sponsored-challenge', category: 'Sponsored challenge', title: 'Better Cities Design Challenge',
    description: 'Develop an accessible urban service concept in this illustrative sponsor-supported design challenge.',
    schedule: '09:00: briefing. 10:00: team work. 16:00: presentations.',
    startsAt: '2026-11-10T09:00:00+05:30', endsAt: '2026-11-10T17:00:00+05:30', deadline: '2026-11-09T18:00:00+05:30',
    sponsored: true, sponsor: 'LabX Innovation Partners · Demo',
    prize: 'Illustrative design award; no cash prize in this preview',
  },
  {
    id: 'community-meetup', category: 'Community event', title: 'Builders After Hours',
    description: 'Meet other founders, mentors and investors for a relaxed community conversation about work in progress.',
    schedule: '18:00: introductions. 18:30: small-group conversations.',
    startsAt: '2026-11-11T18:00:00+05:30', endsAt: '2026-11-11T20:00:00+05:30', deadline: '2026-11-10T18:00:00+05:30',
    format: 'In person', location: 'Demo Community Hub, Bengaluru', ...allRoles,
  },
  {
    id: 'guild-build-session', category: 'Guild event', title: 'AI Guild: Build Together',
    description: 'Bring a small prototype question to a sample guild build session and learn with peers.',
    schedule: '14:00: goals. 14:15: collaborative build. 15:30: demos.',
    startsAt: '2026-11-12T14:00:00+05:30', endsAt: '2026-11-12T16:00:00+05:30', deadline: '2026-11-11T18:00:00+05:30',
  },
]
