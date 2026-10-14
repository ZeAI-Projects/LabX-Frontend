import {usePreviewDialog} from '../usePreviewDialog';
import { useEffect, useState } from 'react';
import { Image as ImagePlus, Save, ArrowRight, X, ShieldCheck } from 'lucide-react';
import { passportSteps } from '../data/mockProfile';

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];

export default function FounderPassportModal({ profile, onClose, onDraftSaved }) {
  const [step, setStep] = useState('form');
  const dialogRef = usePreviewDialog(true, onClose);
  const [draft, setDraft] = useState({ fullName: profile.name, email: profile.email, startupName: profile.startup.name, motivation: '' });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Local preview only; no upload or application submission occurs.
  useEffect(() => () => {if (imagePreview) URL.revokeObjectURL(imagePreview);}, [imagePreview]);

  function chooseImage(e) {
    const selected = e.target.files?.[0];
    e.target.value = '';
    if (!selected) return;
    if (!imageTypes.includes(selected.type)) { setError('Select JPG, PNG or WebP.'); return; }
    if (selected.size > 5 * 1024 * 1024) { setError('The image must be 5 MB or smaller.'); return; }
    setImage(selected);
    setImagePreview(URL.createObjectURL(selected));
    setError('');
  }

  return <div className="lp-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)onClose();}}><section ref={dialogRef} className="lp-modal" role="dialog" aria-modal="true" aria-labelledby="passport-title">
    <div className="lp-modal__heading"><div><span className="lp-kicker">FOUNDER PASSPORT / APPLICATION</span><h3 id="passport-title">{step === 'form' ? 'Apply for verification' : 'Review your application'}</h3></div><button type="button" className="lp-icon-button" onClick={onClose} aria-label="Close Founder Passport"><X size={20}/></button></div>
    <div className="lp-modal__content">
      <div className="lp-steps">{passportSteps.map((label, i)=><div className={i===0 ? 'is-current' : ''} key={label}><span>{i+1}</span><small>{label}</small></div>)}</div>
      {step==='form' ? <form id="passport-form" className="lp-passport-fields" onSubmit={(e)=>{e.preventDefault();setStep('review');setError('');}}>
        <p className="lp-form-lede">Tell us about yourself and your startup.</p>
        <label className="lp-field"><span className="lp-label">Full name</span><input required maxLength={120} value={draft.fullName} onChange={(e)=>setDraft((v)=>({...v,fullName:e.target.value}))}/></label>
        <label className="lp-field"><span className="lp-label">Contact email</span><input required type="email" value={draft.email} onChange={(e)=>setDraft((v)=>({...v,email:e.target.value}))}/></label>
        <label className="lp-field lp-field--wide"><span className="lp-label">Startup / project name (optional)</span><input value={draft.startupName} onChange={(e)=>setDraft((v)=>({...v,startupName:e.target.value}))}/></label>
        <label className="lp-field lp-field--wide"><span className="lp-label">Why are you applying?</span><textarea rows={4} required maxLength={1000} placeholder="Tell us about your work..." value={draft.motivation} onChange={(e)=>setDraft((v)=>({...v,motivation:e.target.value}))}/></label>
        <div className="lp-field lp-field--wide"><span className="lp-label">Supporting portfolio image (optional)</span><label className="lp-image-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage}/>{imagePreview ? <><img src={imagePreview} alt="Portfolio preview"/><strong>{image.name}</strong><small>Click to choose another image</small></> : <><ImagePlus size={27}/><strong>Choose an image</strong><small>JPG, PNG, WebP · Max 5 MB</small></>}</label>{image && <button type="button" className="lp-text-button" onClick={()=>{setImage(null);setImagePreview('');}}>Remove selection</button>}</div>
      </form> : <div className="lp-passport-review"><p>Check your details before closing the preview.</p><dl>{[['Name',draft.fullName],['Email',draft.email],['Startup',draft.startupName || 'Not provided'],['Reason',draft.motivation],['Portfolio image',image?.name || 'Not provided']].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><div className="lp-local-banner"><ShieldCheck size={18}/> This is a visual prototype. No application is submitted.</div></div>}
      {error && <p className="lp-error" role="alert">{error}</p>}
      {saved && <p className="lp-success" role="status">Draft kept in this preview until you close it.</p>}
    </div>
    <div className="lp-modal__footer"><button type="button" className="lp-button lp-button--ghost" onClick={()=>step==='form'?onClose():setStep('form')}>{step==='form'?'Close':'Back to edit'}</button><button type="button" className="lp-button lp-button--ghost" onClick={()=>{setSaved(true);onDraftSaved?.();}}><Save size={16}/> Save mock draft</button>{step==='form' && <button type="submit" form="passport-form" className="lp-button lp-button--primary">Review details <ArrowRight size={16}/></button>}</div>
  </section></div>;
}
