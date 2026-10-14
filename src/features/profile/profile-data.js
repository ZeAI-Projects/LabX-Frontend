export const profileFields = [
  ['location', 'Location'], ['skills', 'Skills and expertise'],
  ['interests', 'Interests and preferred domains'], ['goals', 'Goals and collaboration interests', 'textarea'],
  ['website', 'Website', 'url'], ['portfolio', 'Portfolio', 'url'], ['social', 'Social link', 'url'],
  ['education', 'Education and professional background', 'textarea'], ['contact', 'Contact email', 'email'],
];
export const startupFields = [
  ['startup_name', 'Startup name'], ['startup_description', 'Startup description', 'textarea'],
  ['problem', 'Problem', 'textarea'], ['solution', 'Solution', 'textarea'],
  ['product', 'Product / service details', 'textarea'], ['team', 'Team members and roles', 'textarea'],
  ['startup_milestones', 'Startup milestones', 'textarea'], ['startup_link', 'Startup link', 'url'],
  ['projects', 'Projects and startup progress', 'textarea'], ['fundraising', 'Fundraising status (optional)'],
];
export const passportSections = ['Progression', 'Milestones and quests', 'Achievements', 'Community contributions'];
export const visibilityFields = [['bio', 'Bio'], ...profileFields, ...startupFields, ...passportSections.map(x => [x, x])];
export const seed = {
  profile: {
    id: 'me', full_name: 'Alex Morgan', username: 'alex_morgan', role: 'Founder',
    bio: 'Building tools that help creators turn ideas into thriving businesses.', avatar_url: '',
    location: 'Bengaluru, India', skills: 'Product design, React, user research',
    interests: 'Media, Entertainment & Creator Technology', goals: 'Connect with creators and product collaborators.',
    website: '', portfolio: '', social: '', education: '', contact: '',
    startup_name: 'CreatorSpace', startup_description: 'A workspace for independent creators.',
    problem: 'Creators manage their work across disconnected tools.', solution: 'Bring planning and collaboration into one workspace.',
    product: 'A collaborative planning prototype.', team: 'Alex Morgan — Founder',
    startup_milestones: 'Problem interviews completed; first prototype built.', startup_link: '',
    projects: 'CreatorSpace prototype — testing with early users.', fundraising: '',
    domains: {name: 'Media, Entertainment & Creator Technology'},
    progress: {stages: {name: 'Build'}, levels: {name: 'Level 4'}},
    guilds: {name: 'Creator Technology Guild'}, total_points: 1250,
    badges: [{id: 'first', name: 'First Milestone', icon: '🏆', description: 'Completed a first roadmap milestone.'}],
    history: [{id: 'h1', title: 'Problem discovery', type: 'Milestone', status: 'Completed'}, {id: 'h2', title: 'Prototype feedback', type: 'Quest', status: 'In progress'}],
    verifiedFacts: [],
  },
  people: [
    {id: 'maya', full_name: 'Maya Rao', username: 'maya_builds', is_following: true, follows_you: true},
    {id: 'jordan', full_name: 'Jordan Lee', username: 'jordan_creates', is_following: false, follows_you: true},
  ],
  posts: [{id: 'p1', content: 'Our first creator workspace prototype is ready for feedback. Excited to keep learning from the community!', likes_count: 3, is_liked: false, comments: []}],
  visibility: Object.fromEntries(visibilityFields.map(([key]) => [key, !['contact', 'team', 'fundraising'].includes(key)])),
  sections: Object.fromEntries(passportSections.map(key => [key, true])),
  application: null,
};

export const storageKey = 'labx-profile-v1';
export function readProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (!stored || stored.version !== 1 || !stored.data?.profile || !Array.isArray(stored.data.people) || !Array.isArray(stored.data.posts)) return structuredClone(seed);
    return {...structuredClone(seed), ...stored.data, profile: {...seed.profile, ...stored.data.profile}, visibility: {...seed.visibility, ...stored.data.visibility}, sections: {...seed.sections, ...stored.data.sections}};
  } catch { return structuredClone(seed); }
}
