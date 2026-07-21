import React, { useState } from 'react';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

// Reusable lead-capture form. Writes to Firestore `proposalRequests/{id}`,
// which triggers the onProposalRequest Cloud Function (emails alex@ via Zoho).
// Used by the corporate retreats page (/entreprises) and the packages page
// (/forfaits). The `subject` prop is prepended to the message so Alex sees
// which offer the lead came from.

interface Props {
  language: 'EN' | 'FR';
  subject: string;            // e.g. 'Retraite au Manoir' or 'Forfait Nuit & Table'
  showCompany?: boolean;      // B2B pages show a company field
}

export const ProposalRequestForm: React.FC<Props> = ({ language, subject, showCompany = true }) => {
  const fr = language === 'FR';
  const t = (en: string, frText: string) => (fr ? frText : en);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || submitting) return;
    if (!name.trim() || !email.trim()) {
      setError(t('Please fill in your name and email.', 'Veuillez indiquer votre nom et votre courriel.'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const composed = `[${subject}] ${message.trim()}`.trim();
      await addDoc(collection(db, 'proposalRequests'), {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: company.trim() || null,
        message: composed,
        subject,
        language,
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'rs-field w-full rounded-[14px] text-[#f6ead0] font-cormorant text-lg px-4 py-3 outline-none ' +
    'placeholder:text-white/25';

  if (success) {
    return (
      <div className="rounded-[16px] px-8 py-10" style={{ background: 'rgba(217,180,92,0.06)', border: '1px solid rgba(217,180,92,0.24)' }}>
        <p className="font-prata text-2xl mb-3" style={{ color: '#f6ead0' }}>{t('Message received.', 'Message reçu.')}</p>
        <p className="font-cormorant" style={{ color: 'rgba(255,250,240,0.72)', fontSize: '1.15rem', lineHeight: 1.55, fontWeight: 500 }}>
          {t(
            'Thank you. Alex will get back to you personally, usually within a day.',
            "Merci. Alex vous revient personnellement, en général dans la journée.",
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5" noValidate>
      <div>
        <label className="font-cinzel uppercase text-white/40 block mb-2" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>
          {t('Your name', 'Votre nom')}
        </label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </div>
      <div>
        <label className="font-cinzel uppercase text-white/40 block mb-2" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>
          {t('Email', 'Courriel')}
        </label>
        <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      {showCompany && (
        <div>
          <label className="font-cinzel uppercase text-white/40 block mb-2" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>
            {t('Company (optional)', 'Entreprise (facultatif)')}
          </label>
          <input className={inputClass} value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
        </div>
      )}
      <div>
        <label className="font-cinzel uppercase text-white/40 block mb-2" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>
          {t('A few words (dates, group size, wishes)', 'Quelques mots (dates, taille du groupe, envies)')}
        </label>
        <textarea className={inputClass + ' resize-none'} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>

      {error && <p className="font-cormorant text-red-300/80 text-base">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rs-cta inline-block px-10 py-4 rounded-full font-cinzel text-[12px] uppercase tracking-[0.28em] disabled:opacity-50 mt-3"
      >
        {submitting ? t('Sending…', 'Envoi…') : t('Send my request', 'Envoyer ma demande')}
      </button>
    </form>
  );
};
