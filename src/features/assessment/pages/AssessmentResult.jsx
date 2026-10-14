import { Link, useNavigate } from 'react-router-dom';
import { Award, Compass, Shield, Users, ArrowRight } from 'lucide-react';
import '../components/AssessmentResult.css';

export const AssessmentResult = ({ result, project }) => {
  const navigate = useNavigate();

  return (
    <section className="assessment-result" aria-labelledby="assessment-result-title">
      <div className="glass-card assessment-result__card">
        <p className="assessment-result__project-name">{project.name}</p>
        <div className="assessment-result__award" aria-hidden="true">
          <Award />
        </div>

        <h1 id="assessment-result-title" className="assessment-result__title">
          Your LABX Starting Point
        </h1>
        <p className="assessment-result__subtitle">
          Your assessment is complete. Your project’s starting point is ready.
        </p>

        <div className="assessment-result__grid">
          <ResultTile
            icon={<Compass color="#3eb3d0" />}
            title="Domain"
            value={result?.domain || 'Not assigned'}
          />
          <ResultTile
            icon={<Shield color="var(--accent-purple)" />}
            title="Stage"
            value={result?.stage || 'Not assigned'}
          />
          <ResultTile
            icon={<Award color="var(--accent-amber)" />}
            title="Starting Level"
            value={result?.level ? `Level ${result.level}` : 'Not assigned'}
          />
          <ResultTile
            icon={<Users color="#43b58b" />}
            title="Assigned Guild"
            value={result?.guild || 'Not assigned'}
          />
        </div>

        <button
          type="button"
          className="btn btn-primary assessment-result__continue"
          onClick={() => navigate(`/roadmap/${project.id}`)}
        >
          Enter My Roadmap <ArrowRight aria-hidden="true" />
        </button>
        <Link className="assessment-result__back" to="/roadmap">All projects</Link>
      </div>
      {result?.isMock && (
        <p className="assessment-result__demo-note">Demo placement &middot; Stage and level are illustrative.</p>
      )}
    </section>
  );
};

const ResultTile = ({ icon, title, value }) => (
  <div className="assessment-result__tile">
    <div className="assessment-result__tile-heading">
      <span className="assessment-result__tile-icon" aria-hidden="true">{icon}</span>
      <span>{title}</span>
    </div>
    <div className="assessment-result__tile-value">{value}</div>
  </div>
);
