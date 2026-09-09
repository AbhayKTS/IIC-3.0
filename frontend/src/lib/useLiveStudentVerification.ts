import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { IdVerificationData } from '@/lib/types';

export type LiveVerificationStatus = 'verified' | 'pending' | 'rejected' | 'unverified';

export interface LiveVerificationState {
  isLoaded: boolean;
  status: LiveVerificationStatus;
  userDoc: any | null;
  idVerification: IdVerificationData | null;
  verificationStatus: string | null;
}

export function useLiveStudentVerification(uid: string | undefined): LiveVerificationState {
  const [userDoc, setUserDoc] = useState<any | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!uid) {
      setIsLoaded(true);
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          setUserDoc(snap.data());
        }
        setIsLoaded(true);
      },
      (err) => {
        console.warn('[useLiveStudentVerification] Live listener warning:', err);
        setIsLoaded(true);
      }
    );

    return () => unsub();
  }, [uid]);

  const idVer = userDoc?.idVerification as IdVerificationData | undefined;
  const idStatus = idVer?.status;
  const rawStatus = userDoc?.verificationStatus;

  let status: LiveVerificationStatus = 'unverified';

  if (
    rawStatus === 'verified' ||
    rawStatus === 'VERIFIED' ||
    idStatus === 'VERIFIED' ||
    idStatus === 'verified'
  ) {
    status = 'verified';
  } else if (
    rawStatus === 'pending' ||
    idStatus === 'pending' ||
    idStatus === 'pending_review' ||
    idStatus === 'REQUIRES_REVIEW'
  ) {
    status = 'pending';
  } else if (
    rawStatus === 'rejected' ||
    idStatus === 'rejected' ||
    idStatus === 'FAILED'
  ) {
    status = 'rejected';
  } else {
    status = 'unverified';
  }

  return {
    isLoaded,
    status,
    userDoc,
    idVerification: idVer || null,
    verificationStatus: rawStatus || null,
  };
}
