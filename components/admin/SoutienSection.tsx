import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

interface SoutienSectionProps {
  language: 'EN' | 'FR';
  onOuvrirMembre: (uid: string) => void;
}

interface FilSoutien {
  id: string;
  nom: string;
  courriel: string;
  dernierMessage: string;
  dernierAuteur: 'membre' | 'equipe';
  dernierMessageLe?: { toMillis?: () => number };
  luParEquipeLe?: { toMillis?: () => number };
  statut: string;
}

interface Probleme {
  id: string;
  nom: string;
  texte: string;
  page: string;
  statut: string;
  cree?: { toMillis?: () => number };
}

export const SoutienSection: React.FC<SoutienSectionProps> = ({ language, onOuvrirMembre }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
  const [onglet, setOnglet] = useState<'aide' | 'problemes'>('aide');
  const [fils, setFils] = useState<FilSoutien[]>([]);
  const [problemes, setProblemes] = useState<Probleme[]>([]);

  useEffect(() => {
    if (!db) return;
    const unsubFils = onSnapshot(
      query(collection(db, 'soutien'), orderBy('dernierMessageLe', 'desc'), limit(100)),
      (snap) => setFils(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      () => {},
    );
    const unsubPb = onSnapshot(
      query(collection(db, 'problemesTechniques'), orderBy('cree', 'desc'), limit(100)),
      (snap) => setProblemes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      () => {},
    );
    return () => { unsubFils(); unsubPb(); };
  }, []);

  const nonLus = fils.filter((f) => f.dernierAuteur === 'membre' && (f.dernierMessageLe?.toMillis?.() ?? 0) > (f.luParEquipeLe?.toMillis?.() ?? 0)).length;

  return (
    <div>
      <div className="flex gap-6 border-b border-white/10 pb-3 mb-4">
        <button onClick={() => setOnglet('aide')} className={`font-cinzel uppercase text-[12px] tracking-widest transition-colors ${onglet === 'aide' ? 'text-[#c5a059] border-b-2 border-[#c5a059] pb-1' : 'text-neutral-400 hover:text-neutral-200'}`}>
          {t('Member help', 'Aide aux membres')} {nonLus > 0 && <span className="ml-1 text-[10px] bg-[#c5a059] text-[#0a0808] rounded-full px-1.5">{nonLus}</span>}
        </button>
        <button onClick={() => setOnglet('problemes')} className={`font-cinzel uppercase text-[12px] tracking-widest transition-colors ${onglet === 'problemes' ? 'text-[#c5a059] border-b-2 border-[#c5a059] pb-1' : 'text-neutral-400 hover:text-neutral-200'}`}>
          {t('Technical reports', 'Signalements techniques')}
        </button>
      </div>

      {onglet === 'aide' && (
        <div className="border border-white/10 bg-[#0a0a0a]">
          {fils.length === 0 ? (
            <div className="px-4 py-8 text-center text-neutral-600 text-xs font-lato">{t('No threads yet.', 'Aucun fil pour l\'instant.')}</div>
          ) : (
            fils.map((f) => {
              const nonLu = f.dernierAuteur === 'membre' && (f.dernierMessageLe?.toMillis?.() ?? 0) > (f.luParEquipeLe?.toMillis?.() ?? 0);
              return (
                <button key={f.id} onClick={() => onOuvrirMembre(f.id)} className="w-full text-left grid grid-cols-[1fr_auto] gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]">
                  <div className="min-w-0">
                    <p className="text-white text-xs font-lato truncate">
                      {f.nom || 'Membre'} {nonLu && <span className="text-[#c5a059] ml-1">●</span>}
                    </p>
                    <p className="text-neutral-500 text-[11px] font-lato truncate">{f.dernierMessage}</p>
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest font-cinzel self-center ${f.statut === 'resolu' ? 'text-neutral-600' : 'text-[#c5a059]'}`}>
                    {f.statut === 'resolu' ? t('Resolved', 'Résolu') : f.dernierAuteur === 'equipe' ? t('Replied', 'Répondu') : t('Open', 'Ouvert')}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}

      {onglet === 'problemes' && (
        <div className="border border-white/10 bg-[#0a0a0a]">
          {problemes.length === 0 ? (
            <div className="px-4 py-8 text-center text-neutral-600 text-xs font-lato">{t('No reports yet.', 'Aucun signalement pour l\'instant.')}</div>
          ) : (
            problemes.map((p) => (
              <button key={p.id} onClick={() => onOuvrirMembre(p.id)} className="w-full text-left px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]">
                <p className="text-white text-xs font-lato truncate">{p.nom || 'Membre'} · <span className="text-neutral-500">{p.page}</span></p>
                <p className="text-neutral-500 text-[11px] font-lato truncate">{p.texte}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
