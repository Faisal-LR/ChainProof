import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, BookOpenCheck, Boxes, CircleUserRound, FileSearch, Fingerprint, LayoutDashboard, LogOut, Menu, Search, ShieldCheck, SlidersHorizontal, UploadCloud, UsersRound, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth';

const links = [
  ['/dashboard', 'Dashboard', LayoutDashboard], ['/register', 'Register IP', UploadCloud], ['/verify', 'Verify Work', FileSearch], ['/logo-search', 'Logo Search', Search], ['/registry', 'Public Registry', BookOpenCheck]
];

export function Brand({ compact = false }) { return <Link to="/" className="brand"><span className="brand-mark"><ShieldCheck size={compact ? 19 : 23} /></span>{!compact && <span>Chain<span>Proof</span></span>}</Link>; }
function NavLinks({ close }) { const { user } = useAuth(); return <nav>{links.map(([path, label, Icon]) => <NavLink to={path} key={path} onClick={close}><Icon size={18} /><span>{label}</span></NavLink>)}<div className="nav-label">Account</div><NavLink to="/profile" onClick={close}><CircleUserRound size={18} /><span>Profile</span></NavLink>{user?.role === 'ADMIN' && <NavLink to="/admin" onClick={close}><UsersRound size={18} /><span>Admin</span></NavLink>}<NavLink to="/status" onClick={close}><Activity size={18} /><span>System Status</span></NavLink></nav>; }
export function AppLayout({ status }) {
  const [open, setOpen] = useState(false); const { user, logout } = useAuth(); const navigate = useNavigate();
  const doLogout = () => { logout(); navigate('/'); };
  return <div className="app-shell"><aside className={open ? 'sidebar open' : 'sidebar'}><div className="sidebar-top"><Brand /><button className="mobile-close icon-button" onClick={() => setOpen(false)}><X /></button></div><NavLinks close={() => setOpen(false)} /><div className="sidebar-bottom"><div className="mini-user"><span>{user?.name?.slice(0, 1)}</span><div><b>{user?.name}</b><small>{user?.role === 'ADMIN' ? 'Administrator' : 'Creator account'}</small></div></div><button className="logout" onClick={doLogout}><LogOut size={17} /> Sign out</button></div></aside>{open && <div className="overlay" onClick={() => setOpen(false)} />}
    <main className="app-main"><header className="topbar"><button className="mobile-menu icon-button" onClick={() => setOpen(true)}><Menu /></button><div className="crumb"><Boxes size={18} /><span>Evidence workspace</span></div><div className={`connection ${status?.mode === 'demo' ? 'demo' : status?.api === 'online' ? 'online' : 'offline'}`}><i />{status?.mode === 'demo' ? 'DEMO MODE' : status?.api === 'online' ? 'API ONLINE' : 'API OFFLINE'}</div></header><div className="page"><Outlet /></div></main></div>;
}
