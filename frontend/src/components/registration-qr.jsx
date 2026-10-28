import { useEffect, useState } from 'react';
import { Download, QrCode, X } from 'lucide-react';
import { publicVerificationUrl } from '../public-url.js';
import { generateRegistrationQrPng } from '../registration-qr-code.js';
import { CopyValue } from './ui';
import './registration-qr.css';

export function RegistrationQrButton({ ipId, className = '', label = 'View QR Code' }) {
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const url = publicVerificationUrl(ipId);

  useEffect(() => {
    let active = true;
    if (!open) return undefined;
    setError('');
    setImage('');
    generateRegistrationQrPng(ipId)
      .then((dataUrl) => active && setImage(dataUrl))
      .catch(() => active && setError('The QR code could not be generated.'));
    return () => { active = false; };
  }, [open, url]);

  return <>
    <button className={`button ghost ${className}`} type="button" onClick={() => setOpen(true)}>
      <QrCode size={16} /> {label}
    </button>
    {open && <div className="qr-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section className="qr-dialog" role="dialog" aria-modal="true" aria-labelledby="qr-dialog-title">
        <button className="qr-close" type="button" aria-label="Close QR code" onClick={() => setOpen(false)}><X size={18} /></button>
        <span className="eyebrow">Public verification link</span>
        <h2 id="qr-dialog-title">Scan to verify {ipId}</h2>
        <p>Anyone can open the public record and compare a selected file against this registration’s exact SHA-256 hash.</p>
        <div className="qr-code-frame">{image ? <img src={image} alt={`QR code for ${ipId} public verification`} /> : !error && <span>Generating QR code…</span>}</div>
        {error && <p className="qr-error">{error}</p>}
        <CopyValue value={url} label="Public verification link" />
        {image && <a className="button primary qr-download" href={image} download={`chainproof-${ipId}-verify.png`}><Download size={16} /> Download PNG</a>}
      </section>
    </div>}
  </>;
}
