import { mockFollowers, mockFollowing } from './mock_social.js'

const publicDirectory = new Map([...mockFollowers, ...mockFollowing].map((person) => [person.id, person]))

export function readMockPublicProfile(userId) {
  const person = publicDirectory.get(userId)
  if (!person) return null

  return {
    id: person.id,
    full_name: person.full_name,
    username: person.username,
    role: 'founder',
    avatar: null,
    city: '',
    state: '',
    country: '',
    availability: 'unspecified',
    skills: [],
    interests: [],
    goals: '',
    professional_background: '',
    education: '',
    website: '',
    portfolio: '',
    linkedin: '',
  }
}
