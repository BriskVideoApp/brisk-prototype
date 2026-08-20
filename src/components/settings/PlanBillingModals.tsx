"use client";

import { useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  billingPlans,
  formatBillingAddOnPrice,
  formatBillingAnnualPrice,
  formatBillingMonthlyPrice,
  formatBillingPlanPrice,
  formatBillingTypicalRange,
  getBillingPlan,
  type BillingAddOn,
  type BillingFrequency,
  type BillingPlan,
  type BillingPlanId,
} from "@/data/billing";

export type PlanChangeRequest = {
  planId: BillingPlanId;
  billingFrequency: BillingFrequency;
  kind: "plan" | "frequency";
};

export function PlanComparisonModal({
  currentPlanId,
  currentFrequency,
  onChoose,
  onClose,
  onContactSales,
}: {
  currentPlanId: BillingPlanId;
  currentFrequency: BillingFrequency;
  onChoose: (planId: BillingPlanId, billingFrequency: BillingFrequency) => void;
  onClose: () => void;
  onContactSales: () => void;
}) {
  const [billingFrequency, setBillingFrequency] = useState(currentFrequency);

  return (
    <ClientModal
      className="billing-modal billing-plan-modal"
      title="Compare Brisk plans"
      description="Choose the plan and billing frequency that fit your Studio."
      onClose={onClose}
      footer={<Button size="M" variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="billing-modal-frequency" role="group" aria-label="Billing frequency for plan change">
        <button
          className={`label-s-semibold ${billingFrequency === "monthly" ? "is-selected" : ""}`}
          type="button"
          aria-pressed={billingFrequency === "monthly"}
          onClick={() => setBillingFrequency("monthly")}
        >
          Monthly
        </button>
        <button
          className={`label-s-semibold ${billingFrequency === "annual" ? "is-selected" : ""}`}
          type="button"
          aria-pressed={billingFrequency === "annual"}
          onClick={() => setBillingFrequency("annual")}
        >
          Annual
        </button>
      </div>

      <div className="billing-plan-grid">
        {billingPlans.map((plan) => (
          <PlanComparisonCard
            billingFrequency={billingFrequency}
            currentPlan={plan.id === currentPlanId}
            currentSelection={plan.id === currentPlanId && billingFrequency === currentFrequency}
            key={plan.id}
            plan={plan}
            onChoose={() => onChoose(plan.id, billingFrequency)}
            onContactSales={onContactSales}
          />
        ))}
      </div>
    </ClientModal>
  );
}

function PlanComparisonCard({
  billingFrequency,
  currentPlan,
  currentSelection,
  onChoose,
  onContactSales,
  plan,
}: {
  billingFrequency: BillingFrequency;
  currentPlan: boolean;
  currentSelection: boolean;
  onChoose: () => void;
  onContactSales: () => void;
  plan: BillingPlan;
}) {
  return (
    <article className={`billing-plan-option ${currentPlan ? "is-current" : ""}`}>
      <header>
        <div>
          <h3 className="headings-xs-bold">{plan.name}</h3>
          {currentPlan ? <span className="billing-current-badge label-xs-semibold">Current plan</span> : null}
        </div>
        <p className="paragraph-s">{plan.target}</p>
      </header>

      <div className="billing-plan-pricing">
        {plan.pricing.monthlyUsd !== null && plan.pricing.annualEffectiveMonthlyUsd !== null && plan.pricing.annualTotalUsd !== null ? (
          <>
            <p><span className="label-xs-semibold">Monthly</span><strong className="label-m-semibold">{formatBillingMonthlyPrice(plan.pricing.monthlyUsd)}</strong></p>
            <p><span className="label-xs-semibold">Annual</span><strong className="label-m-semibold">{formatBillingAnnualPrice(plan.pricing.annualEffectiveMonthlyUsd, plan.pricing.annualTotalUsd)}</strong></p>
          </>
        ) : (
          <>
            <strong className="headings-xs-bold">{plan.pricing.customLabel}</strong>
            <span className="label-s">Typical range {formatBillingTypicalRange(plan)}</span>
          </>
        )}
      </div>

      <dl className="billing-plan-limits">
        <div><dt className="label-xs">Users</dt><dd className="label-s-semibold">{plan.limits.users.label}</dd></div>
        <div><dt className="label-xs">Active projects</dt><dd className="label-s-semibold">{plan.limits.activeProjects.label}</dd></div>
        <div><dt className="label-xs">Storage</dt><dd className="label-s-semibold">{plan.limits.storage.label}</dd></div>
        <div><dt className="label-xs">Client access</dt><dd className="label-s-semibold">{plan.clientPortal.access}</dd></div>
      </dl>

      <div className="billing-plan-portal">
        <span className="label-xs-semibold">Client portal</span>
        <p className="label-s">{plan.clientPortal.collaboration}</p>
        <ul>
          {plan.clientPortal.branding.map((treatment) => (
            <li className="label-xs" key={treatment}><DsIcon name="check" size={14} />{treatment}</li>
          ))}
        </ul>
      </div>

      <div className="billing-plan-features">
        <span className="label-xs-semibold">{plan.featureIntroduction}</span>
        <ul>
          {plan.features.slice(0, 5).map((feature) => (
            <li className="label-s" key={feature}><DsIcon name="check" size={14} />{feature}</li>
          ))}
        </ul>
      </div>

      <div className="billing-plan-treatment">
        <span className="label-xs-semibold">{plan.trial.label}</span>
        <span className="label-xs">{plan.onboarding ?? plan.support}</span>
      </div>

      <div className="billing-plan-option-action">
        {currentSelection ? (
          <button className="billing-disabled-button label-s-semibold" type="button" disabled>Current plan</button>
        ) : plan.selfService ? (
          <Button size="M" variant="secondary" onClick={onChoose}>{plan.actionLabel}</Button>
        ) : (
          <Button size="M" variant="secondary" onClick={onContactSales}>Contact sales</Button>
        )}
        {!currentSelection && plan.selfService ? (
          <span className="label-xs">Change using {billingFrequency} billing</span>
        ) : null}
      </div>
    </article>
  );
}

export function PlanChangeConfirmationModal({
  currentPlanId,
  effectiveDate,
  request,
  onBack,
  onClose,
  onConfirm,
}: {
  currentPlanId: BillingPlanId;
  effectiveDate: string;
  request: PlanChangeRequest;
  onBack: () => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const currentPlan = getBillingPlan(currentPlanId);
  const newPlan = getBillingPlan(request.planId);

  return (
    <ClientModal
      className="billing-modal billing-confirmation-modal"
      title={request.kind === "frequency" ? "Confirm billing frequency" : "Confirm plan change"}
      description="Review the Brisk plan details before continuing."
      onClose={onClose}
      footer={(
        <>
          <Button size="M" variant="secondary" onClick={onBack}>Back</Button>
          <Button size="M" onClick={onConfirm}>Confirm change</Button>
        </>
      )}
    >
      <dl className="billing-confirmation-list">
        <div><dt className="label-s">Current plan</dt><dd className="label-m-semibold">{currentPlan.name}</dd></div>
        <div><dt className="label-s">New plan</dt><dd className="label-m-semibold">{newPlan.name}</dd></div>
        <div><dt className="label-s">Billing frequency</dt><dd className="label-m-semibold">{frequencyLabel(request.billingFrequency)}</dd></div>
        <div><dt className="label-s">New price</dt><dd className="label-m-semibold">{formatBillingPlanPrice(newPlan, request.billingFrequency)}</dd></div>
        <div><dt className="label-s">Effective date</dt><dd className="label-m-semibold">{effectiveDate}</dd></div>
      </dl>
      <p className="billing-modal-note paragraph-s">Final financial confirmation would be completed securely through Stripe in production.</p>
    </ClientModal>
  );
}

export function AddOnConfirmationModal({
  addOn,
  onClose,
  onConfirm,
}: {
  addOn: BillingAddOn;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ClientModal
      className="billing-modal billing-confirmation-modal"
      title={`Add ${addOn.name}?`}
      description="This confirmation updates local prototype state only."
      onClose={onClose}
      footer={(
        <>
          <Button size="M" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="M" onClick={onConfirm}>Add to plan</Button>
        </>
      )}
    >
      <dl className="billing-confirmation-list">
        <div><dt className="label-s">Add-on</dt><dd className="label-m-semibold">{addOn.name}</dd></div>
        <div><dt className="label-s">Price</dt><dd className="label-m-semibold">{formatBillingAddOnPrice(addOn)}</dd></div>
      </dl>
    </ClientModal>
  );
}

export function frequencyLabel(frequency: BillingFrequency) {
  return frequency === "annual" ? "Annual" : "Monthly";
}
