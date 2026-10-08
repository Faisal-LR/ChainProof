import { createContext, useContext, useState } from 'react';
import { Check, Copy, FileQuestion, LoaderCircle, X } from 'lucide-react';

const ToastContext = createContext(() => {});
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = (message, type = 'success') => { const id = crypto.randomUUID(); setToasts((items) => [...items, { id, message, type }]); setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4200); };
  return <ToastContext.Provider value={push}>{children}<div className="toasts">{toasts.map((toast) => <div className={`toast ${toast.type}`} key={toast.id}><span>{toast.message}</span><button onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}><X size={16} /></button></div>)}</div></ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
export function Badge({ status, children }) { const value = String(status || children || '').toLowerCase(); return <span className={`badge ${value.replace(/\s+/g, '-')}`}>{children || status}</span>; }
export function Spinner({ label = 'Loading…' }) { return <div className="spinner"><LoaderCircle size={20} className="spin" /> {label}</div>; }
export function Empty({ title = 'Nothing here yet', children }) { return <div className="empty"><FileQuestion size={30} /><h3>{title}</h3><p>{children}</p></div>; }
export function CopyValue({ value, label }) { const toast = useToast(); const [copied, setCopied] = useState(false); const copy = async () => { await navigator.clipboard.writeText(value); setCopied(true); toast(`${label || 'Value'} copied`); setTimeout(() => setCopied(false), 1600); }; return <div className="copy-value"><code title={value}>{value}</code><button className="icon-button" onClick={copy} aria-label={`Copy ${label || 'value'}`}>{copied ? <Check size={15} /> : <Copy size={15} />}</button></div>; }
export function ErrorMessage({ children }) { return children ? <div className="error-message">{children}</div> : null; }
