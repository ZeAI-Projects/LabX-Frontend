import { Code2, GraduationCap, Leaf, Presentation, Radio, Rocket, Users } from 'lucide-react';

export function EventArtwork({ category, announcement }) {
  const kind = announcement ? 'broadcast' : /Hack|Challenge/.test(category) ? 'build' : /Mentor|Community/.test(category) ? 'connect' : /Training|Workshop|Webinar/.test(category) ? 'learn' : /Pitch|Accelerator|Grant/.test(category) ? 'launch' : /Climate|Sustain/.test(category) ? 'climate' : 'showcase';
  const Icon = { broadcast: Radio, build: Code2, connect: Users, learn: GraduationCap, launch: Rocket, climate: Leaf, showcase: Presentation }[kind];
  return <span className={`event-artwork event-artwork--${kind}`} aria-hidden="true"><span className="event-artwork__orbit"/><span className="event-artwork__orbit event-artwork__orbit--outer"/><span className="event-artwork__core"><Icon size={39} strokeWidth={1.3}/></span><span className="event-artwork__spark"/><span className="event-artwork__line"/></span>;
}
