
import React from 'react';

interface SiteMapProps {
  activeNodeId: string;
  onClose: () => void;
  onNodeSelect: (nodeId: string) => void;
}

export const SiteMap: React.FC<SiteMapProps> = ({ activeNodeId, onClose, onNodeSelect }) => {
  // Tree Structure Data
  // "done" = Green (Desk)
  // "in-progress" = Yellow (General)
  // "planned" = Red (Creator, Grimoire, Patronage)
  // "secret" = Orange (BBQ)
  const nodes = [
      { id: 'desk', label: 'Wizard\'s Desk', x: 50, y: 10, parent: null, status: 'done' },
      
      { id: 'inn', label: 'The Inn', x: 15, y: 35, parent: 'desk', status: 'in-progress' },
      { id: 'hub', label: 'The Arts (Hub)', x: 85, y: 35, parent: 'desk', status: 'in-progress' },
      
      // Arts Branch
      { id: 'patron_hub', label: 'Patron', x: 60, y: 55, parent: 'hub', status: 'in-progress' },
      { id: 'artist_hub', label: 'Creator', x: 90, y: 55, parent: 'hub', status: 'planned' },
      
      // Patron Leaves
      { id: 'roster', label: 'Roster', x: 40, y: 85, parent: 'patron_hub', status: 'in-progress' },
      { id: 'fiscality', label: 'Fiscality', x: 52, y: 85, parent: 'patron_hub', status: 'in-progress' },
      { id: 'patronage', label: 'Patronage', x: 64, y: 85, parent: 'patron_hub', status: 'planned' },
      { id: 'platforms', label: 'Platforms', x: 76, y: 85, parent: 'patron_hub', status: 'in-progress' },

      // Creator Leaves
      { id: 'registry', label: 'Registry', x: 88, y: 85, parent: 'artist_hub', status: 'in-progress' },
      { id: 'grimoire', label: 'Grimoire', x: 98, y: 85, parent: 'artist_hub', status: 'planned' },

      // HIDDEN / INDEPENDENT NODE
      { id: 'bbq', label: 'Le BBQ', x: 90, y: 10, parent: null, status: 'secret' },
  ];

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'done': return { bg: 'bg-emerald-500', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.8)]', ring: 'border-emerald-700' };
          case 'in-progress': return { bg: 'bg-yellow-500', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.8)]', ring: 'border-yellow-700' };
          case 'planned': return { bg: 'bg-red-600', glow: 'shadow-[0_0_15px_rgba(220,38,38,0.8)]', ring: 'border-red-800' };
          case 'secret': return { bg: 'bg-orange-600', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.9)] animate-pulse', ring: 'border-orange-800' };
          default: return { bg: 'bg-neutral-500', glow: 'shadow-none', ring: 'border-neutral-700' };
      }
  };

  return (
      <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fadeIn font-serif" onClick={onClose}>
          
          {/* Mutagen Background Texture */}
          <div className="absolute inset-0 pointer-events-none opacity-20" 
             style={{ backgroundImage: `radial-gradient(circle at center, #2a2a2a 0%, #000000 100%)` }} 
          />
          
          <div className="relative w-full max-w-7xl h-[90vh] bg-[#0a0a0a] rounded-3xl border border-white/10 shadow-2xl p-4 md:p-8 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              
              {/* Header */}
              <div className="text-center relative z-20 mb-4">
                 <h2 className="font-cinzel text-4xl text-[#d4af37] tracking-[0.2em] drop-shadow-[0_2px_10px_rgba(212,175,55,0.4)]">
                     Site Structure
                 </h2>
                 <p className="text-neutral-500 font-cinzel text-xs tracking-widest mt-2 uppercase">Interactive Navigation Map</p>
              </div>

              {/* Legend */}
              <div className="absolute top-8 left-8 flex flex-col gap-3 z-30 bg-black/60 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] border border-emerald-300"></div> 
                      <span className="text-xs text-neutral-300 font-cinzel uppercase tracking-wider">Active</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)] border border-yellow-300"></div> 
                      <span className="text-xs text-neutral-300 font-cinzel uppercase tracking-wider">In Progress</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)] border border-red-400"></div> 
                      <span className="text-xs text-neutral-300 font-cinzel uppercase tracking-wider">Planned</span>
                  </div>
                  {/* Hidden legend for secret node */}
              </div>

              <button onClick={onClose} className="absolute top-8 right-8 text-neutral-500 hover:text-white transition-colors z-50 p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
              </button>
              
              <div className="relative w-full h-full mt-4">
                  {/* Connection Lines (Veins - Orthogonal Family Tree Style) */}
                  {/* We use viewBox 0 0 100 100 to map percentages to vector coordinates easily */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {nodes.map(node => {
                          if (!node.parent) return null;
                          const parent = nodes.find(n => n.id === node.parent);
                          if (!parent) return null;
                          
                          // Calculate the halfway vertical point
                          const midY = (parent.y + node.y) / 2;

                          return (
                              <path 
                                key={`${parent.id}-${node.id}`}
                                // M: Move to parent bottom
                                // V: Vertical line to midpoint
                                // H: Horizontal line to child X
                                // V: Vertical line to child top
                                // Note: coordinates are unitless in viewBox, matching the node x/y values directly
                                d={`M ${parent.x} ${parent.y} V ${midY} H ${node.x} V ${node.y}`}
                                fill="none"
                                stroke="#a3a3a3" 
                                strokeOpacity="0.3" 
                                strokeWidth="0.5"
                                vectorEffect="non-scaling-stroke"
                                strokeLinecap="square"
                              />
                          );
                      })}
                  </svg>

                  {/* Nodes (Mutagen Sockets) */}
                  {nodes.map(node => {
                      const isActive = activeNodeId === node.id;
                      const styles = getStatusColor(node.status);
                      
                      return (
                          <div 
                            key={node.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
                            style={{ left: `${node.x}%`, top: `${node.y}%` }}
                          >
                              {/* The Socket Node */}
                              <button 
                                onClick={() => onNodeSelect(node.id)}
                                className={`relative group w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'scale-125' : 'hover:scale-110'}`}
                              >
                                  {/* Outer Ring */}
                                  <div className={`absolute inset-0 rounded-full border-2 ${isActive ? 'border-white animate-pulse' : 'border-[#3a3a3a] group-hover:border-[#5a5a5a]'} bg-[#1a1a1a] shadow-xl`}></div>
                                  
                                  {/* Inner Mutagen Core */}
                                  <div className={`absolute inset-1.5 rounded-full ${styles.bg} ${styles.glow} border ${styles.ring} transition-all duration-500 opacity-90 group-hover:opacity-100`}></div>
                                  
                                  {/* Shine Reflection */}
                                  <div className="absolute inset-1.5 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none"></div>
                              </button>

                              {/* Label Plate */}
                              <div className={`mt-2 px-2 py-1 bg-[#0a0a0a] border border-[#333] rounded shadow-lg transition-all duration-300 ${isActive ? 'border-[#d4af37] scale-105' : ''}`}>
                                  <span className={`block text-center font-cinzel font-bold text-[9px] md:text-[10px] uppercase tracking-widest ${isActive ? 'text-[#d4af37]' : 'text-neutral-300'}`}>
                                      {node.label}
                                  </span>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>
  );
};
