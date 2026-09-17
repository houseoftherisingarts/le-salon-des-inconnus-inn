import nodemailer from 'nodemailer';

// ─── Courriel du Salon (déménagé depuis index.ts) ──────────────────────────
// smtpTransport, notifyAlex, line et RUNTIME_WITH_SMTP servaient déjà partout
// dans index.ts ; ils vivent maintenant ici, avec envoyerAuMembre qui envoie
// aux membres en HTML (gabarit 6.12). Le transport Zoho est le même partout.

export const NOTIFY_TO = 'alex@lesalondesinconnus.com';
export const RUNTIME_WITH_SMTP = { secrets: ['ZOHO_USER', 'ZOHO_PASS'] as string[] };

// Build a one-off Zoho transporter from the runtime secrets. Returns null (and
// logs) if the secrets aren't present, so a misconfig never crashes a write.
export function smtpTransport() {
  const user = process.env.ZOHO_USER;
  const pass = process.env.ZOHO_PASS;
  if (!user || !pass) {
    console.error('ZOHO_USER / ZOHO_PASS not set, skipping notification email.');
    return null;
  }
  return nodemailer.createTransport({
    host: 'smtp.zohocloud.ca',
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

// Send a plain-text notification to Alex. Never throws, a failed email must not
// fail the Firestore write that triggered it.
export async function notifyAlex(subject: string, body: string): Promise<void> {
  const transporter = smtpTransport();
  if (!transporter) return;
  const from = `"Le Salon des Inconnus" <${process.env.ZOHO_USER}>`;
  try {
    await transporter.sendMail({ from, to: NOTIFY_TO, subject, text: body });
  } catch (err) {
    console.error('Notification email failed:', subject, err);
  }
}

// Small helper: "Label: value\n" only when value is non-empty.
export function line(label: string, value: unknown): string {
  return value !== undefined && value !== null && value !== '' ? `${label}: ${String(value)}\n` : '';
}

// ─── 6.12 Courriel aux membres, en HTML + texte ─────────────────────────────
// Expéditeur « Le Salon des Inconnus », en-tête au logo, bouton vers l'espace,
// adresse recopiée en clair sous le bouton pour les clients de courriel qui
// bloquent les liens. `corps` et `bouton` sont déjà dans la langue du membre.
export async function envoyerAuMembre(courriel: string, sujet: string, corps: string, lien: string, bouton: string, pied: string): Promise<void> {
  const transporter = smtpTransport();
  if (!transporter) return;
  const from = `"Le Salon des Inconnus" <${process.env.ZOHO_USER}>`;

  const texte = `${corps}\n\n${lien}\n\n${pied}`;
  const html = `
<div style="margin:0;padding:0;background:#050505;font-family:Georgia,serif;color:#f3ecda;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;padding-bottom:24px;border-bottom:1px solid rgba(197,160,89,0.35);">
      <img src="https://www.lesalondesinconnus.com/media/logo.png" alt="Le Salon des Inconnus" style="height:56px;width:auto;" />
    </div>
    <p style="margin:24px 0 16px;font-size:16px;line-height:1.6;">${corps}</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${lien}" style="display:inline-block;background:#c5a059;color:#0a0808;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:13px;letter-spacing:0.1em;font-weight:bold;">${bouton}</a>
    </div>
    <p style="margin:12px 0 0;font-size:13px;color:#9a9683;word-break:break-all;">${lien}</p>
    <p style="margin:28px 0 0;padding-top:16px;border-top:1px solid rgba(197,160,89,0.2);font-size:12px;color:#6f6b5c;">${pied}</p>
  </div>
</div>`;

  try {
    await transporter.sendMail({ from, to: courriel, subject: sujet, text: texte, html });
  } catch (err) {
    console.error('Email au membre échoué:', sujet, err);
  }
}
