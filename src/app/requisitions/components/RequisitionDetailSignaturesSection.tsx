'use client';

import React, { useState } from 'react';
import RequisitionSignaturesGrid from './RequisitionSignaturesGrid';
import RequisitionStoreSignModal from './RequisitionStoreSignModal';
import RequisitionTransportSignModal from './RequisitionTransportSignModal';
import RequisitionAccountingSignModal from './RequisitionAccountingSignModal';
import SiteHandoverModal from './SiteHandoverModal';
import type { RequisitionSignatureRecord } from './signaturePadHelper';

interface RequisitionDetailSignaturesSectionProps {
  initialRequisition: RequisitionSignatureRecord;
  currentUserName?: string;
  canSignStore?: boolean;
  canSignAccounting?: boolean;
  canSignTransport?: boolean;
  canSignReceiver?: boolean;
  isAccountingUser?: boolean;
  isTransportUser?: boolean;
  savedStoreSignatureUrl?: string | null;
  savedAccountingSignatureUrl?: string | null;
  savedTransportSignatureUrl?: string | null;
}

export default function RequisitionDetailSignaturesSection({
  initialRequisition,
  currentUserName = '',
  canSignStore = false,
  canSignAccounting = false,
  canSignTransport = true,
  canSignReceiver = true,
  isAccountingUser = false,
  isTransportUser = false,
  savedStoreSignatureUrl = null,
  savedAccountingSignatureUrl = null,
  savedTransportSignatureUrl = null,
}: RequisitionDetailSignaturesSectionProps) {
  const [localPatch, setLocalPatch] = useState<Partial<RequisitionSignatureRecord>>({});
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isTransportOpen, setIsTransportOpen] = useState(false);
  const [isAccountingOpen, setIsAccountingOpen] = useState(false);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);

  const requisition: RequisitionSignatureRecord = {
    ...initialRequisition,
    ...localPatch,
  };

  return (
    <>
      <RequisitionSignaturesGrid
        requisition={requisition}
        canSignStore={canSignStore}
        canSignAccounting={canSignAccounting}
        canSignTransport={canSignTransport}
        canSignReceiver={canSignReceiver}
        onClickStoreSign={() => setIsStoreOpen(true)}
        onClickAccountingSign={() => setIsAccountingOpen(true)}
        onClickTransportSign={() => setIsTransportOpen(true)}
        onClickReceiverSign={() => setIsHandoverOpen(true)}
      />

      <RequisitionStoreSignModal
        requisition={requisition}
        isOpen={isStoreOpen}
        onClose={() => setIsStoreOpen(false)}
        currentUserName={currentUserName}
        savedStoreSignatureUrl={savedStoreSignatureUrl}
        onSuccess={(payload) => {
          setLocalPatch((prev) => ({ ...prev, ...payload }));
        }}
      />

      <RequisitionTransportSignModal
        requisition={requisition}
        isOpen={isTransportOpen}
        onClose={() => setIsTransportOpen(false)}
        currentUserName={currentUserName}
        isTransportUser={isTransportUser}
        savedTransportSignatureUrl={savedTransportSignatureUrl}
        onSuccess={(payload) => {
          setLocalPatch((prev) => ({ ...prev, ...payload }));
        }}
      />

      <RequisitionAccountingSignModal
        requisition={requisition}
        isOpen={isAccountingOpen}
        onClose={() => setIsAccountingOpen(false)}
        currentUserName={currentUserName}
        isAccountingUser={isAccountingUser}
        savedAccountingSignatureUrl={savedAccountingSignatureUrl}
        onSuccess={(payload) => {
          setLocalPatch((prev) => ({ ...prev, ...payload }));
        }}
      />

      <SiteHandoverModal
        requisition={requisition}
        isOpen={isHandoverOpen}
        onClose={() => setIsHandoverOpen(false)}
      />
    </>
  );
}
