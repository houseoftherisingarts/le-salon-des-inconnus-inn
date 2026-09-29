// Contact : la section de clôture, avant le pied de page. Elle pointe vers
// le rendez-vous quand la section est allumée (le vrai geste qu'on veut),
// sinon vers le lien de réservation externe que l'artiste a fourni.

import * as React from 'react';
import { useTexte } from '../shared';
import { sectionVisible, SectionShell, type SectionProps } from './common';

export const ContactSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    if (!sectionVisible(config, 'contact')) return null;
    const rendezvousAllume = sectionVisible(config, 'rendezvous');
    const lienExterne = config.links?.booking;
    if (!rendezvousAllume && !lienExterne) return null;

    return (
        <SectionShell eyebrowEn="Get in touch" eyebrowFr="Contact" language={language} id="contact" tone="graphite">
            <div className="text-center max-w-2xl mx-auto py-6 md:py-10">
                <h2 className="es-display text-[color:var(--es-ink)] text-3xl md:text-5xl leading-[1.1] mb-6">
                    {t('Let’s work together', 'Travaillons ensemble')}
                </h2>
                <p className="es-body text-[color:var(--es-ink-2)] mb-8">
                    {t(
                        'A short video meeting is the easiest way to start.',
                        'Une courte rencontre vidéo, c’est la façon la plus simple de commencer.',
                    )}
                </p>
                {rendezvousAllume ? (
                    <a
                        href="#rendezvous"
                        className="inline-block px-8 py-4 bg-[color:var(--es-accent)] text-[color:var(--es-accent-ink)] es-label text-[13px] uppercase tracking-[0.35em] hover:brightness-110 transition-colors rounded-[15px]"
                    >
                        {t('Book a meeting', 'Prendre rendez-vous')}
                    </a>
                ) : (
                    <a
                        href={lienExterne}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-block px-8 py-4 bg-[color:var(--es-accent)] text-[color:var(--es-accent-ink)] es-label text-[13px] uppercase tracking-[0.35em] hover:brightness-110 transition-colors rounded-[15px]"
                    >
                        {t('Book a meeting', 'Prendre rendez-vous')}
                    </a>
                )}
            </div>
        </SectionShell>
    );
};
