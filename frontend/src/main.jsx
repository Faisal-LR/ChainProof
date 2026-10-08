import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './auth';
import { api } from './api';
import { AppLayout, Brand } from './components/layout';
import { ToastProvider, Spinner } from './components/ui';
import { AdminPage, AuthPage, DashboardPage, DetailPage, LandingPage, LogoSearchPage, ProfilePage, RegisterPage, RegistryPage, StatusPage, VerifyPage, VersionHistoryPage } from './pages';
import './styles.css';
import './public.css';

function ProtectedLayout({ status }) { const { ready, user } = useAuth(); if (!ready) return <div className="boot"><Spinner label="Opening ChainProof…" /></div>; return user ? <AppLayout status={status} /> : <Navigate to="/login" replace />; }
function PublicWorkspace({ status, statusError }) { const { user } = useAuth(); return <div className="public-workspace"><header className="public-topbar"><Brand /><nav><Link to="/registry">Registry</Link><Link to="/verify">Verify</Link><Link to="/logo-search">Logo search</Link></nav>{user ? <Link className="button primary small" to="/dashboard">Dashboard</Link> : <div><Link className="button ghost small" to="/login">Sign in</Link><Link className="button primary small" to="/register-account">Create account</Link></div>}</header><main className="public-page"><Outlet context={{ status, statusError }} /></main></div>; }
function App() { const [status, setStatus] = useState(null); const [statusError, setStatusError] = useState(''); useEffect(() => { api.status().then(setStatus).catch(() => setStatusError('API Offline — start the backend or set VITE_API_URL.')); }, []); return <Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/register-account" element={<AuthPage mode="register" />} /><Route element={<PublicWorkspace status={status} statusError={statusError} />}><Route path="/verify" element={<VerifyPage />} /><Route path="/logo-search" element={<LogoSearchPage />} /><Route path="/registry" element={<RegistryPage />} /><Route path="/registry/:ipId" element={<DetailPage />} /><Route path="/registry/:ipId/versions" element={<VersionHistoryPage />} /><Route path="/status" element={<StatusPage status={status} error={statusError} />} /></Route><Route element={<ProtectedLayout status={status} />}><Route path="/dashboard" element={<DashboardPage />} /><Route path="/register" element={<RegisterPage />} /><Route path="/profile" element={<ProfilePage />} /><Route path="/admin" element={<AdminPage />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes>; }

createRootApp();
function createRootApp() { const root = document.getElementById('root'); import('react-dom/client').then(({ createRoot }) => createRoot(root).render(<BrowserRouter><AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider></BrowserRouter>)); }
