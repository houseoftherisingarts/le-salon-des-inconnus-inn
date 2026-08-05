import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

// Section « Conférences » de la page /coffre : les six soirées familles
// gratuites en Petite-Nation, données avec La Petite Monnaie (voir
// Onyx/10_projects/coffre-des-inconnus/plan-conference.md). Écrit dans
// Firestore `conferenceRequests`, une collection dédiée, séparée des autres
// demandes du site, avec des noms de champs et un vocabulaire de statut
// alignés sur le futur modèle "signalements" du dashboard pieuvre, pour
// qu'un branchement futur n'exige aucun renommage.
// Même verre noir chaud et or que le reste de la page (voir GlassFrame et
// les PILL_* dans CoffreLanding.tsx) : rien de nouveau n'est inventé ici.

interface Props {
  t: (en: string, fr: string, es: string) => string;
}

const EASE = [0.22, 0.61, 0.36, 1] as const;

const PILL_PRIMARY =
  'px-6 py-3 rounded-full bg-gradient-to-r from-[#c5a059] via-[#e8d5a3] to-[#c5a059] text-[#171308] text-sm font-bold hover:shadow-[0_0_30px_rgba(197,160,89,0.35)] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none';
const PILL_SECONDARY =
  'px-6 py-3 rounded-full border border-white/20 text-neutral-200 text-sm hover:border-[#c5a059] hover:text-[#e8d5a3] transition-colors';

const H_SECTION = 'font-cinzel text-[22px] md:text-3xl text-[#e8d5a3] [text-wrap:balance]';

const inputClass =
  'w-full rounded-[15px] bg-black/40 backdrop-blur-md border border-white/15 text-neutral-200 text-sm px-4 py-3 outline-none placeholder:text-neutral-600 focus:border-[#c5a059]/60 transition-colors';
const labelClass = 'block text-[10px] font-cinzel uppercase tracking-[0.25em] text-neutral-500 mb-2';

type EstablishmentType = 'ecole' | 'bibliotheque' | 'organisme' | 'entreprise' | 'autre';

const TYPE_OPTIONS: { value: EstablishmentType; label: [string, string, string] }[] = [
  { value: 'ecole', label: ['School', 'École', 'Escuela'] },
  { value: 'bibliotheque', label: ['Library', 'Bibliothèque', 'Biblioteca'] },
  { value: 'organisme', label: ['Community organization', 'Organisme', 'Organización'] },
  { value: 'entreprise', label: ['Business', 'Entreprise', 'Empresa'] },
  { value: 'autre', label: ['Other', 'Autre', 'Otro'] },
];

interface CalendarRow {
  n: number;
  lieu: [string, string, string];
  pressenti: boolean;
}

const CALENDAR: CalendarRow[] = [
  { n: 1, lieu: ['Coop Place du marché', 'Coop Place du marché', 'Coop Place du marché'], pressenti: true },
  { n: 2, lieu: ['Le Salon des Inconnus, Namur', 'Le Salon des Inconnus, Namur', 'Le Salon des Inconnus, Namur'], pressenti: true },
  { n: 3, lieu: ['To be determined', 'À déterminer', 'Por determinar'], pressenti: false },
  { n: 4, lieu: ['To be determined', 'À déterminer', 'Por determinar'], pressenti: false },
  { n: 5, lieu: ['To be determined', 'À déterminer', 'Por determinar'], pressenti: false },
  { n: 6, lieu: ['To be determined', 'À déterminer', 'Por determinar'], pressenti: false },
];

const STEPS: { time: string; title: [string, string, string]; body: [string, string, string] }[] = [
  {
    time: '0–10 min',
    title: ['Welcome', 'Accueil', 'Bienvenida'],
    body: [
      'Families settle in by table. Every child gets an activity booklet and a pencil.',
      "Les familles s'installent par table. Chaque enfant reçoit son cahier d'activités et un crayon.",
      'Las familias se instalan por mesa. Cada niño recibe su cuadernillo de actividades y un lápiz.',
    ],
  },
  {
    time: '10–20 min',
    title: ['Why we are here', 'Pourquoi on est là', 'Por qué estamos aquí'],
    body: [
      'A short, standing intro: the true story of a tool born at home for two children, no diagram, no sales pitch.',
      "Court, debout, sans diaporama lourd : l'histoire vraie d'un outil né à la maison, pour deux enfants. Aucune vente.",
      'Corta, de pie, sin diapositivas pesadas: la historia real de una herramienta nacida en casa, para dos niños. Sin venta alguna.',
    ],
  },
  {
    time: '20–40 min',
    title: ['The booklet, on paper first', "Le cahier, sur papier d'abord", 'El cuadernillo, primero en papel'],
    body: [
      'Counting coins, splitting an allowance into four jars, choosing a goal and discovering what taxes add.',
      'Compter ses pièces, séparer une allocation en quatre pots, choisir un objectif et découvrir ce que les taxes ajoutent.',
      'Contar monedas, repartir una mesada en cuatro frascos, elegir un objetivo y descubrir lo que suman los impuestos.',
    ],
  },
  {
    time: '40–60 min',
    title: ['The app, together', "L'application, ensemble", 'La aplicación, juntos'],
    body: [
      'Each family installs Le Coffre and reproduces on their own device exactly what was just done on paper.',
      'Chaque famille installe Le Coffre sur son propre appareil et reproduit exactement ce qui vient d\'être fait sur papier.',
      'Cada familia instala Le Coffre en su propio dispositivo y reproduce exactamente lo que se acaba de hacer en papel.',
    ],
  },
  {
    time: '60–80 min',
    title: ['Local currency, with La Petite Monnaie', 'La monnaie locale, avec La Petite Monnaie', 'La moneda local, con La Petite Monnaie'],
    body: [
      'What a local currency is, what happens when a dollar stays in the region, and the link with the Coffre\'s Giving jar.',
      "Ce qu'est une monnaie locale, ce qui se passe quand un dollar reste dans la région, et le lien avec le pot Partage du Coffre.",
      'Qué es una moneda local, qué pasa cuando un dólar se queda en la región, y el vínculo con el frasco Compartir de Le Coffre.',
    ],
  },
  {
    time: '80–90 min',
    title: ['Departure', 'Départ', 'Salida'],
    body: [
      'Every family leaves with their booklet, the app installed, and the first goal already entered.',
      "Chaque famille repart avec son cahier, l'application installée, et le premier objectif déjà entré.",
      'Cada familia se va con su cuadernillo, la aplicación instalada, y el primer objetivo ya ingresado.',
    ],
  },
];

const blankForm = {
  establishmentName: '',
  establishmentType: 'ecole' as EstablishmentType,
  municipality: '',
  contactName: '',
  email: '',
  phone: '',
  expectedFamilies: '',
  desiredDates: '',
  message: '',
};

export const ConferenceSection: React.FC<Props> = ({ t }) => {
  const [showPlan, setShowPlan] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState(blankForm);
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || sending) return;
    if (!form.establishmentName.trim() || !form.contactName.trim() || !form.email.trim() || !form.municipality.trim()) {
      setError(t('Please fill in the establishment, municipality, contact and email.', "Veuillez remplir l'établissement, la municipalité, le nom du responsable et le courriel.", 'Complete el establecimiento, la municipalidad, el responsable y el correo.'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      await addDoc(collection(db, 'conferenceRequests'), {
        establishmentName: form.establishmentName.trim(),
        establishmentType: form.establishmentType,
        municipality: form.municipality.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        expectedFamilies: form.expectedFamilies ? Number(form.expectedFamilies) : null,
        desiredDates: form.desiredDates.trim(),
        message: form.message.trim(),
        status: 'nouveau',
        createdAt: serverTimestamp(),
      });
      setSent(true);
      setForm(blankForm);
    } catch (err: any) {
      console.error('conferenceRequest submit failed', err);
      setError(t('Something went wrong. Try again, or write directly to alex@lesalondesinconnus.com.', 'Un problème est survenu. Réessayez, ou écrivez directement à alex@lesalondesinconnus.com.', 'Ocurrió un problema. Vuelva a intentarlo, o escriba directamente a alex@lesalondesinconnus.com.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <p className="text-[11px] tracking-[0.3em] uppercase text-[#c5a059] mb-4">
        {t('Family conferences · with La Petite Monnaie', 'Conférences familiales · avec La Petite Monnaie', 'Conferencias familiares · con La Petite Monnaie')}
      </p>
      <h3 className={`${H_SECTION} mb-5`}>
        {t('A family evening in your village.', 'Une soirée famille dans votre village.', 'Una noche familiar en su pueblo.')}
      </h3>
      <p className="text-neutral-300 leading-relaxed max-w-3xl">
        {t(
          'Six free evenings across the Petite-Nation, presented with La Petite Monnaie. Parent and child come together and leave with the tool installed and already used once. Ninety minutes, hosted by Alex from Le Coffre des Inconnus and a spokesperson from La Petite Monnaie. Nobody leaves without having touched the app with their child.',
          "Six soirées gratuites en Petite-Nation, données avec La Petite Monnaie. Le parent et l'enfant viennent ensemble et repartent avec l'outil installé, déjà utilisé une première fois. Quatre-vingt-dix minutes, animées par Alex du Coffre des Inconnus et un porte-parole de La Petite Monnaie. Personne ne repart sans avoir touché à l'application avec son enfant.",
          'Seis noches gratuitas en la Petite-Nation, presentadas con La Petite Monnaie. El padre o la madre y el niño vienen juntos y se van con la herramienta instalada, ya usada una primera vez. Noventa minutos, animados por Alex de Le Coffre des Inconnus y un portavoz de La Petite Monnaie. Nadie se va sin haber tocado la aplicación con su hijo.',
        )}
      </p>

      {/* Calendrier des six soirées */}
      <div className="mt-12">
        <p className="text-[11px] tracking-[0.3em] uppercase text-neutral-500 mb-5">
          {t('The six-evening calendar', 'Le calendrier des six soirées', 'El calendario de las seis noches')}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {CALENDAR.map((row) => (
            <div
              key={row.n}
              className="rounded-[15px] border border-[#c5a059]/25 bg-black/40 backdrop-blur-md p-5 flex items-center gap-4"
            >
              <span className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-cinzel text-[#171308] font-bold text-sm" style={{ background: 'linear-gradient(135deg, #c5a059, #e8d5a3, #c5a059)' }}>
                {row.n}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[#e8d5a3] font-medium truncate">{t(row.lieu[0], row.lieu[1], row.lieu[2])}</p>
                <p className="text-neutral-500 text-xs mt-0.5">{t('Date to be confirmed', 'Date à confirmer', 'Fecha por confirmar')}</p>
              </div>
              <span
                className={`shrink-0 text-[9px] font-cinzel uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border ${
                  row.pressenti
                    ? 'border-[#c5a059]/40 text-[#e8d5a3] bg-[#c5a059]/10'
                    : 'border-white/15 text-neutral-500 bg-white/5'
                }`}
              >
                {row.pressenti
                  ? t('Considered', 'Pressenti', 'Contemplado')
                  : t('TBD', 'À déterminer', 'Por determinar')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA row */}
      <div className="mt-12 flex flex-wrap gap-3">
        <button type="button" onClick={() => { setShowForm((v) => !v); }} aria-expanded={showForm} className={PILL_PRIMARY}>
          {t('Request a conference at my establishment', 'Demander une conférence à mon établissement', 'Solicitar una conferencia en mi establecimiento')}
        </button>
        <button type="button" onClick={() => setShowPlan((v) => !v)} aria-expanded={showPlan} className={PILL_SECONDARY}>
          {showPlan
            ? t('Hide the plan', 'Masquer le plan', 'Ocultar el plan')
            : t('See the conference plan', 'Voir le plan de la conférence', 'Ver el plan de la conferencia')}
        </button>
      </div>

      {/* Déroulé de 90 minutes */}
      <AnimatePresence initial={false}>
        {showPlan && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-8 rounded-[15px] border border-[#c5a059]/25 bg-black/40 backdrop-blur-md p-6 md:p-8">
              <p className="font-cinzel text-lg text-[#e8d5a3] mb-6">
                {t('The 90-minute plan', 'Le déroulé, en 90 minutes', 'El desarrollo, en 90 minutos')}
              </p>
              <div className="space-y-5">
                {STEPS.map((s) => (
                  <div key={s.time} className="grid grid-cols-[80px_1fr] md:grid-cols-[100px_1fr] gap-4">
                    <span className="text-[#c5a059] text-xs font-cinzel tabular-nums pt-0.5">{s.time}</span>
                    <div>
                      <p className="text-[#e8d5a3] text-sm font-medium mb-1">{t(s.title[0], s.title[1], s.title[2])}</p>
                      <p className="text-neutral-400 text-sm leading-relaxed">{t(s.body[0], s.body[1], s.body[2])}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulaire de demande */}
      <AnimatePresence initial={false}>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-8 rounded-[15px] border border-[#c5a059]/25 bg-black/40 backdrop-blur-md p-6 md:p-8">
              {sent ? (
                <div className="text-center py-6">
                  <p className="font-cinzel text-lg text-[#e8d5a3] mb-3">
                    {t('Request received.', 'Demande reçue.', 'Solicitud recibida.')}
                  </p>
                  <p className="text-neutral-300 leading-relaxed max-w-md mx-auto">
                    {t(
                      'Alex will get back to you personally to set a date.',
                      'Alex vous revient personnellement pour fixer une date.',
                      'Alex se pondrá en contacto personalmente para fijar una fecha.',
                    )}
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5" noValidate>
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className={labelClass}>{t('Establishment name', "Nom de l'établissement", 'Nombre del establecimiento')}</label>
                      <input {...field('establishmentName')} className={inputClass} autoComplete="organization" />
                    </div>
                    <div>
                      <label className={labelClass}>{t('Type', 'Type', 'Tipo')}</label>
                      <select {...field('establishmentType')} className={inputClass}>
                        {TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value} className="bg-[#171308]">
                            {t(o.label[0], o.label[1], o.label[2])}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className={labelClass}>{t('Municipality', 'Municipalité', 'Municipalidad')}</label>
                      <input {...field('municipality')} className={inputClass} autoComplete="address-level2" />
                    </div>
                    <div>
                      <label className={labelClass}>{t('Responsible person', 'Personne responsable', 'Persona responsable')}</label>
                      <input {...field('contactName')} className={inputClass} autoComplete="name" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className={labelClass}>{t('Email', 'Courriel', 'Correo')}</label>
                      <input type="email" {...field('email')} className={inputClass} autoComplete="email" />
                    </div>
                    <div>
                      <label className={labelClass}>{t('Phone', 'Téléphone', 'Teléfono')}</label>
                      <input type="tel" {...field('phone')} className={inputClass} autoComplete="tel" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className={labelClass}>{t('Expected number of families', 'Nombre de familles attendu', 'Número de familias esperado')}</label>
                      <input type="number" min={0} {...field('expectedFamilies')} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>{t('Dates you have in mind', 'Dates envisagées', 'Fechas consideradas')}</label>
                      <input {...field('desiredDates')} className={inputClass} placeholder={t('e.g. October–November 2026', 'ex. octobre-novembre 2026', 'ej. octubre-noviembre 2026')} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>{t('Message (optional)', 'Message (facultatif)', 'Mensaje (opcional)')}</label>
                    <textarea {...field('message')} rows={4} className={`${inputClass} resize-none`} />
                  </div>

                  {error && <p className="text-rose-300 text-sm">{error}</p>}

                  <button type="submit" disabled={sending} className={PILL_PRIMARY}>
                    {sending ? t('Sending…', 'Envoi…', 'Enviando…') : t('Send the request', 'Envoyer la demande', 'Enviar la solicitud')}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
