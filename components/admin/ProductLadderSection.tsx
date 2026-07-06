import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../firebase';
import {
  collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, setDoc, getDocs,
} from 'firebase/firestore';

// Échelle de produits : grille éditable des produits/services par tranche de
// prix, avec statut d'avancement. Persistée dans admin_product_ladder, une
// tranche fixe (pas alphabétique) détermine l'ordre d'affichage. Un compteur
// séparé (admin_metrics/collaborateurs_potentiels) suit le nombre de
// collaborateurs d'affaires potentiels repérés.

const TRANCHES = [
  'Gratuit',
  '1-10 $',
  '10-100 $',
  '100-500 $',
  '500-1000 $',
  '1000-5000 $',
  '5000-10 000 $',
  '10 000 $ et plus',
] as const;
type Tranche = typeof TRANCHES[number];

const STATUTS = ['établi', 'à établir', 'idée'] as const;
type Statut = typeof STATUTS[number];

interface ProductRow {
  id: string;
  nom: string;
  tranche: Tranche;
  statut: Statut;
  notes: string;
}

const SEED: Array<{ nom: string; tranche: Tranche; statut: Statut; notes: string }> = [
  { nom: 'Pensée du jour (blog quotidien)', tranche: 'Gratuit', statut: 'établi', notes: '' },
  { nom: 'Guide local Petite-Nation', tranche: 'Gratuit', statut: 'établi', notes: '' },
  { nom: 'Carte de la région à l’auberge', tranche: 'Gratuit', statut: 'établi', notes: '' },
  { nom: 'Café barista offert à l’achat d’une enveloppe Petite Monnaie', tranche: 'Gratuit', statut: 'établi', notes: '' },
  { nom: 'Café / bar', tranche: '1-10 $', statut: 'établi', notes: '' },
  { nom: 'Petits produits d’accueil', tranche: '1-10 $', statut: 'établi', notes: '' },
  { nom: 'Massothérapie à la séance', tranche: '10-100 $', statut: 'établi', notes: '' },
  { nom: 'Place à une soirée thématique / événement', tranche: '10-100 $', statut: 'établi', notes: '' },
  { nom: 'Nuitées chambres / yourte / bus', tranche: '100-500 $', statut: 'établi', notes: '' },
  { nom: 'Table d’hôte du chef privé', tranche: '100-500 $', statut: 'établi', notes: '' },
  { nom: 'Scotch de bienvenue pour clients qui reviennent', tranche: '100-500 $', statut: 'idée', notes: 'avec deck de cartes Magic carte d’affaires' },
  { nom: 'Forfait week-end (nuit + chef + massothérapie)', tranche: '500-1000 $', statut: 'à établir', notes: '' },
  { nom: 'Journée team building entreprise privatisée', tranche: '1000-5000 $', statut: 'à établir', notes: '' },
  { nom: 'La Table des Inconnus, version corpo', tranche: '1000-5000 $', statut: 'à établir', notes: '' },
  { nom: 'Site web Vexel de base', tranche: '1000-5000 $', statut: 'à établir', notes: '' },
  { nom: 'Retraite d’équipe multi-jours tout inclus (avec PPS)', tranche: '5000-10 000 $', statut: 'à établir', notes: '' },
  { nom: 'Site Vexel premium', tranche: '5000-10 000 $', statut: 'à établir', notes: '' },
  { nom: 'Privatisation complète du domaine (mariages, retraites)', tranche: '10 000 $ et plus', statut: 'idée', notes: '' },
  { nom: 'Contrat Vexel organisation avec abonnement mensuel', tranche: '10 000 $ et plus', statut: 'idée', notes: '' },
  { nom: 'Résidences d’artistes commanditées', tranche: '10 000 $ et plus', statut: 'idée', notes: '' },
];

const COLLECTION = 'admin_product_ladder';

const statutTone = (s: Statut) =>
  s === 'établi' ? 'text-emerald-400' : s === 'à établir' ? 'text-amber-300' : 'text-neutral-400';

export const ProductLadderSection: React.FC = () => {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [collabValue, setCollabValue] = useState<number | null>(null);
  const [collabDraft, setCollabDraft] = useState('');
  const [editingCollab, setEditingCollab] = useState(false);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      collection(db, COLLECTION),
      snap => {
        setRows(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as ProductRow));
        setLoaded(true);
      },
      () => setLoaded(true),
    );
    const unsubMetric = onSnapshot(
      doc(db, 'admin_metrics', 'collaborateurs_potentiels'),
      snap => {
        const v = snap.exists() ? (snap.data() as any).value : 0;
        setCollabValue(typeof v === 'number' ? v : 0);
      },
      () => {},
    );
    return () => { unsub(); unsubMetric(); };
  }, []);

  // Seed automatique si la collection est vide au premier chargement.
  useEffect(() => {
    if (!db || !loaded || seeding) return;
    if (rows.length > 0) return;
    (async () => {
      setSeeding(true);
      try {
        const snap = await getDocs(collection(db, COLLECTION));
        if (snap.size === 0) {
          await Promise.all(SEED.map(p => addDoc(collection(db, COLLECTION), p)));
        }
      } catch (e) {
        console.error('seed product ladder failed', e);
      } finally {
        setSeeding(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const addRow = async () => {
    if (!db) return;
    await addDoc(collection(db, COLLECTION), {
      nom: 'Nouveau produit',
      tranche: 'Gratuit',
      statut: 'idée',
      notes: '',
    });
  };

  const updateRow = async (id: string, fields: Partial<ProductRow>) => {
    if (!db) return;
    await updateDoc(doc(db, COLLECTION, id), fields as any);
  };

  const deleteRow = async (id: string) => {
    if (!db || !confirm('Supprimer ce produit ?')) return;
    await deleteDoc(doc(db, COLLECTION, id));
  };

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => TRANCHES.indexOf(a.tranche) - TRANCHES.indexOf(b.tranche));
  }, [rows]);

  const startEditCollab = () => {
    setCollabDraft(String(collabValue ?? 0));
    setEditingCollab(true);
  };

  const saveCollab = async () => {
    if (!db) return;
    const n = Number(collabDraft);
    if (Number.isNaN(n)) { setEditingCollab(false); return; }
    await setDoc(doc(db, 'admin_metrics', 'collaborateurs_potentiels'), { value: n }, { merge: true });
    setEditingCollab(false);
  };

  return (
    <div className="space-y-10">
      {/* Compteur collaborateurs potentiels */}
      <div className="border border-white/10 bg-[#0a0a0a] p-6">
        <h2 className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em] mb-3">
          Collaborateurs potentiels
        </h2>
        <div className="flex items-center gap-4">
          {editingCollab ? (
            <>
              <input
                type="number"
                autoFocus
                value={collabDraft}
                onChange={e => setCollabDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveCollab(); if (e.key === 'Escape') setEditingCollab(false); }}
                className="w-28 px-3 py-2 bg-black/60 border border-[#d4af37]/50 text-white text-lg font-lato focus:outline-none"
              />
              <button
                onClick={saveCollab}
                className="px-4 py-2 bg-[#c5a059] text-[#18181b] font-cinzel font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-[#d4b06a] transition-all"
              >
                Sauvegarder
              </button>
              <button
                onClick={() => setEditingCollab(false)}
                className="px-4 py-2 border border-white/15 text-neutral-400 font-cinzel text-[10px] uppercase tracking-[0.3em] hover:border-white/30 transition-all"
              >
                Annuler
              </button>
            </>
          ) : (
            <>
              <span className="font-cinzel text-[#f3e5ab] text-3xl">{collabValue ?? 0}</span>
              <button
                onClick={startEditCollab}
                className="px-4 py-2 border border-white/10 text-neutral-400 font-cinzel text-xs uppercase tracking-widest hover:border-[#d4af37]/50 hover:text-[#d4af37] transition-all"
              >
                Modifier
              </button>
            </>
          )}
        </div>
        <p className="text-neutral-600 text-xs font-lato mt-2">
          Entreprises locales et contacts d'affaires en vue
        </p>
      </div>

      {/* Tableau échelle de produits */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-neutral-500 text-sm font-lato max-w-2xl">
            Échelle des produits et services, par tranche de prix.
          </p>
          <button
            onClick={addRow}
            className="px-4 py-2 border border-white/10 text-neutral-400 font-cinzel text-xs uppercase tracking-widest hover:border-[#d4af37]/50 hover:text-[#d4af37] transition-all"
          >
            + Ajouter un produit
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-lato border-collapse">
            <thead>
              <tr className="border-b border-white/8">
                {['Produit', 'Tranche', 'Statut', 'Notes', 'Actions'].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 font-cinzel text-[10px] uppercase tracking-widest text-neutral-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(row => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02] group">
                  <td className="py-2.5 px-3 text-white">
                    <input
                      value={row.nom}
                      onChange={e => updateRow(row.id, { nom: e.target.value })}
                      className="w-full bg-transparent border border-transparent hover:border-white/10 focus:border-[#d4af37]/50 text-white text-xs font-lato px-2 py-1 focus:outline-none"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <select
                      value={row.tranche}
                      onChange={e => updateRow(row.id, { tranche: e.target.value as Tranche })}
                      className="bg-black/60 border border-white/10 text-neutral-300 text-xs font-lato px-2 py-1 focus:outline-none focus:border-white/40"
                    >
                      {TRANCHES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="py-2.5 px-3">
                    <select
                      value={row.statut}
                      onChange={e => updateRow(row.id, { statut: e.target.value as Statut })}
                      className={`bg-black/60 border border-white/10 text-xs font-lato px-2 py-1 focus:outline-none focus:border-white/40 ${statutTone(row.statut)}`}
                    >
                      {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="py-2.5 px-3 text-neutral-400">
                    <input
                      value={row.notes}
                      onChange={e => updateRow(row.id, { notes: e.target.value })}
                      placeholder="—"
                      className="w-full bg-transparent border border-transparent hover:border-white/10 focus:border-[#d4af37]/50 text-neutral-400 text-xs font-lato px-2 py-1 focus:outline-none placeholder:text-neutral-700 placeholder:italic"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => deleteRow(row.id)}
                      className="text-red-800 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-[10px] font-cinzel uppercase"
                    >
                      Suppr.
                    </button>
                  </td>
                </tr>
              ))}
              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-700 italic">Aucun produit.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
