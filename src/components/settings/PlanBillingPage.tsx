"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import {
  AddOnConfirmationModal,
  frequencyLabel,
  PlanChangeConfirmationModal,
  PlanComparisonModal,
  type PlanChangeRequest,
} from "@/components/settings/PlanBillingModals";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  billingAddOns,
  billingPreviewAliases,
  formatBillingAddOnPrice,
  formatBillingPlanPrice,
  getBillingPlan,
  subscriptionFixtures,
  type BillingAddOn,
  type BillingFrequency,
  type BillingPlan,
  type BillingPlanId,
  type BillingPreviewState,
  type BillingUsage,
  type SubscriptionStatus,
} from "@/data/billing";

const defaultPreviewState: BillingPreviewState = "active";

export function PlanBillingPage({ embedded = false }: { embedded?: boolean }) {
  const searchParams = useSearchParams();
  const { selectedRole } = usePrototypeRole();
  const previewState = resolvePreviewState(searchParams.get("preview"));
  const fixture = subscriptionFixtures[previewState];
  const [planId, setPlanId] = useState<BillingPlanId>(fixture.planId);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>(fixture.status);
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>(fixture.billingFrequency);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [changeRequest, setChangeRequest] = useState<PlanChangeRequest | null>(null);
  const [pendingAddOn, setPendingAddOn] = useState<BillingAddOn | null>(null);
  const [addedAddOnIds, setAddedAddOnIds] = useState<Set<BillingAddOn["id"]>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const currentPlan = getBillingPlan(planId);
  const canManageBilling = fixture.canManageBilling;
  const openComparisonFromLink = searchParams.get("compare") === "plans";

  useEffect(() => {
    setPlanId(fixture.planId);
    setSubscriptionStatus(fixture.status);
    setBillingFrequency(fixture.billingFrequency);
    setComparisonOpen(false);
    setChangeRequest(null);
    setPendingAddOn(null);
    setAddedAddOnIds(new Set());
  }, [fixture]);

  useEffect(() => {
    if (openComparisonFromLink && canManageBilling) setComparisonOpen(true);
  }, [canManageBilling, openComparisonFromLink]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (selectedRole !== "Studio Staff") return null;

  const openPlanComparison = () => {
    if (!canManageBilling) return;
    setChangeRequest(null);
    setComparisonOpen(true);
  };

  const requestPlanChange = (nextPlanId: BillingPlanId, nextFrequency: BillingFrequency) => {
    setComparisonOpen(false);
    setChangeRequest({
      planId: nextPlanId,
      billingFrequency: nextFrequency,
      kind: nextPlanId === planId ? "frequency" : "plan",
    });
  };

  const confirmPlanChange = () => {
    if (!changeRequest) return;

    // Production plan changes will continue to Stripe for final financial confirmation here.
    setPlanId(changeRequest.planId);
    setBillingFrequency(changeRequest.billingFrequency);
    setSubscriptionStatus("active");
    setChangeRequest(null);
    setToast("Your plan has been updated.");
  };

  const manageBilling = () => {
    if (!canManageBilling) return;
    // Production will open a secure Stripe billing portal session at this boundary.
    setToast("Your secure Stripe billing portal would open here.");
  };

  const confirmAddOn = () => {
    if (!pendingAddOn) return;
    setAddedAddOnIds((current) => new Set([...current, pendingAddOn.id]));
    setToast(`${pendingAddOn.name} has been added to this prototype.`);
    setPendingAddOn(null);
  };

  return (
    <main className={`plan-billing-page ${embedded ? "is-embedded" : ""}`}>
      {embedded ? null : <header className="plan-billing-header">
        <div className="plan-billing-header-inner">
          <span className="label-xs-semibold">Studio settings</span>
          <h1 className="headings-m-bold">Plan &amp; billing</h1>
          <p className="paragraph-s">Manage your Brisk plan, usage and billing details.</p>
        </div>
      </header>}

      <div className="plan-billing-content">
        {subscriptionStatus === "overdue" ? (
          <BillingAlert
            type="warning"
            title="Payment overdue"
            body="We couldn’t process your latest payment. Manage billing securely through Stripe to keep your Studio’s paid features active."
            action={canManageBilling ? <Button size="M" onClick={manageBilling}>Manage billing</Button> : null}
          />
        ) : null}

        {subscriptionStatus === "trial" ? (
          <BillingAlert
            type="info"
            title={`${currentPlan.name} trial`}
            body={`Your Professional trial ends in ${fixture.trialDaysRemaining ?? 0} days.`}
            action={canManageBilling ? <Button size="M" variant="secondary" onClick={openPlanComparison}>Compare plans</Button> : null}
          />
        ) : null}

        {!canManageBilling ? (
          <BillingAlert
            type="permission"
            title="Billing changes are restricted"
            body="Only your Studio’s billing admin can change the plan or manage the billing account."
            action={null}
          />
        ) : null}

        <CurrentPlanCard
          billingFrequency={billingFrequency}
          canManageBilling={canManageBilling}
          nextRenewal={fixture.nextRenewal}
          plan={currentPlan}
          status={subscriptionStatus}
          trialDaysRemaining={fixture.trialDaysRemaining}
          trialEndDate={fixture.trialEndDate}
          onChangePlan={openPlanComparison}
        />

        <div className="plan-billing-two-column">
          <UsageCard
            canManageBilling={canManageBilling}
            plan={currentPlan}
            usage={fixture.usage}
            onViewUpgrades={openPlanComparison}
          />
          <BillingAccountCard canManageBilling={canManageBilling} onManageBilling={manageBilling} />
        </div>

        <AddOnsCard
          addedAddOnIds={addedAddOnIds}
          canManageBilling={canManageBilling}
          planId={planId}
          onAdd={setPendingAddOn}
          onViewRequiredPlan={openPlanComparison}
        />

      </div>

      {comparisonOpen ? (
        <PlanComparisonModal
          currentPlanId={planId}
          currentFrequency={billingFrequency}
          onChoose={requestPlanChange}
          onClose={() => setComparisonOpen(false)}
          onContactSales={() => {
            setComparisonOpen(false);
            setToast("A conversation with Brisk sales would start here.");
          }}
        />
      ) : null}

      {changeRequest ? (
        <PlanChangeConfirmationModal
          currentPlanId={planId}
          effectiveDate={fixture.effectiveDate}
          request={changeRequest}
          onBack={() => {
            setChangeRequest(null);
            setComparisonOpen(true);
          }}
          onClose={() => setChangeRequest(null)}
          onConfirm={confirmPlanChange}
        />
      ) : null}

      {pendingAddOn ? (
        <AddOnConfirmationModal addOn={pendingAddOn} onClose={() => setPendingAddOn(null)} onConfirm={confirmAddOn} />
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

function BillingAlert({
  action,
  body,
  title,
  type,
}: {
  action: React.ReactNode;
  body: string;
  title: string;
  type: "warning" | "info" | "permission";
}) {
  return (
    <section className={`billing-alert is-${type}`} aria-label={title}>
      <span className="billing-alert-icon"><DsIcon name={type === "warning" ? "alert-triangle" : type === "permission" ? "lock" : "info"} size={20} /></span>
      <div>
        <strong className="label-m-semibold">{title}</strong>
        <p className="paragraph-s">{body}</p>
      </div>
      {action ? <div className="billing-alert-action">{action}</div> : null}
    </section>
  );
}

function CurrentPlanCard({
  billingFrequency,
  canManageBilling,
  nextRenewal,
  onChangePlan,
  plan,
  status,
  trialDaysRemaining,
  trialEndDate,
}: {
  billingFrequency: BillingFrequency;
  canManageBilling: boolean;
  nextRenewal: string;
  onChangePlan: () => void;
  plan: BillingPlan;
  status: SubscriptionStatus;
  trialDaysRemaining?: number;
  trialEndDate?: string;
}) {
  return (
    <section className="billing-current-plan billing-section-card" aria-labelledby="current-plan-heading">
      <div className="billing-current-plan-main">
        <div className="billing-section-heading">
          <span className="label-xs-semibold">Current plan</span>
          <div className="billing-current-plan-title">
            <h2 className="headings-m-bold" id="current-plan-heading">{plan.name}{status === "trial" ? " trial" : ""}</h2>
            <span className={`billing-status-pill is-${status} label-xs-semibold`}>{statusLabel(status)}</span>
          </div>
          <p className="paragraph-s">{plan.target}</p>
        </div>

        <div className="billing-current-price">
          <strong className="headings-s-bold">{currentPrice(plan, billingFrequency)}</strong>
          <span className="label-s">{frequencyLabel(billingFrequency)} billing</span>
        </div>
      </div>

      <dl className="billing-current-meta">
        <div><dt className="label-xs">Billing frequency</dt><dd className="label-m-semibold">{frequencyLabel(billingFrequency)}</dd></div>
        {status === "trial" ? (
          <>
            <div><dt className="label-xs">Days remaining</dt><dd className="label-m-semibold">{trialDaysRemaining}</dd></div>
            <div><dt className="label-xs">Trial end date</dt><dd className="label-m-semibold">{trialEndDate}</dd></div>
          </>
        ) : (
          <div><dt className="label-xs">Next renewal</dt><dd className="label-m-semibold">{nextRenewal}</dd></div>
        )}
      </dl>

      {canManageBilling ? (
        <div className="billing-card-actions">
          <Button size="M" onClick={onChangePlan}>{status === "trial" ? "Compare plans" : "Change plan"}</Button>
        </div>
      ) : null}
    </section>
  );
}

function UsageCard({
  canManageBilling,
  onViewUpgrades,
  plan,
  usage,
}: {
  canManageBilling: boolean;
  onViewUpgrades: () => void;
  plan: BillingPlan;
  usage: BillingUsage;
}) {
  const projectLimit = plan.limits.activeProjects.value;
  const approachingProjectLimit = projectLimit !== null && usage.activeProjects / projectLimit >= 0.8;

  return (
    <section className="billing-section-card billing-usage-card" aria-labelledby="billing-usage-heading">
      <div className="billing-section-heading">
        <h2 className="headings-xs-bold" id="billing-usage-heading">Usage</h2>
        <p className="paragraph-s">Your current Studio allowance.</p>
      </div>
      <div className="billing-usage-list">
        <UsageMeter label="Studio Staff" value={usage.studioStaff} limit={plan.limits.users.value} limitLabel={plan.limits.users.label} />
        <UsageMeter label="Active projects" value={usage.activeProjects} limit={projectLimit} limitLabel={plan.limits.activeProjects.label} warning={approachingProjectLimit} />
        <UsageMeter label="Storage" value={usage.storageGb} limit={plan.limits.storage.value} limitLabel={plan.limits.storage.label} valueLabel={`${usage.storageGb} GB`} />
      </div>
      {approachingProjectLimit ? (
        <div className="billing-usage-warning">
          <span><DsIcon name="alert-triangle" size={16} /></span>
          <p className="label-s-semibold">You’re approaching your active project limit.</p>
          {canManageBilling ? <Button size="S" variant="secondary" onClick={onViewUpgrades}>View upgrade options</Button> : null}
        </div>
      ) : null}
    </section>
  );
}

function UsageMeter({
  label,
  limit,
  limitLabel,
  value,
  valueLabel,
  warning = false,
}: {
  label: string;
  limit: number | null;
  limitLabel: string;
  value: number;
  valueLabel?: string;
  warning?: boolean;
}) {
  if (limit === null) {
    return (
      <div className="billing-usage-item">
        <div className="billing-usage-copy">
          <span className="label-s-semibold">{label}</span>
          <span className="label-s">{valueLabel ?? value} used - {limitLabel}</span>
        </div>
        <span className="billing-unlimited-badge label-xs-semibold">Unlimited</span>
      </div>
    );
  }

  const percentage = Math.min((value / limit) * 100, 100);
  const displayValue = valueLabel ?? value;

  return (
    <div className={`billing-usage-item ${warning ? "is-warning" : ""}`}>
      <div className="billing-usage-copy">
        <span className="label-s-semibold">{label}</span>
        <span className="label-s">{displayValue} of {limitLabel}</span>
      </div>
      <div
        className="billing-progress-track"
        role="progressbar"
        aria-label={`${label}: ${displayValue} of ${limitLabel}`}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={value}
      >
        <span style={{ "--billing-progress-width": `${percentage}%` } as CSSProperties} />
      </div>
    </div>
  );
}

function BillingAccountCard({
  canManageBilling,
  onManageBilling,
}: {
  canManageBilling: boolean;
  onManageBilling: () => void;
}) {
  return (
    <section className="billing-section-card billing-account-card" aria-labelledby="billing-account-heading">
      <div className="billing-section-heading billing-section-heading-row">
        <div>
          <h2 className="headings-xs-bold" id="billing-account-heading">Billing account</h2>
          <p className="paragraph-s">Payment methods, invoices and subscription settings are managed securely through Stripe.</p>
        </div>
        {canManageBilling ? <Button size="M" onClick={onManageBilling}>Manage billing</Button> : null}
      </div>
    </section>
  );
}

function AddOnsCard({
  addedAddOnIds,
  canManageBilling,
  onAdd,
  onViewRequiredPlan,
  planId,
}: {
  addedAddOnIds: Set<BillingAddOn["id"]>;
  canManageBilling: boolean;
  onAdd: (addOn: BillingAddOn) => void;
  onViewRequiredPlan: () => void;
  planId: BillingPlanId;
}) {
  return (
    <section className="billing-section-card" aria-labelledby="billing-add-ons-heading">
      <div className="billing-section-heading">
        <h2 className="headings-xs-bold" id="billing-add-ons-heading">Add-ons</h2>
        <p className="paragraph-s">Optional additions for your Brisk subscription.</p>
      </div>
      <div className="billing-add-on-grid">
        {billingAddOns.map((addOn) => {
          const included = addOn.includedPlanIds?.includes(planId) ?? false;
          const available = addOn.availablePlanIds.includes(planId);
          const added = addedAddOnIds.has(addOn.id);
          return (
            <article className={`billing-add-on ${!available ? "is-locked" : ""}`} key={addOn.id}>
              <div>
                <h3 className="label-m-semibold">{addOn.name}</h3>
                {!included ? <strong className="label-s-semibold">{formatBillingAddOnPrice(addOn)}</strong> : null}
                <p className="paragraph-s">{addOn.description}</p>
              </div>
              {included ? (
                <span className="billing-included-badge label-xs-semibold">Included in your plan</span>
              ) : !available ? (
                canManageBilling ? <Button size="S" variant="secondary" onClick={onViewRequiredPlan}>View {addOn.requiredPlanLabel ?? "plan"}</Button> : <span className="billing-locked-badge label-xs-semibold">{addOn.requiredPlanLabel ?? "Higher plan"}</span>
              ) : added ? (
                <button className="billing-disabled-button label-s-semibold" type="button" disabled>Added</button>
              ) : canManageBilling ? (
                <Button size="S" variant="secondary" onClick={() => onAdd(addOn)}>Add</Button>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function resolvePreviewState(preview: string | null): BillingPreviewState {
  if (!preview) return defaultPreviewState;
  return billingPreviewAliases[preview] ?? defaultPreviewState;
}

function statusLabel(status: SubscriptionStatus) {
  if (status === "overdue") return "Payment overdue";
  if (status === "cancelling") return "Cancelling";
  if (status === "trial") return "Trial";
  return "Active";
}

function currentPrice(plan: BillingPlan, frequency: BillingFrequency) {
  return formatBillingPlanPrice(plan, frequency);
}
