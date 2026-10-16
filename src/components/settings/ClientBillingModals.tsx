"use client";

import { ConfirmationDialog } from "../../../Brisk DS/src/app/components/ConfirmationDialog";


import { Button } from "../../../Brisk DS/src/app/components/Button";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { DsIcon } from "@/components/video-review/DsIcon";

export function ConnectStripeModal({
  connecting,
  onClose,
  onContinue,
}: {
  connecting: boolean;
  onClose: () => void;
  onContinue: () => void;
}) {
  if (connecting) {
    return (
      <ClientModal
        className="billing-modal billing-confirmation-modal client-billing-modal"
        title="Connecting to Stripe"
        description="Setting up the secure hand-off to Stripe."
        onClose={() => undefined}
        footer={(
          <Button size="S" variant="secondary"  type="button" disabled>
            <DsIcon name="arrows-clockwise" size={16} />
            Connecting to Stripe
          </Button>
        )}
      >
        <p className="paragraph-s">This prototype will return with a mocked connected account.</p>
      </ClientModal>
    );
  }

  return (
    <ClientModal
      className="billing-modal billing-confirmation-modal client-billing-modal"
      title="Connect your Stripe account"
      onClose={onClose}
      footer={(
        <>
          <Button size="S" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="S" onClick={onContinue}>Continue to Stripe</Button>
        </>
      )}
    >
      <div className="client-billing-modal-copy">
        <p className="paragraph-s">You’ll complete setup securely with Stripe. Products, subscriptions, invoices and payments stay in your Studio’s Stripe account.</p>
        <div className="client-billing-security-note">
          <DsIcon name="lock" size={18} />
          <span className="label-s-semibold">Brisk never stores Client card details or holds Client funds.</span>
        </div>
      </div>
    </ClientModal>
  );
}

export function DisconnectStripeModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmationDialog title="Disconnect Stripe?" onCancel={onClose} actions={(
        <>
          <Button size="S" variant="secondary" onClick={onClose}>Keep connected</Button>
          <Button size="S" variant="danger"  type="button" onClick={onConfirm}>Disconnect Stripe</Button>
        </>
      )}> <p className="paragraph-s">Brisk will remove its connection to Stripe. Your Stripe products, subscriptions, invoices and payments will remain in Stripe.</p> </ConfirmationDialog>
  );
}
