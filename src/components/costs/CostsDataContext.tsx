"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  initialContractorInvoices,
  initialContractorOffers,
  invoiceForwardingDestinations,
  type ContractorInvoice,
  type ContractorOffer,
  type ContractorOfferState,
  type CostCurrency,
  type InvoiceForwardingDestination,
} from "@/data/costs";
import { useNotificationInbox } from "@/components/notifications/NotificationInboxContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import { useStudioCompanyName } from "@/components/prototype-state/useStudioCompanyName";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { notificationInboxRecipientByRole } from "@/data/notification-inbox";
import { getInvitationCost, getRoleEstimatedHours } from "@/data/active-videos/teamDefaults";

type NewOfferInput = Pick<ContractorOffer, "projectId" | "contractorId" | "contractorName" | "role" | "agreedRate" | "currency">;
type NewInvoiceInput = {
  offerId: string;
  amount: number;
  currency: CostCurrency;
  fileNames: string[];
  contractorNote?: string;
};

type CostsDataContextValue = {
  offers: ContractorOffer[];
  invoices: ContractorInvoice[];
  createOffer: (input: NewOfferInput) => ContractorOffer;
  setOfferState: (offerId: string, state: ContractorOfferState) => void;
  submitInvoice: (input: NewInvoiceInput) => ContractorInvoice | null;
  approveInvoice: (invoiceId: string, approvalNote?: string) => void;
  resetInvoiceToSubmitted: (invoiceId: string) => void;
  sendBackInvoice: (invoiceId: string, reason: string) => void;
  markInvoicePaid: (invoiceId: string) => void;
  forwardInvoice: (invoiceId: string, destinationIds: InvoiceForwardingDestination["id"][]) => void;
};

const CostsDataContext = createContext<CostsDataContextValue | null>(null);
const offersStorageKey = "brisk-contractor-offers-v1";
const offerReminderStorageKey = "brisk-contractor-offer-reminders-v1";
const offerReminderDelayMs = 24 * 60 * 60 * 1000;

export function CostsDataProvider({ children }: { children: ReactNode }) {
  const { publishOfferNotification } = useNotificationInbox();
  const { people } = usePeople();
  const { state: prototypeState, hasHydrated: hasPrototypeStateHydrated } = usePrototypeState();
  const studioName = useStudioCompanyName();
  const [offers, setOffers] = useState<ContractorOffer[]>(initialContractorOffers);
  const [offersHydrated, setOffersHydrated] = useState(false);
  const [remindedOfferIds, setRemindedOfferIds] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<ContractorInvoice[]>(initialContractorInvoices);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem(offersStorageKey) ?? "null");
      if (Array.isArray(stored)) setOffers(stored as ContractorOffer[]);
      const storedReminderIds: unknown = JSON.parse(window.localStorage.getItem(offerReminderStorageKey) ?? "null");
      if (Array.isArray(storedReminderIds)) setRemindedOfferIds(storedReminderIds as string[]);
    } catch {
      // Keep the seed data if a saved prototype state cannot be read.
    }
    setOffersHydrated(true);
  }, []);

  useEffect(() => {
    if (offersHydrated) window.localStorage.setItem(offersStorageKey, JSON.stringify(offers));
  }, [offers, offersHydrated]);

  useEffect(() => {
    if (!offersHydrated || !hasPrototypeStateHydrated) return;
    const shooter = prototypeState.projects.find((project) => project.id === "loom-launch-film")?.team.find((slot) => slot.role === "shooter");
    const invitation = shooter?.invitations.find((candidate) => candidate.personId === "jl" && (candidate.status === "invited" || candidate.status === "seen"));
    if (!shooter || !invitation) return;
    const estimatedTotal = getInvitationCost(invitation, getRoleEstimatedHours(shooter));
    if (typeof estimatedTotal !== "number" || estimatedTotal <= 0) return;
    setOffers((current) => {
      const seededOffer = current.find((offer) => offer.id === "offer-loom-jl" && offer.state === "Pending");
      if (!seededOffer || seededOffer.agreedRate === estimatedTotal) return current;
      return current.map((offer) => offer.id === seededOffer.id ? { ...offer, agreedRate: estimatedTotal } : offer);
    });
  }, [hasPrototypeStateHydrated, offersHydrated, prototypeState.projects]);

  useEffect(() => {
    if (!offersHydrated) return;
    const nextOffer = offers
      .filter((offer) => offer.createdInPrototype && offer.state === "Pending" && !remindedOfferIds.includes(offer.id))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0];
    if (!nextOffer) return;

    const delay = Math.max(0, new Date(nextOffer.createdAt).getTime() + offerReminderDelayMs - Date.now());
    const timeout = window.setTimeout(() => {
      const nextIds = [...remindedOfferIds, nextOffer.id];
      setRemindedOfferIds(nextIds);
      window.localStorage.setItem(offerReminderStorageKey, JSON.stringify(nextIds));
      const projectName = prototypeState.projects.find((project) => project.id === nextOffer.projectId)?.name ?? nextOffer.projectId;
      const recipient = people.find((person) => person.id === nextOffer.contractorId)?.email ?? nextOffer.contractorName;
      publishOfferNotification({
        eventKey: "freelancer.offer.reminded",
        offerId: nextOffer.id,
        recipientId: notificationInboxRecipientByRole["Studio Staff"],
        recipientRole: "Studio Staff",
        actorName: studioName,
        projectId: nextOffer.projectId,
        projectName,
        title: `${nextOffer.contractorName} has not responded`,
        copy: `The ${nextOffer.role} offer is still awaiting a response after 24 hours.`,
        href: `/projects/${encodeURIComponent(nextOffer.projectId)}/stages/brief`,
        ctaLabel: "View project",
        emailPreview: {
          recipient,
          subject: `${projectName} - offer reminder`,
          body: [`Hi ${nextOffer.contractorName.split(" ")[0]},`, `Just checking you saw the ${nextOffer.role} offer for ${projectName}. Please review the Brief and respond in Brisk.`],
          ctaLabel: "View Brief",
          ctaHref: `/offers/${encodeURIComponent(nextOffer.projectId)}/brief`,
        },
      });
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [offers, offersHydrated, people, prototypeState.projects, publishOfferNotification, remindedOfferIds, studioName]);

  const createOffer = useCallback((input: NewOfferInput) => {
    const createdOffer: ContractorOffer = {
      ...input,
      id: `offer-${input.projectId}-${input.contractorId}-${Date.now()}`,
      state: "Pending",
      createdAt: new Date().toISOString(),
      createdInPrototype: true,
    };
    setOffers((current) => [createdOffer, ...current]);
    return createdOffer;
  }, []);

  const setOfferState = useCallback((offerId: string, state: ContractorOfferState) => {
    setOffers((current) => current.map((offerItem) => offerItem.id === offerId ? {
      ...offerItem,
      state,
      respondedAt: state === "Pending" ? undefined : new Date().toISOString(),
    } : offerItem));
  }, []);

  const submitInvoice = useCallback((input: NewInvoiceInput) => {
    const offerItem = offers.find((candidate) => candidate.id === input.offerId);
    if (!offerItem || offerItem.state !== "Accepted" || input.fileNames.length === 0) return null;

    const submittedInvoice: ContractorInvoice = {
      id: `invoice-${input.offerId}-${Date.now()}`,
      offerId: input.offerId,
      projectId: offerItem.projectId,
      contractorId: offerItem.contractorId,
      contractorName: offerItem.contractorName,
      fileNames: input.fileNames,
      amount: input.amount,
      currency: input.currency,
      state: "Submitted",
      submittedAt: new Date().toISOString(),
      contractorNote: input.contractorNote?.trim() || undefined,
      tags: [],
    };
    setInvoices((current) => [submittedInvoice, ...current]);
    return submittedInvoice;
  }, [offers]);

  const approveInvoice = useCallback((invoiceId: string, approvalNote?: string) => {
    setInvoices((current) => current.map((invoiceItem) => invoiceItem.id === invoiceId ? {
      ...invoiceItem,
      state: "Approved",
      approvalNote: approvalNote?.trim() || undefined,
      sendBackReason: undefined,
      approvedAt: new Date().toISOString(),
    } : invoiceItem));
  }, []);

  const resetInvoiceToSubmitted = useCallback((invoiceId: string) => {
    setInvoices((current) => current.map((invoiceItem) => invoiceItem.id === invoiceId ? {
      ...invoiceItem,
      state: "Submitted",
      approvalNote: undefined,
      sendBackReason: undefined,
      approvedAt: undefined,
      paidAt: undefined,
      forwardedTo: undefined,
      forwardedAt: undefined,
    } : invoiceItem));
  }, []);

  const sendBackInvoice = useCallback((invoiceId: string, reason: string) => {
    setInvoices((current) => current.map((invoiceItem) => invoiceItem.id === invoiceId ? {
      ...invoiceItem,
      state: "Sent back",
      sendBackReason: reason.trim(),
      approvedAt: undefined,
    } : invoiceItem));
  }, []);

  const markInvoicePaid = useCallback((invoiceId: string) => {
    setInvoices((current) => current.map((invoiceItem) => invoiceItem.id === invoiceId ? {
      ...invoiceItem,
      state: "Paid",
      paidAt: new Date().toISOString(),
    } : invoiceItem));
  }, []);

  const forwardInvoice = useCallback((invoiceId: string, destinationIds: InvoiceForwardingDestination["id"][]) => {
    const destinations = invoiceForwardingDestinations.filter((candidate) => destinationIds.includes(candidate.id));
    if (!destinations.length) return;

    setInvoices((current) => current.map((invoiceItem) => invoiceItem.id === invoiceId ? {
      ...invoiceItem,
      forwardedTo: destinations.map((destination) => destination.email),
      forwardedAt: new Date().toISOString(),
    } : invoiceItem));
  }, []);

  const value = useMemo<CostsDataContextValue>(() => ({
    offers,
    invoices,
    createOffer,
    setOfferState,
    submitInvoice,
    approveInvoice,
    resetInvoiceToSubmitted,
    sendBackInvoice,
    markInvoicePaid,
    forwardInvoice,
  }), [approveInvoice, createOffer, forwardInvoice, invoices, markInvoicePaid, offers, resetInvoiceToSubmitted, sendBackInvoice, setOfferState, submitInvoice]);

  return <CostsDataContext.Provider value={value}>{children}</CostsDataContext.Provider>;
}

export function useCostsData() {
  const context = useContext(CostsDataContext);
  if (!context) throw new Error("useCostsData must be used within CostsDataProvider");
  return context;
}
