import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../../firebase';

export interface CreatorStudioState {
  hasProfile: boolean;
  isStarted: boolean;
  isCompleted: boolean;
  isCuratedArtist: boolean;
  hasProProfile: boolean;
  slug?: string;
}

export async function lireEtatCreatorStudio(uid: string): Promise<CreatorStudioState> {
  if (!db) return { hasProfile: false, isStarted: false, isCompleted: false, isCuratedArtist: false, hasProProfile: false };
  
  const [profileSnap, flagsSnap, usernamesSnap] = await Promise.all([
    getDoc(doc(db, 'artistProfile', 'profile', 'users', uid)),
    getDoc(doc(db, 'members', uid, 'admin', 'flags')),
    getDocs(query(collection(db, 'usernames'), where('uid', '==', uid), limit(1)))
  ]);

  const hasProfile = profileSnap.exists();
  const profileData = profileSnap.data();
  const isCompleted = hasProfile && profileData?.onboardingV1Completed === true;
  const isStarted = hasProfile && !isCompleted;

  const flagsData = flagsSnap.exists() ? flagsSnap.data() : {};
  const isCuratedArtist = flagsData?.isArtist === true;
  
  const slug = !usernamesSnap.empty ? usernamesSnap.docs[0].id : undefined;
  const hasProProfile = (flagsData?.proEnabled === true || flagsData?.maestroEnabled === true) && !!slug;

  return {
    hasProfile,
    isStarted,
    isCompleted,
    isCuratedArtist,
    hasProProfile,
    slug
  };
}
