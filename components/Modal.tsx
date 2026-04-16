
import React, { useEffect, useState } from 'react';
import { Book } from '../types';

interface ModalProps {
  book: Book | null;
  onClose: () => void;
  isAdmin: boolean;
  onSaveLink: (id: number, newLink: string) => void;
  chooseLabel: string;
  onNavigate: (view: 'DESK' | 'INN') => void;
}

export const Modal: React.FC<ModalProps> = ({ book, onClose, isAdmin, onSaveLink, chooseLabel, onNavigate }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [editLink, setEditLink] = useState('');

  useEffect(() => {
    if (book) {
      setIsVisible(true);
      setEditLink(book.link);
    } else {
      setIsVisible(false);
    }
  }, [book]);

  const handleSave = () => {
    if (book) {
      onSaveLink(book.id, editLink);
    }
  };

  const handleAction = () => {
      // Logic: If it is the Inn (ID 2), navigate internally.
      // Otherwise, assume it's an external link.
      if (book && book.id === 2) {
          setIsVisible(false);
          // Small delay to allow modal to close visually before switching view
          setTimeout(() => {
              onNavigate('INN');
              onClose();
          }, 300);
      } else if (book) {
          window.open(book.link, '_blank', 'noopener,noreferrer');
      }
  };

  if (!book) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-700 ${isVisible ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Darkened Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Content Container (Apple Store x Victorian) */}
      <div 
        className={`relative w-full max-w-xl bg-[#faf9f5] text-neutral-900 rounded-xl shadow-2xl p-10 transform transition-all duration-700 cubic-bezier(0.19, 1, 0.22, 1) ${isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Subtle Paper Texture Overlay */}
        <div 
            className="absolute inset-0 rounded-xl pointer-events-none opacity-[0.03]" 
            style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")` }}
        />

        {/* Close Button (Minimalist) */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-800 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 z-20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header Section */}
        <div className="text-center mb-8 relative z-10">
            <div className="inline-block mb-3">
                <span className="text-[10px] uppercase tracking-[0.3em] font-cinzel font-bold text-[#b89c6f]">
                    Le Salon des Inconnus
                </span>
            </div>
            
            <h2 className="text-4xl font-cinzel font-bold text-[#1a1a1a] mb-2 tracking-wide">
                {book.title}
            </h2>
            
            {book.originalTitle && (
                <p className="text-sm font-cinzel italic text-[#8b7e6a]">
                — {book.originalTitle} —
                </p>
            )}
        </div>

        {/* Separator */}
        <div className="w-12 h-px bg-[#d4af37]/30 mx-auto mb-8"></div>

        {/* Description Body - Bullet Points */}
        <div className="text-left px-8 mb-10">
          <p className="text-xs font-cinzel font-bold text-[#b89c6f] uppercase tracking-widest mb-6 text-center">
            {chooseLabel}
          </p>
          <ul className="space-y-3">
            {book.description.map((item, i) => (
               <li key={i} className="flex items-start">
                 <span className="text-[#d4af37] mr-3 mt-1.5 text-[10px]">♦</span>
                 <span className="text-lg font-lato font-light leading-relaxed text-[#4a4a4a]">
                   {item}
                 </span>
               </li>
            ))}
          </ul>
        </div>

        {/* Action Area */}
        <div className="flex flex-col items-center gap-4 relative z-10">
            
            {/* Admin Edit Mode */}
            {isAdmin ? (
              <div className="w-full bg-neutral-100 p-6 rounded-lg border border-neutral-200">
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Target Destination</label>
                <div className="flex gap-2">
                    <input 
                    type="text" 
                    value={editLink}
                    onChange={(e) => setEditLink(e.target.value)}
                    className="flex-1 bg-white border border-neutral-300 text-neutral-800 text-sm rounded p-2 focus:outline-none focus:border-[#d4af37] transition-colors"
                    placeholder="https://..."
                    />
                    <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-neutral-900 text-white text-xs rounded hover:bg-black transition-colors uppercase font-bold tracking-wider"
                    >
                    Save
                    </button>
                </div>
              </div>
            ) : (
              /* User Read Mode - Elegant Button */
              <button
                onClick={handleAction}
                className="group relative inline-flex items-center justify-center px-10 py-4 overflow-hidden font-cinzel font-bold tracking-widest text-white shadow-lg rounded-full bg-[#1a1a1a] transition-all duration-300 hover:bg-[#2a2a2a] hover:shadow-xl hover:-translate-y-0.5"
              >
                <span className="mr-3">Open Selection</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </button>
            )}
        </div>
      </div>
    </div>
  );
};
