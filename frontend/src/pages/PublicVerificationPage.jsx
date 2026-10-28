import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, ExternalLink, FileKey2, Search, ShieldAlert } from 'lucide-react';
import { api } from '../api';
import { Badge, CopyValue, ErrorMessage, Spinner } from '../components/ui';
import { publicVerificationUrl } from '../public-url.js';
import './public-verification.css';

const pretty = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const date = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const fileSize = (value) => Number.isFinite(Number(value)) ? `${(Number(value) / 1024).toFixed(1)} KB` : '—';
const hashFile = async (file) => {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export function PublicVerificationPage() {
  const { ipId } = useParams();
  const [record, setRecord] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    api.publicRegistration(ipId)
      .then(({ registration }) => active && setRecord(registration))
      .catch((caught) => active && setLoadError(caught.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [ipId]);

  const verify = async (event) => {
    event.preventDefault();
    if (!file) { setError('Choose the original file to compare.'); return; }
    if (file.size > 15 * 1024 * 1024) { setError('Choose a file no larger than 15 MB.'); return; }
    setError('');
    setResult(null);
    setVerifying(true);
    try {
      const sha256 = await hashFile(file);
      const response = await api.verifyPublicHash(ipId, sha256);
      setResult({ ...response, sha256 });
    } catch (caught) {
      setError(caught.message || 'The selected file could not be verified.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return <Spinner label="Loading public registration…" />;
  if (loadError || !record) return <section className="public-verify-empty"><ShieldAlert size={30} /><h1>Registration unavailable</h1><p>{loadError || 'This registration could not be found.'}</p><Link className="button ghost" to="/registry">Browse public registry</Link></section>;

  const resultLabel = result?.exactMatch ? 'MATCH' : 'NO MATCH';
  return <section className="public-verification">
    <div className="public-verify-hero">
      <span className="eyebrow">Public verification</span>
      <div className="public-verify-title"><div><h1>{record.title}</h1><p>Registration {record.ipId} · {record.creatorName} · version {record.version}</p></div><Badge status={record.blockchainStatus}>{pretty(record.blockchainStatus)}</Badge></div>
      <p className="public-verify-note">This page checks an exact SHA-256 file identity. It provides evidence of a matching registered file, not a legal decision about ownership.</p>
    </div>

    <div className="public-verify-grid">
      <section className="public-verify-card public-record-card">
        <h2>Registered evidence</h2>
        <dl>
          <div><dt>IP ID</dt><dd><CopyValue value={record.ipId} label="IP ID" /></dd></div>
          <div><dt>SHA-256</dt><dd><CopyValue value={record.sha256} label="SHA-256" /></dd></div>
          <div><dt>Creator</dt><dd>{record.creatorName}</dd></div>
          <div><dt>Registered</dt><dd>{date(record.createdAt)}</dd></div>
          <div><dt>Category</dt><dd><Badge>{pretty(record.category)}</Badge></dd></div>
          <div><dt>License</dt><dd>{record.license}</dd></div>
          <div><dt>File type</dt><dd>{record.mimeType}</dd></div>
          <div><dt>File size</dt><dd>{fileSize(record.fileSize)}</dd></div>
          <div><dt>Blockchain</dt><dd><Badge status={record.blockchainStatus}>{pretty(record.blockchainStatus)}</Badge></dd></div>
          {record.blockchainTxHash && <div className="wide"><dt>Transaction</dt><dd><CopyValue value={record.blockchainTxHash} label="Transaction hash" />{record.transactionUrl && <a className="public-explorer-link" href={record.transactionUrl} target="_blank" rel="noreferrer">View on explorer <ExternalLink size={14} /></a>}</dd></div>}
          {record.previousIpId && <div><dt>Previous version</dt><dd><Link to={`/verify/${record.previousIpId}`}>{record.previousIpId}</Link></dd></div>}
        </dl>
      </section>

      <section className="public-verify-card public-hash-card">
        <FileKey2 className="public-verify-icon" />
        <h2>Verify the exact original file</h2>
        <p>Your browser calculates the SHA-256 hash locally. Only the resulting 64-character hash is sent to ChainProof; the selected file is never uploaded or stored.</p>
        <form onSubmit={verify}>
          <label className="public-file-picker">Choose file<input type="file" onChange={(event) => { setFile(event.target.files?.[0] || null); setResult(null); setError(''); }} />{file ? <strong>{file.name}<small>{fileSize(file.size)} selected</small></strong> : <span>Select the original file</span>}</label>
          <ErrorMessage>{error}</ErrorMessage>
          <button className="button primary" disabled={verifying} type="submit">{verifying ? 'Hashing and comparing…' : 'Verify exact SHA-256'} <Search size={16} /></button>
        </form>
        {result && <div className={`public-result ${result.exactMatch ? 'match' : 'no-match'}`} aria-live="polite">
          {result.exactMatch ? <CheckCircle2 /> : <ShieldAlert />}
          <div><strong>{resultLabel}</strong><p>{result.explanation}</p></div>
          <div className="public-calculated-hash"><span>Calculated SHA-256</span><CopyValue value={result.sha256} label="Calculated SHA-256" /></div>
        </div>}
      </section>
    </div>
    <div className="public-share-link"><span>Public verification URL</span><CopyValue value={publicVerificationUrl(record.ipId)} label="Public verification URL" /></div>
  </section>;
}
