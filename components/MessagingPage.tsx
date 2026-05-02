
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
  doc, getDoc, setDoc, updateDoc, addDoc,
  collection, query, where, orderBy, onSnapshot,
  serverTimestamp, getDocs,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { MemberProfile } from './AuthModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MessagingPageProps {
  language: 'EN' | 'FR';
  user: User;
  memberProfile: MemberProfile;
  initialConversationId?: string | null;
  onNavigate: (view: string) => void;
  onViewProfile: (uid: string) => void;
}

interface Conversation {
  id: string;
  type: 'dm' | 'group';
  members: string[];
  memberProfiles: Record<string, { displayName: string; photoURL?: string }>;
  title?: string;
  lastMessage?: string;
  lastMessageAt?: any;
}

interface Message {
  id: string;
  uid: string;
  displayName: string;
  photoURL?: string;
  text: string;
  createdAt: any;
}

function dmId(uid1: string, uid2: string): string {
  return 'dm_' + [uid1, uid2].sort().join('_');
}

function getConvDisplayName(conv: Conversation, myUid: string): string {
  if (conv.type === 'group') return conv.title ?? 'Group Chat';
  const otherUid = conv.members.find(u => u !== myUid) ?? '';
  return conv.memberProfiles[otherUid]?.displayName ?? 'Member';
}

function getConvAvatar(conv: Conversation, myUid: string): { name: string; photoURL?: string } {
  if (conv.type === 'group') return { name: conv.title ?? 'G' };
  const otherUid = conv.members.find(u => u !== myUid) ?? '';
  return {
    name: conv.memberProfiles[otherUid]?.displayName ?? 'M',
    photoURL: conv.memberProfiles[otherUid]?.photoURL,
  };
}

const MiniAvatar: React.FC<{ name: string; photoURL?: string; size?: number; onClick?: () => void }> = ({ name, photoURL, size = 32, onClick }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const cls = `rounded-full shrink-0 object-cover border border-white/10 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`;
  return photoURL ? (
    <img src={photoURL} alt={name} className={cls} style={{ width: size, height: size }} onClick={onClick} />
  ) : (
    <div
      className={`rounded-full shrink-0 bg-[#d4af37]/20 flex items-center justify-center border border-[#d4af37]/30 ${onClick ? 'cursor-pointer hover:bg-[#d4af37]/30 transition-colors' : ''}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <span className="text-[#d4af37] font-cinzel font-bold leading-none" style={{ fontSize: size * 0.38 }}>
        {initials}
      </span>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const MessagingPage: React.FC<MessagingPageProps> = ({
  language,
  user,
  memberProfile,
  initialConversationId,
  onNavigate,
  onViewProfile,
}) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(initialConversationId ?? null);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [dmSearch, setDmSearch] = useState('');
  const [dmResults, setDmResults] = useState<MemberProfile[]>([]);
  const [dmSearching, setDmSearching] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [groupMembers, setGroupMembers] = useState<MemberProfile[]>([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupResults, setGroupResults] = useState<MemberProfile[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load user's conversations
  useEffect(() => {
    if (!db) return;
    const active = { current: true };
    const q = query(
      collection(db, 'conversations'),
      where('members', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      if (!active.current) return;
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation)));
    }, () => {});
    return () => { active.current = false; unsub(); };
  }, [user.uid]);

  // Load active conversation
  useEffect(() => {
    if (!activeConvId || !db) return;
    const active = { current: true };
    const unsub = onSnapshot(doc(db, 'conversations', activeConvId), snap => {
      if (!active.current || !snap.exists()) return;
      setActiveConv({ id: snap.id, ...snap.data() } as Conversation);
    }, () => {});
    return () => { active.current = false; unsub(); };
  }, [activeConvId]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvId || !db) return;
    const active = { current: true };
    const q = query(
      collection(db, 'conversations', activeConvId, 'messages'),
      orderBy('createdAt', 'asc'),
    );
    const unsub = onSnapshot(q, snap => {
      if (!active.current) return;
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    }, () => {});
    return () => { active.current = false; unsub(); };
  }, [activeConvId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!msgText.trim() || !activeConvId || !db || sending) return;
    const text = msgText.trim();
    setMsgText('');
    setSending(true);
    try {
      await addDoc(collection(db, 'conversations', activeConvId, 'messages'), {
        uid: user.uid,
        displayName: memberProfile.displayName,
        photoURL: memberProfile.photoURL ?? '',
        text,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'conversations', activeConvId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
      });
    } catch (_) {}
    setSending(false);
  };

  // Member search (for DM and group)
  const searchMembers = async (term: string): Promise<MemberProfile[]> => {
    if (!db || term.length < 2) return [];
    try {
      const snap = await getDocs(collection(db, 'members'));
      return snap.docs
        .map(d => d.data() as MemberProfile)
        .filter(p =>
          p.uid !== user.uid &&
          p.displayName.toLowerCase().includes(term.toLowerCase()),
        )
        .slice(0, 8);
    } catch (_) { return []; }
  };

  useEffect(() => {
    if (!dmSearch) { setDmResults([]); return; }
    setDmSearching(true);
    searchMembers(dmSearch).then(r => { setDmResults(r); setDmSearching(false); });
  }, [dmSearch]);

  useEffect(() => {
    if (!groupSearch) { setGroupResults([]); return; }
    searchMembers(groupSearch).then(r => setGroupResults(r));
  }, [groupSearch]);

  const startDM = async (target: MemberProfile) => {
    if (!db) return;
    const convId = dmId(user.uid, target.uid);
    const convRef = doc(db, 'conversations', convId);
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      await setDoc(convRef, {
        type: 'dm',
        members: [user.uid, target.uid].sort(),
        memberProfiles: {
          [user.uid]: { displayName: memberProfile.displayName, photoURL: memberProfile.photoURL ?? '' },
          [target.uid]: { displayName: target.displayName, photoURL: target.photoURL ?? '' },
        },
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    }
    setActiveConvId(convId);
    setShowNewDM(false);
    setDmSearch('');
    setDmResults([]);
  };

  const createGroupChat = async () => {
    if (!db || !groupTitle.trim() || groupMembers.length === 0) return;
    const memberUids = [user.uid, ...groupMembers.map(m => m.uid)];
    const profiles: Record<string, any> = {
      [user.uid]: { displayName: memberProfile.displayName, photoURL: memberProfile.photoURL ?? '' },
    };
    groupMembers.forEach(m => {
      profiles[m.uid] = { displayName: m.displayName, photoURL: m.photoURL ?? '' };
    });
    const convRef = await addDoc(collection(db, 'conversations'), {
      type: 'group',
      title: groupTitle.trim(),
      members: memberUids,
      memberProfiles: profiles,
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    setActiveConvId(convRef.id);
    setShowNewGroup(false);
    setGroupTitle('');
    setGroupMembers([]);
  };

  const formatTime = (ts: any): string => {
    if (!ts?.toDate) return '';
    const d = ts.toDate();
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString(language === 'FR' ? 'fr-CA' : 'en-CA', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString(language === 'FR' ? 'fr-CA' : 'en-CA', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-lato flex flex-col">

      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center gap-4 shrink-0">
        <button onClick={() => onNavigate('INN')} className="text-neutral-600 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <span className="text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-600">
          {t('Messages', 'Messages')}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>

        {/* ── Sidebar ── */}
        <div className="w-72 border-r border-white/5 flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-white/5 flex gap-2">
            <button
              onClick={() => { setShowNewDM(true); setShowNewGroup(false); }}
              className="flex-1 py-1.5 text-[10px] font-cinzel uppercase tracking-widest text-neutral-500 border border-white/8 hover:border-[#d4af37]/40 hover:text-[#d4af37] transition-all"
            >
              + DM
            </button>
            <button
              onClick={() => { setShowNewGroup(true); setShowNewDM(false); }}
              className="flex-1 py-1.5 text-[10px] font-cinzel uppercase tracking-widest text-neutral-500 border border-white/8 hover:border-[#d4af37]/40 hover:text-[#d4af37] transition-all"
            >
              + {t('Group', 'Groupe')}
            </button>
          </div>

          {/* New DM panel */}
          {showNewDM && (
            <div className="p-4 border-b border-white/5 space-y-2">
              <input
                autoFocus
                type="text"
                placeholder={t('Search members…', 'Chercher un membre…')}
                value={dmSearch}
                onChange={e => setDmSearch(e.target.value)}
                className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 text-xs font-lato focus:outline-none focus:border-[#d4af37]/50 placeholder:text-neutral-700"
              />
              {dmSearching && <div className="text-[10px] text-neutral-700">{t('Searching…', 'Recherche…')}</div>}
              {dmResults.map(p => (
                <button
                  key={p.uid}
                  onClick={() => startDM(p)}
                  className="w-full flex items-center gap-2 py-2 text-left hover:bg-white/4 transition-colors"
                >
                  <MiniAvatar name={p.displayName} photoURL={p.photoURL} size={28} />
                  <span className="text-xs text-neutral-300">{p.displayName}</span>
                </button>
              ))}
              <button onClick={() => setShowNewDM(false)} className="text-[10px] text-neutral-700 hover:text-neutral-400 transition-colors">
                {t('Cancel', 'Annuler')}
              </button>
            </div>
          )}

          {/* New Group panel */}
          {showNewGroup && (
            <div className="p-4 border-b border-white/5 space-y-2">
              <input
                autoFocus
                type="text"
                placeholder={t('Group name…', 'Nom du groupe…')}
                value={groupTitle}
                onChange={e => setGroupTitle(e.target.value)}
                className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 text-xs font-lato focus:outline-none focus:border-[#d4af37]/50 placeholder:text-neutral-700"
              />
              {groupMembers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {groupMembers.map(m => (
                    <span key={m.uid} className="text-[10px] bg-[#d4af37]/10 text-[#d4af37] px-2 py-0.5 font-cinzel flex items-center gap-1">
                      {m.displayName}
                      <button onClick={() => setGroupMembers(prev => prev.filter(p => p.uid !== m.uid))} className="hover:text-red-400">×</button>
                    </span>
                  ))}
                </div>
              )}
              <input
                type="text"
                placeholder={t('Add members…', 'Ajouter des membres…')}
                value={groupSearch}
                onChange={e => setGroupSearch(e.target.value)}
                className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 text-xs font-lato focus:outline-none focus:border-[#d4af37]/50 placeholder:text-neutral-700"
              />
              {groupResults.filter(p => !groupMembers.some(m => m.uid === p.uid)).map(p => (
                <button
                  key={p.uid}
                  onClick={() => { setGroupMembers(prev => [...prev, p]); setGroupSearch(''); setGroupResults([]); }}
                  className="w-full flex items-center gap-2 py-1 text-left hover:bg-white/4 transition-colors"
                >
                  <MiniAvatar name={p.displayName} photoURL={p.photoURL} size={24} />
                  <span className="text-xs text-neutral-300">{p.displayName}</span>
                </button>
              ))}
              <div className="flex gap-2">
                <button
                  onClick={createGroupChat}
                  disabled={!groupTitle.trim() || groupMembers.length === 0}
                  className="flex-1 py-1.5 text-[10px] font-cinzel uppercase tracking-widest bg-[#d4af37] text-black hover:bg-[#f3e5ab] disabled:opacity-30 transition-all"
                >
                  {t('Create', 'Créer')}
                </button>
                <button onClick={() => { setShowNewGroup(false); setGroupTitle(''); setGroupMembers([]); }} className="text-[10px] text-neutral-700 hover:text-neutral-400 transition-colors">
                  {t('Cancel', 'Annuler')}
                </button>
              </div>
            </div>
          )}

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && (
              <p className="text-neutral-700 text-xs font-lato p-4 text-center">
                {t('No conversations yet.', 'Aucune conversation.')}
              </p>
            )}
            {conversations.map(conv => {
              const avatar = getConvAvatar(conv, user.uid);
              const name = getConvDisplayName(conv, user.uid);
              const isActive = conv.id === activeConvId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-white/[0.03] ${
                    isActive ? 'bg-[#d4af37]/8 border-l-2 border-l-[#d4af37]/50' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <MiniAvatar name={avatar.name} photoURL={avatar.photoURL} size={34} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-cinzel text-neutral-300 truncate">{name}</p>
                    <p className="text-[10px] text-neutral-600 font-lato truncate mt-0.5">
                      {conv.lastMessage || t('No messages yet', 'Aucun message')}
                    </p>
                  </div>
                  {conv.lastMessageAt && (
                    <span className="text-[9px] text-neutral-700 shrink-0">{formatTime(conv.lastMessageAt)}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main chat area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!activeConvId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="text-4xl opacity-20">💬</div>
                <p className="text-neutral-700 text-sm font-cinzel">
                  {t('Select a conversation', 'Choisissez une conversation')}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              {activeConv && (
                <div className="border-b border-white/5 px-6 py-3 flex items-center gap-3 shrink-0">
                  {(() => {
                    const av = getConvAvatar(activeConv, user.uid);
                    const otherUid = activeConv.type === 'dm'
                      ? activeConv.members.find(u => u !== user.uid)
                      : undefined;
                    return (
                      <>
                        <MiniAvatar
                          name={av.name}
                          photoURL={av.photoURL}
                          size={32}
                          onClick={otherUid ? () => onViewProfile(otherUid) : undefined}
                        />
                        <div>
                          <p
                            className={`text-sm font-cinzel text-white ${otherUid ? 'cursor-pointer hover:text-[#d4af37] transition-colors' : ''}`}
                            onClick={otherUid ? () => onViewProfile(otherUid) : undefined}
                          >
                            {getConvDisplayName(activeConv, user.uid)}
                          </p>
                          {activeConv.type === 'group' && (
                            <p className="text-[10px] text-neutral-700 font-lato">
                              {activeConv.members.length} {t('members', 'membres')}
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.map(msg => {
                  const isMe = msg.uid === user.uid;
                  return (
                    <div key={msg.id} className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <MiniAvatar
                        name={msg.displayName}
                        photoURL={msg.photoURL}
                        size={28}
                        onClick={!isMe ? () => onViewProfile(msg.uid) : undefined}
                      />
                      <div className={`max-w-[70%] space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className="flex items-baseline gap-2">
                          {!isMe && (
                            <span
                              className="text-[10px] font-cinzel text-neutral-500 cursor-pointer hover:text-neutral-300 transition-colors"
                              onClick={() => onViewProfile(msg.uid)}
                            >
                              {msg.displayName}
                            </span>
                          )}
                          <span className="text-[9px] text-neutral-700">{formatTime(msg.createdAt)}</span>
                        </div>
                        <div className={`px-3 py-2 text-sm font-lato leading-relaxed ${
                          isMe
                            ? 'bg-[#d4af37]/15 border border-[#d4af37]/20 text-[#f3e5ab]'
                            : 'bg-[#141414] border border-white/8 text-neutral-300'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-white/5 px-4 py-3 flex items-center gap-3 shrink-0">
                <input
                  type="text"
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={t('Write a message…', 'Écrire un message…')}
                  className="flex-1 bg-[#141414] border border-white/8 text-white px-4 py-2.5 text-sm font-lato focus:outline-none focus:border-[#d4af37]/50 placeholder:text-neutral-700"
                />
                <button
                  onClick={handleSend}
                  disabled={!msgText.trim() || sending}
                  className="px-4 py-2.5 bg-[#d4af37] text-black font-cinzel text-xs uppercase tracking-widest hover:bg-[#f3e5ab] disabled:opacity-30 transition-all shrink-0"
                >
                  {t('Send', 'Envoyer')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
