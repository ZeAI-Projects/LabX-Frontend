
import {
  User as UserRound, Compass as BriefcaseBusiness, Compass, Layers3, Award, Users, Trophy,
  ArrowRight, Globe2, ExternalLink, ShieldCheck, Fingerprint,
} from 'lucide-react';

function Chips({ values, faded = false }) {
  return Array.isArray(values) && values.length ? (
    <div className="lp-chips">
      {values.map((value) => (
        <span className={`lp-chip ${faded ? 'lp-chip--faded' : ''}`} key={value}>{value}</span>
      ))}
    </div>
  ) : <p className="lp-empty-text">Nothing shared yet</p>;
}

function CardTitle({ eyebrow, icon: Icon, children }) {
  return (
    <div className="lp-card__heading">
      <span className="lp-kicker">{eyebrow}</span>
      <h4><Icon size={19} />{children}</h4>
    </div>
  );
}

function memberSinceLabel(date) {
  if (!date) return 'Not set';
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? 'Not set'
    : parsed.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export default function ProfileCards({ profile, isSelf, onPassport }) {
  if (!profile) return null;
  const safeProfile = { skills: [], interests: [], goals: [], links: [], badges: [], posts: [], startup: {}, ...profile };
  profile = safeProfile;
  const memberSince = memberSinceLabel(profile.memberSince);

  return (
    <>
      <div className="lp-section-title">
        <div><span className="lp-kicker">AT A GLANCE</span><h3>LabX presence</h3></div>
        <span />
      </div>
      <div className="lp-grid lp-grid--organized">
        <div className="lp-stack">
          <section className="lp-card lp-reveal lp-reveal--delay-1">
            <CardTitle eyebrow="01 / IDENTITY" icon={UserRound}>About &amp; expertise</CardTitle>
            <div className="lp-detail"><strong>Professional overview</strong><p>{profile.bio || 'No introduction added yet.'}</p></div>
            <div className="lp-detail"><strong>Skills &amp; expertise</strong><Chips values={profile.skills} /></div>
            <div className="lp-detail"><strong>Interests &amp; domains</strong><Chips faded values={[...profile.interests, profile.domain].filter((value, index, all) => all.indexOf(value) === index)} /></div>
            <div className="lp-detail">
              <strong>Goals</strong>
              {profile.goals.length ? <ul>{profile.goals.map((goal) => <li key={goal}>{goal}</li>)}</ul> : <p className="lp-empty-text">No goals shared yet</p>}
            </div>
            <div className="lp-detail">
              <strong>Portfolio &amp; links</strong>
              {profile.links.length ? (
                <div className="lp-links">
                  {profile.links.map(({ id, label, url }) => (
                    <a key={id} href={url} rel="noreferrer noopener" target="_blank">
                      <Globe2 size={15} />{label}<ExternalLink size={13} />
                    </a>
                  ))}
                </div>
              ) : <p className="lp-empty-text">No portfolio links shared yet</p>}
            </div>
          </section>


        </div>

        <div className="lp-stack">
          {isSelf && (
            <button className="lp-passport lp-reveal lp-reveal--delay-1" onClick={onPassport} type="button">
              <span className="lp-passport__icon"><Fingerprint size={23} /></span>
              <span>Founder Passport</span><small>Apply</small><ArrowRight size={19} />
            </button>
          )}
          {!isSelf && profile.passportVerified && (
            <div className="lp-passport-verified"><ShieldCheck size={18} /> Founder Passport verified</div>
          )}

          <section className="lp-card lp-reveal lp-reveal--delay-2">
            <CardTitle eyebrow="02 / STARTUP JOURNEY" icon={BriefcaseBusiness}>Venture snapshot</CardTitle>
            <h5 className="lp-venture-name">{profile.startup?.name}</h5>
            <p className="lp-venture-desc">{profile.startup?.description}</p>
            <div className="lp-attributes">
              <div><span><Compass size={16} /> Domain</span><strong>{profile.domain}</strong></div>
              <div><span><Layers3 size={16} /> Current stage</span><strong>{profile.startup?.stage}</strong></div>
              <div><span><Award size={16} /> Current level</span><strong>{profile.startup?.level}</strong></div>
              <div><span><Users size={16} /> Domain guild</span><strong>{profile.startup?.guild}</strong></div>
            </div>
          </section>

          <section className="lp-card lp-reveal lp-reveal--delay-2">
            <CardTitle eyebrow="03 / ACHIEVEMENTS" icon={Trophy}>Earned badges</CardTitle>
            {profile.badges.length ? (
              <div className="lp-badges">
                {profile.badges.map((badge) => (
                  <div key={badge.id}><span>{badge.icon || '🏆'}</span>{badge.name}</div>
                ))}
              </div>
            ) : <p className="lp-empty-text">No badges earned yet</p>}
          </section>


        </div>
      </div>
          {/* A data-driven snapshot replaces the old generic introduction card. */}
          <section className="lp-card lp-about-hint lp-profile-snapshot lp-profile-snapshot--compact lp-reveal lp-reveal--delay-2">
            <span className="lp-kicker">PROFILE SNAPSHOT</span>
            <strong className="lp-profile-snapshot__title">{isSelf ? 'Your LabX journey so far' : `${(profile.name || 'Member').split(' ')[0]}'s LabX journey`}</strong>
            <div className="lp-profile-snapshot__stats">
              <div><small>MEMBER SINCE</small><strong>{memberSince}</strong></div>
              <div><small>COMMUNITY POSTS</small><strong>{profile.posts.length}</strong></div>
              <div><small>BADGES EARNED</small><strong>{profile.badges.length}</strong></div>
            </div>
            <p>{profile.startup?.name} · {profile.startup?.stage} stage</p>
          </section>
    </>
  );
}
