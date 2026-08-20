"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { ActionMenu } from "@/components/brand-kits/AssetManagement";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import {
  ConnectStripeModal,
  DisconnectStripeModal,
} from "@/components/settings/ClientBillingModals";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  clientBillingFixtures,
  clientBillingOptions,
  clientBillingPreviewAliases,
  stripeAccountFixture,
  type ClientBillingMethod,
  type ClientBillingPreviewState,
  type StripeConnectionStatus,
} from "@/data/client-billing";

const defaultPreviewState: ClientBillingPreviewState = "unselected";

export function ClientBillingPage({ embedded = false }: { embedded?: boolean }) {
  const searchParams = useSearchParams();
  const { selectedRole } = usePrototypeRole();
  const previewState = resolvePreviewState(searchParams.get("preview"));
  const fixture = clientBillingFixtures[previewState];
  const [method, setMethod] = useState<ClientBillingMethod>(fixture.method);
  const [stripeStatus, setStripeStatus] = useState<StripeConnectionStatus>(fixture.stripeStatus);
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const canManageClientBilling = fixture.canManageClientBilling;

  useEffect(() => {
    setMethod(fixture.method);
    setStripeStatus(fixture.stripeStatus);
    setStripeModalOpen(false);
    setStripeConnecting(false);
    setDisconnectModalOpen(false);
    setToast(null);
  }, [fixture]);

  useEffect(() => {
    if (!stripeConnecting) return;
    const timeout = window.setTimeout(() => {
      setMethod("stripe");
      setStripeStatus("connected");
      setStripeConnecting(false);
      setStripeModalOpen(false);
      setToast("Stripe has been connected.");
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [stripeConnecting]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (selectedRole !== "Studio Staff") return null;

  const openStripeConnection = () => {
    if (!canManageClientBilling) return;
    setStripeModalOpen(true);
  };

  const continueToStripe = () => {
    // Production will redirect to Stripe Connect and persist the verified connection state here.
    setStripeConnecting(true);
  };

  const selectIndependentBilling = () => {
    setMethod("independent");
    setStripeStatus("not-connected");
    setToast("Client billing will be managed outside Brisk.");
  };

  const confirmStripeDisconnect = () => {
    // Production will remove Brisk's Stripe connection without changing anything stored in Stripe.
    setMethod("unselected");
    setStripeStatus("disconnected");
    setDisconnectModalOpen(false);
    setToast("Stripe has been disconnected. Your Stripe billing remains unchanged.");
  };

  const openStripeDashboard = () => {
    // Production will request a secure Stripe dashboard link at this boundary.
    setToast("Your Stripe dashboard would open here.");
  };

  const showChoices = method === "unselected" || stripeStatus === "disconnected";
  const showConnected = method === "stripe" && stripeStatus === "connected";
  const showActionRequired = method === "stripe" && stripeStatus === "action-required";

  return (
    <main className={`plan-billing-page client-billing-page ${embedded ? "is-embedded" : ""}`}>
      {embedded ? null : <header className="plan-billing-header">
        <div className="plan-billing-header-inner">
          <span className="label-xs-semibold">Studio settings</span>
          <h1 className="headings-m-bold">Client billing</h1>
          <p className="paragraph-s">Choose how your Studio invoices and collects payments from Clients.</p>
        </div>
      </header>}

      <div className="plan-billing-content client-billing-content">
        {!canManageClientBilling ? (
          <section className="billing-alert is-permission" aria-label="Billing changes are restricted">
            <span className="billing-alert-icon"><DsIcon name="lock" size={20} /></span>
            <div>
              <strong className="label-m-semibold">Billing changes are restricted</strong>
              <p className="paragraph-s">Only your Studio’s billing admin can change how Client billing is managed.</p>
            </div>
          </section>
        ) : null}

        {stripeStatus === "disconnected" ? (
          <section className="billing-alert is-info" aria-label="Stripe disconnected">
            <span className="billing-alert-icon"><DsIcon name="info" size={20} /></span>
            <div>
              <strong className="label-m-semibold">Stripe disconnected</strong>
              <p className="paragraph-s">Brisk is no longer connected to Stripe. Choose how your Studio will manage Client billing.</p>
            </div>
          </section>
        ) : null}

        {showActionRequired ? (
          <section className="billing-alert is-warning client-billing-action-alert" aria-label="Stripe connection needs attention">
            <span className="billing-alert-icon"><DsIcon name="alert-triangle" size={20} /></span>
            <div>
              <strong className="label-m-semibold">Stripe connection needs attention</strong>
              <p className="paragraph-s">Reconnect Stripe to restore access from Brisk. Your billing information remains safely stored in Stripe.</p>
            </div>
            {canManageClientBilling ? (
              <div className="billing-alert-action client-billing-alert-actions">
                <Button size="M" onClick={openStripeConnection}>Reconnect Stripe</Button>
                <Button size="M" variant="secondary" onClick={selectIndependentBilling}>Manage billing outside Brisk</Button>
              </div>
            ) : null}
          </section>
        ) : null}

        {showChoices ? (
          <section className="client-billing-choice" aria-labelledby="client-billing-choice-heading">
            <div className="billing-section-heading">
              <h2 className="headings-xs-bold" id="client-billing-choice-heading">Choose a billing method</h2>
              <p className="paragraph-s">Both options keep Client billing separate from your Brisk subscription and production workflow.</p>
            </div>
            <div className="client-billing-option-grid">
              {clientBillingOptions.map((option) => (
                <article className="billing-section-card client-billing-option" key={option.id}>
                  <div className="client-billing-option-heading">
                    <span className="client-billing-option-icon"><DsIcon name={option.id === "stripe" ? "link" : "file-text"} size={20} /></span>
                    <div>
                      <h2 className="headings-xs-bold">{option.title}</h2>
                      <p className="paragraph-s">{option.description}</p>
                    </div>
                  </div>
                  <ul className="client-billing-points">
                    {option.points.map((point) => (
                      <li className="label-s" key={point}><DsIcon name="check" size={14} />{point}</li>
                    ))}
                  </ul>
                  {canManageClientBilling ? (
                    <div className="client-billing-option-action">
                      <Button
                        size="M"
                        onClick={option.id === "stripe" ? openStripeConnection : selectIndependentBilling}
                      >
                        {option.id === "stripe" && stripeStatus === "disconnected" ? "Reconnect Stripe" : option.actionLabel}
                      </Button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {method === "independent" ? (
          <section className="billing-section-card client-billing-selected-card" aria-labelledby="independent-billing-heading">
            <div className="client-billing-selected-header">
              <div className="client-billing-option-heading">
                <span className="client-billing-option-icon"><DsIcon name="file-text" size={20} /></span>
                <div>
                  <h2 className="headings-xs-bold" id="independent-billing-heading">Billing managed outside Brisk</h2>
                  <p className="paragraph-s">Use your preferred invoicing and accounting tools. Nothing needs to be set up in Brisk.</p>
                </div>
              </div>
              <span className="billing-status-pill client-billing-current-method-pill label-xs-semibold">Current method</span>
            </div>
            <div className="client-billing-boundary-note">
              <DsIcon name="check-circle" size={18} />
              <span className="label-s-semibold">No Client billing information is stored in Brisk.</span>
            </div>
            {canManageClientBilling ? (
              <div className="billing-card-actions">
                <Button size="M" onClick={openStripeConnection}>Connect Stripe instead</Button>
              </div>
            ) : null}
          </section>
        ) : null}

        {showConnected ? (
          <section className="billing-section-card client-billing-selected-card client-billing-stripe-card" aria-labelledby="stripe-connected-heading">
            <div className="client-billing-selected-header">
              <div className="client-billing-option-heading">
                <span className="client-billing-option-icon"><DsIcon name="link" size={20} /></span>
                <div>
                  <h2 className="headings-xs-bold" id="stripe-connected-heading">Stripe connected</h2>
                  <p className="paragraph-s">Client billing is managed in your Studio’s Stripe account.</p>
                </div>
              </div>
              <span className="billing-status-pill is-active label-xs-semibold">Connected</span>
            </div>

            {canManageClientBilling ? (
              <>
                <dl className="client-billing-connection-details">
                  <div><dt className="label-xs">Connected business</dt><dd className="label-m-semibold">{stripeAccountFixture.businessName}</dd></div>
                  <div><dt className="label-xs">Account email</dt><dd className="label-m-semibold">{stripeAccountFixture.accountEmail}</dd></div>
                </dl>
                <div className="billing-card-actions client-billing-connected-actions">
                  <Button size="M" onClick={openStripeDashboard}>Open Stripe dashboard</Button>
                  <ActionMenu
                    label="More Stripe actions"
                    items={[{
                      label: "Disconnect Stripe",
                      destructive: true,
                      onSelect: () => setDisconnectModalOpen(true),
                    }]}
                  />
                </div>
              </>
            ) : null}
          </section>
        ) : null}
      </div>

      {stripeModalOpen ? (
        <ConnectStripeModal
          connecting={stripeConnecting}
          onClose={() => setStripeModalOpen(false)}
          onContinue={continueToStripe}
        />
      ) : null}

      {disconnectModalOpen ? (
        <DisconnectStripeModal onClose={() => setDisconnectModalOpen(false)} onConfirm={confirmStripeDisconnect} />
      ) : null}

      {toast ? (
        <div className="billing-toast label-s-semibold" role="status">
          <DsIcon name="check-circle" size={16} />
          {toast}
        </div>
      ) : null}
    </main>
  );
}

function resolvePreviewState(preview: string | null): ClientBillingPreviewState {
  if (!preview) return defaultPreviewState;
  return clientBillingPreviewAliases[preview] ?? defaultPreviewState;
}
