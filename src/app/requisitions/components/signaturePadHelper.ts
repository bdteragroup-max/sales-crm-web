import { useSyncExternalStore } from 'react';
import type React from 'react';
import type SignatureCanvas from 'react-signature-canvas';

export interface RequisitionSignatureRecord {
  id: string;
  requisitionNumber?: string;
  status: string;
  requisitionType?: string | null;
  requesterId?: string | null;
  requester?: { fullName?: string | null } | null;
  requesterName?: string | null;
  requesterSignatureUrl?: string | null;
  approverId?: string | null;
  approver?: { fullName?: string | null } | null;
  approverName?: string | null;
  approverSignatureUrl?: string | null;
  storeStaffName?: string | null;
  storeStaffSignatureUrl?: string | null;
  dispensedAt?: string | Date | null;
  receiverName?: string | null;
  receiverSignatureUrl?: string | null;
  receivedAt?: string | Date | null;
  transportId?: string | null;
  transportName?: string | null;
  transportType?: string | null;
  transportCompany?: string | null;
  transportSignatureUrl?: string | null;
  transportSignedAt?: string | Date | null;
  accountingId?: string | null;
  accountingName?: string | null;
  accountingSignatureUrl?: string | null;
  accountingSignedAt?: string | Date | null;
}

const emptySubscribe = () => () => {};

/** Client mount detector safe under React 19 `react-hooks/set-state-in-effect`. */
export function useIsPortalClientReady(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/** Reads the cached personal signature URL from localStorage on the client safely. */
export function readCachedUserSignature(): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem('crm_user_signature') : null;
  } catch {
    return null;
  }
}

/**
 * Calibrates a `react-signature-canvas` internal backing buffer to match its responsive CSS size & devicePixelRatio.
 * Prevents cursor-stroke offset and preserves existing strokes across mobile/desktop resizes.
 */
export function calibrateSignaturePad(
  padRef: React.RefObject<SignatureCanvas | null>
): void {
  const pad = padRef.current;
  if (!pad) return;
  const canvas: HTMLCanvasElement | null = pad.getCanvas?.();
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  const targetW = Math.round(rect.width * dpr);
  const targetH = Math.round(rect.height * dpr);

  if (canvas.width !== targetW || canvas.height !== targetH) {
    const wasEmpty = pad.isEmpty();
    const data = !wasEmpty ? pad.toData() : null;
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    pad.clear();
    if (data && data.length > 0) {
      try {
        pad.fromData(data);
      } catch {
        // ignore restore errors across resize
      }
    }
  }
}

/**
 * Extracts a clean trimmed PNG data URL from a `react-signature-canvas` ref, or null if empty.
 */
export function extractSignatureDataUrlFromPad(
  padRef: React.RefObject<SignatureCanvas | null>
): string | null {
  const pad = padRef.current;
  if (!pad || pad.isEmpty()) return null;
  try {
    return pad.getTrimmedCanvas().toDataURL('image/png');
  } catch {
    try {
      return pad.getCanvas().toDataURL('image/png');
    } catch {
      return null;
    }
  }
}
