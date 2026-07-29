import React from 'react';

// Markdown-lite renderer for blog bodies. Supports exactly what the house
// voice needs: paragraphs (blank line), ## and ### headings, - lists,
// > quotes, **bold**. No italics by design (accent = gold + weight, never
// italic), no raw HTML, no external dependency.

const renderInline = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-[#f3e5ab]">{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

type Block =
  | { kind: 'h2' | 'h3' | 'p' | 'quote'; text: string }
  | { kind: 'list'; items: string[] };

const parseBlocks = (body: string): Block[] => {
  const blocks: Block[] = [];
  for (const raw of body.replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const chunk = raw.trim();
    if (!chunk) continue;
    if (chunk.startsWith('### ')) { blocks.push({ kind: 'h3', text: chunk.slice(4) }); continue; }
    if (chunk.startsWith('## '))  { blocks.push({ kind: 'h2', text: chunk.slice(3) }); continue; }
    if (chunk.startsWith('> '))   { blocks.push({ kind: 'quote', text: chunk.replace(/^> ?/gm, '') }); continue; }
    if (/^- /m.test(chunk)) {
      blocks.push({ kind: 'list', items: chunk.split('\n').map(l => l.replace(/^- /, '').trim()).filter(Boolean) });
      continue;
    }
    blocks.push({ kind: 'p', text: chunk.replace(/\n/g, ' ') });
  }
  return blocks;
};

export const BlogBody: React.FC<{ body: string }> = ({ body }) => (
  <div style={{ maxWidth: '68ch' }}>
    {parseBlocks(body).map((b, i) => {
      switch (b.kind) {
        case 'h2':
          return (
            <h2 key={i} className="font-prata text-[#f3e5ab] mt-12 mb-5" style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2rem)', lineHeight: 1.15 }}>
              {renderInline(b.text)}
            </h2>
          );
        case 'h3':
          return (
            <h3 key={i} className="font-cinzel uppercase text-[#c5a059] mt-10 mb-4" style={{ fontSize: '13px', letterSpacing: '0.3em' }}>
              {renderInline(b.text)}
            </h3>
          );
        case 'quote':
          return (
            <blockquote key={i} className="my-8 pl-6 border-l border-[#c5a059]/40 font-cormorant text-[#f3e5ab]/90" style={{ fontSize: 'clamp(1.2rem, 1.9vw, 1.45rem)', lineHeight: 1.5 }}>
              {renderInline(b.text)}
            </blockquote>
          );
        case 'list':
          return (
            <ul key={i} className="my-6 space-y-3">
              {b.items.map((item, j) => (
                <li key={j} className="font-lato text-white/75 flex gap-4" style={{ fontSize: 'clamp(1.02rem, 1.35vw, 1.13rem)', lineHeight: 1.75 }}>
                  <span aria-hidden className="block shrink-0 w-4 h-px bg-[#c5a059] mt-[0.85em]" />
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        default:
          return (
            <p key={i} className="font-lato text-white/75 my-6" style={{ fontSize: 'clamp(1.02rem, 1.35vw, 1.13rem)', lineHeight: 1.8 }}>
              {renderInline(b.text)}
            </p>
          );
      }
    })}
  </div>
);
