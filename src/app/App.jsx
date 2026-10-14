import {useState} from 'react';
import {BrowserRouter, useLocation, useNavigate} from 'react-router-dom';
import {Sidebar} from '../components/common/Sidebar';
import {Navbar} from '../components/common/Navbar';
import {ProfileContext} from '../features/profile/profile-context';
import {Modal} from '../features/profile/Modal';
import ProfilePage from '../modules/profile/pages/ProfilePage';
import {mockProfiles} from '../modules/profile/data/mockProfile';
import '../modules/profile/integration.css';

function ProfileApp() {
  const [owner, setOwner] = useState(() => structuredClone(mockProfiles.self));
  const {pathname} = useLocation();
  const navigate = useNavigate();
  const user = {id:owner.id, full_name:owner.name, username:owner.handle, avatar_url:owner.avatar, total_points:owner.coins};
  const shell = {user, isFounder:true, isAdmin:false, logout:() => {}};
  const outsideProfile = !['/', '/profile'].includes(pathname);
  return <ProfileContext.Provider value={shell}>
    <div className="app-layout"><Sidebar/><main className="main-content">
      <Navbar title="Founder Dossier"/>
      <ProfilePage onProfileChange={setOwner}/>
      {outsideProfile && <Modal title="Profile preview" onClose={() => navigate('/profile')}><p>Only the profile section is included in this frontend preview.</p><button className="btn btn-primary profile-spaced" onClick={() => navigate('/profile')}>Return to Profile</button></Modal>}
    </main></div>
  </ProfileContext.Provider>;
}
export default function App() {
  return <BrowserRouter><ProfileApp/></BrowserRouter>;
}
