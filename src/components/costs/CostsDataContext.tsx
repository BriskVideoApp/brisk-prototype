"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
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

export function CostsDataProvider({ children }: { children: ReactNode }) {
  const [offers, setOffers] = useState<ContractorOffer[]>(initialContractorOffers);
  const [invoices, setInvoices] = useState<ContractorInvoice[]>(initialContractorInvoices);

  const createOffer = useCallback((input: NewOfferInput) => {
    const createdOffer: ContractorOffer = {
      ...input,
      id: `offer-${input.projectId}-${input.contractorId}-${Date.now()}`,
      state: "Pending",
      createdAt: new Date().toISOString(),
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
