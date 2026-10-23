import { useLocation, useNavigate } from 'react-router-dom';
import { joinRoadmapSearch } from '../services/join_roadmap_navigation.js';

export function JoinRoadmapTrigger({ children, className, projectId, view, method, onOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  return <button type="button" className={className} data-join-roadmap-trigger="" aria-haspopup="dialog" onClick={() => {
    onOpen?.();
    navigate({ pathname: location.pathname, search: joinRoadmapSearch(location.search, { projectId, view, method }), hash: location.hash });
  }}>{children}</button>;
}
