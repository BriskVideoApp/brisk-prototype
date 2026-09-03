"use client";

import { useMemo, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { BriskSelect } from "@/components/form/BriskSelect";
import { useCostsData } from "@/components/costs/CostsDataContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { mockTeamPeople, teamRoleLabels } from "@/data/active-videos/teamDefaults";
import {
  formatCostAmount,
  invoiceDiffersFromOffer,
  invoiceForwardingDestinations,
  type ContractorInvoice,
  type ContractorInvoiceState,
  type ContractorOffer,
  type ContractorOfferState,
  type CostCurrency,
  type InvoiceTag,
} from "@/data/costs";

const currencyOptions: Array<{ value: CostCurrency; label: string }> = [
  { value: "AUD", label: "AUD - Australian dollar" },
  { value: "USD", label: "USD - US dollar" },
  { value: "NZD", label: "NZD - New Zealand dollar" },
  { value: "GBP", label: "GBP - Pound sterling" },
];

const invoiceStateOptions: Array<{ value: ContractorInvoiceState; label: string }> = [
  { value: "Submitted", label: "Submitted" },
  { value: "Approved", label: "Approved" },
  { value: "Sent back", label: "Sent back" },
  { value: "Paid", label: "Paid" },
];

export function InvoiceStateBadge({ state }: { state: ContractorInvoiceState }) {
  return <span className={`costs-state-badge is-${slug(state)} label-xs-semibold`}>{state}</span>;
}

export function OfferStateBadge({ state }: { state: ContractorOfferState }) {
  return <span className={`costs-state-badge is-${slug(state)} label-xs-semibold`}>{state}</span>;
}

export function InvoiceStateSelect({ invoiceItem, onChange }: { invoiceItem: ContractorInvoice; onChange: (state: ContractorInvoiceState) => void }) {
  return <BriskSelect
    ariaLabel={`Change status for ${invoiceItem.fileNames[0]}`}
    className="costs-state-select"
    clearable={false}
    options={invoiceStateOptions}
    placeholder="Choose status"
    searchable={false}
    triggerClassName={`costs-state-badge is-${slug(invoiceItem.state)} label-xs-semibold`}
    value={invoiceItem.state}
    onChange={(value) => { if (value) onChange(value); }}
  />;
}

export function InvoiceTagBadge({ tag }: { tag: InvoiceTag }) {
  return <span className={`costs-tag-badge tag-option ${getInvoiceTagClass(tag)} label-s-semibold`}>{tag}</span>;
}

export function getInvoiceTagClass(tag: InvoiceTag) {
  if (tag === "Urgent") return "critical";
  if (tag === "Disputed") return "peach";
  if (tag === "Follow up") return "high-priority";
  return "neutral";
}

export function CreateOfferModal({ projectId, onClose, onCreated }: { projectId: string; onClose: () => void; onCreated: (offer: ContractorOffer) => void }) {
  const { createOffer } = useCostsData();
  const contractors = useMemo(() => mockTeamPeople.filter((person) => person.personType === "Studio Freelancer"), []);
  const [contractorId, setContractorId] = useState("");
  const [role, setRole] = useState("");
  const [rate, setRate] = useState("");
  const [currency, setCurrency] = useState<CostCurrency>("AUD");
  const contractor = contractors.find((person) => person.id === contractorId);
  const parsedRate = Number(rate);
  const canSubmit = Boolean(contractor && role.trim() && parsedRate > 0);

  const chooseContractor = (value: string) => {
    setContractorId(value);
    const selectedContractor = contractors.find((person) => person.id === value);
    if (!selectedContractor) return;
    setRole(teamRoleLabels[selectedContractor.defaultRole]);
    setRate(selectedContractor.hourlyRate ? String(selectedContractor.hourlyRate) : "");
  };

  const submit = () => {
    if (!contractor || !canSubmit) return;
    const createdOffer = createOffer({
      projectId,
      contractorId: contractor.id,
      contractorName: contractor.name,
      role: role.trim(),
      agreedRate: parsedRate,
      currency,
    });
    onCreated(createdOffer);
  };

  return (
    <ClientModal
      title="Create contractor offer"
      description="Set the commercial terms for this project. The contractor can accept or decline from My jobs."
      onClose={onClose}
      footer={<><Button size="M" variant="secondary" onClick={onClose}>Cancel</Button><Button size="M" onClick={submit} className={!canSubmit ? "costs-button-disabled" : ""}>Send offer</Button></>}
    >
      <div className="costs-form-grid">
        <label className="costs-field is-wide">
          <span className="label-m-semibold">Contractor</span>
          <BriskSelect ariaLabel="Choose contractor" clearable={false} options={contractors.map((person) => ({ value: person.id, label: person.name }))} placeholder="Choose a contractor" value={contractorId} onChange={chooseContractor} />
        </label>
        <Input label="Role" value={role} placeholder="For example, Editor" onChange={(event) => setRole(event.target.value)} />
        <Input label="Agreed rate" type="number" value={rate} placeholder="0" onChange={(event) => setRate(event.target.value)} />
        <label className="costs-field">
          <span className="label-m-semibold">Currency</span>
          <BriskSelect ariaLabel="Choose currency" clearable={false} searchable={false} options={currencyOptions} placeholder="Choose currency" value={currency} onChange={(value) => setCurrency((value || "AUD") as CostCurrency)} />
        </label>
      </div>
      <div className="costs-info-block"><DsIcon name="info" size={18} /><p className="label-s">This V1 offer is project-specific. It does not create a client invoice or payment.</p></div>
    </ClientModal>
  );
}

export function InvoiceUploadModal({ offer, onClose, onSubmitted }: { offer: ContractorOffer; onClose: () => void; onSubmitted: (invoice: ContractorInvoice) => void }) {
  const { submitInvoice } = useCostsData();
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [amount, setAmount] = useState(String(offer.agreedRate));
  const [currency, setCurrency] = useState<CostCurrency>(offer.currency);
  const [note, setNote] = useState("");
  const parsedAmount = Number(amount);
  const canSubmit = fileNames.length > 0 && parsedAmount > 0;

  const submit = () => {
    if (!canSubmit) return;
    const invoiceItem = submitInvoice({ offerId: offer.id, fileNames, amount: parsedAmount, currency, contractorNote: note });
    if (invoiceItem) onSubmitted(invoiceItem);
  };

  return (
    <ClientModal
      title={`Submit invoice for ${offer.role}`}
      description={`Upload one or more PDFs against your accepted ${formatCostAmount(offer.agreedRate, offer.currency)} offer.`}
      onClose={onClose}
      footer={<><Button size="M" variant="secondary" onClick={onClose}>Cancel</Button><Button size="M" onClick={submit} className={!canSubmit ? "costs-button-disabled" : ""}>Submit invoice</Button></>}
    >
      <div className="costs-form-grid">
        <label className="costs-upload-field is-wide">
          <span className="costs-upload-icon"><DsIcon name="upload-simple" size={22} /></span>
          <span><strong className="label-m-semibold">Choose invoice PDFs</strong><small className="label-xs">One or more PDF files</small></span>
          <input type="file" accept="application/pdf,.pdf" multiple onChange={(event) => setFileNames(Array.from(event.target.files ?? []).map((file) => file.name))} />
        </label>
        {fileNames.length ? <ul className="costs-file-list is-wide">{fileNames.map((fileName) => <li className="label-s" key={fileName}><DsIcon name="file-text" size={16} />{fileName}</li>)}</ul> : null}
        <Input label="Invoice amount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <label className="costs-field">
          <span className="label-m-semibold">Currency</span>
          <BriskSelect ariaLabel="Invoice currency" clearable={false} searchable={false} options={currencyOptions} placeholder="Choose currency" value={currency} onChange={(value) => setCurrency((value || offer.currency) as CostCurrency)} />
        </label>
        <label className="costs-field is-wide">
          <span className="label-m-semibold">Note <small className="label-xs">Optional</small></span>
          <textarea value={note} placeholder="Add context for the Studio" onChange={(event) => setNote(event.target.value)} />
        </label>
      </div>
      {(parsedAmount !== offer.agreedRate || currency !== offer.currency) ? <div className="costs-warning-block"><DsIcon name="alert-triangle" size={18} /><p className="label-s">This invoice differs from the agreed rate or currency. The Studio will see a warning during approval.</p></div> : null}
    </ClientModal>
  );
}

export function InvoiceReviewModal({ forceApproval = false, initialStep = "review", invoiceItem, offerItem, onClose, onMarkPaid, onUpdated }: { forceApproval?: boolean; initialStep?: "review" | "forward" | "send-back"; invoiceItem: ContractorInvoice; offerItem: ContractorOffer; onClose: () => void; onMarkPaid?: () => void; onUpdated?: (message: string) => void }) {
  const { approveInvoice, forwardInvoice, sendBackInvoice } = useCostsData();
  const [step, setStep] = useState<"review" | "send-back" | "forward">(initialStep);
  const [isViewingPdf, setIsViewingPdf] = useState(false);
  const [previewFileName, setPreviewFileName] = useState(invoiceItem.fileNames[0]);
  const [approvalNote, setApprovalNote] = useState(invoiceItem.approvalNote ?? "");
  const [sendBackReason, setSendBackReason] = useState(invoiceItem.sendBackReason ?? "");
  const [destinationIds, setDestinationIds] = useState<Array<(typeof invoiceForwardingDestinations)[number]["id"]>>([invoiceForwardingDestinations[0].id]);
  const mismatch = invoiceDiffersFromOffer(invoiceItem, offerItem);
  const isApprovalReview = invoiceItem.state === "Submitted" || forceApproval;

  const approve = () => {
    if (mismatch && !approvalNote.trim()) return;
    approveInvoice(invoiceItem.id, approvalNote);
    setStep("forward");
    onUpdated?.("Invoice approved");
  };

  const sendBack = () => {
    if (!sendBackReason.trim()) return;
    sendBackInvoice(invoiceItem.id, sendBackReason);
    onUpdated?.("Invoice sent back to the contractor");
    onClose();
  };

  const forward = () => {
    if (!destinationIds.length) return;
    forwardInvoice(invoiceItem.id, destinationIds);
    const destinationLabels = invoiceForwardingDestinations.filter((candidate) => destinationIds.includes(candidate.id)).map((destination) => destination.label);
    onUpdated?.(`Invoice emailed to ${destinationLabels.join(", ")}`);
    onClose();
  };

  const markPaid = () => {
    if (!onMarkPaid) return;
    onMarkPaid();
    onUpdated?.("Invoice marked as paid");
    onClose();
  };

  if (isViewingPdf) {
    return (
      <ClientModal
        title={previewFileName}
        description="Invoice PDF preview"
        onClose={onClose}
        footer={<Button size="M" variant="secondary" onClick={() => setIsViewingPdf(false)}>Back to invoice</Button>}
      >
        {invoiceItem.fileNames.length > 1 ? <div className="costs-pdf-file-tabs" role="tablist" aria-label="Invoice PDF files">{invoiceItem.fileNames.map((fileName) => <button className={`label-s-semibold ${previewFileName === fileName ? "is-active" : ""}`} type="button" role="tab" aria-selected={previewFileName === fileName} key={fileName} onClick={() => setPreviewFileName(fileName)}>{fileName}</button>)}</div> : null}
        <article className="costs-pdf-preview" aria-label={`Preview of ${previewFileName}`}>
          <header><span className="label-xs-semibold">CONTRACTOR INVOICE</span><strong className="headings-m-bold">Invoice</strong><small className="label-s">{previewFileName}</small></header>
          <dl>
            <div><dt className="label-xs">From</dt><dd className="label-m-semibold">{invoiceItem.contractorName}</dd></div>
            <div><dt className="label-xs">Role</dt><dd className="label-m-semibold">{offerItem.role}</dd></div>
            <div><dt className="label-xs">Submitted</dt><dd className="label-m-semibold">{formatCostDate(invoiceItem.submittedAt)}</dd></div>
            <div><dt className="label-xs">Invoice total</dt><dd className="headings-s-bold">{formatCostAmount(invoiceItem.amount, invoiceItem.currency)}</dd></div>
          </dl>
          <p className="label-xs">Prototype PDF preview. The production build will display the contractor&apos;s uploaded document.</p>
        </article>
      </ClientModal>
    );
  }

  if (step === "forward") {
    return (
      <ClientModal
        title="Invoice approved"
        description="Approval is complete. Forwarding the PDFs to one or more accounts inboxes is optional."
        onClose={onClose}
        footer={<><Button size="M" variant="secondary" onClick={onClose}>Done</Button><Button size="M" onClick={forward} className={!destinationIds.length ? "costs-button-disabled" : ""}>Email invoice</Button></>}
      >
        <div className="costs-success-block"><DsIcon name="check-circle" size={20} /><p className="label-s"><strong>Approved.</strong> You can close this window without forwarding anything.</p></div>
        <label className="costs-field">
          <span className="label-m-semibold">Forward to</span>
          <BriskSelect multiple ariaLabel="Forward invoice to accounts" clearLabel="Clear destinations" searchable={false} options={invoiceForwardingDestinations.map((destination) => ({ value: destination.id, label: `${destination.label} - ${destination.email}` }))} placeholder="Choose accounts inboxes" selectionLabel={(selectedOptions) => `${selectedOptions.length} accounts selected`} value={destinationIds} onChange={setDestinationIds} />
        </label>
      </ClientModal>
    );
  }

  if (step === "send-back") {
    return (
      <ClientModal
        title="Send invoice back"
        description="The contractor will see this reason in My jobs and can submit another invoice."
        onClose={onClose}
        footer={<><Button size="M" variant="secondary" onClick={() => setStep("review")}>Back</Button><Button size="M" onClick={sendBack} className={!sendBackReason.trim() ? "costs-button-disabled" : ""}>Send back</Button></>}
      >
        <label className="costs-field">
          <span className="label-m-semibold">Reason <small className="label-xs">Required</small></span>
          <textarea autoFocus value={sendBackReason} placeholder="Explain what needs to change" onChange={(event) => setSendBackReason(event.target.value)} />
        </label>
      </ClientModal>
    );
  }

  const reviewFooter = isApprovalReview ? (
    <>
      <Button size="M" variant="secondary" onClick={() => setIsViewingPdf(true)}>View PDF</Button>
      <Button size="M" variant="secondary" onClick={() => setStep("send-back")}>Send back</Button>
      <Button size="M" onClick={approve} className={mismatch && !approvalNote.trim() ? "costs-button-disabled" : ""}>Approve invoice</Button>
    </>
  ) : invoiceItem.state === "Approved" ? (
    <>
      <Button size="M" variant="secondary" onClick={() => setIsViewingPdf(true)}>View PDF</Button>
      <Button size="M" variant="secondary" onClick={() => setStep("forward")}>Forward invoice</Button>
      {onMarkPaid ? <Button size="M" onClick={markPaid}>Mark as paid</Button> : null}
    </>
  ) : (
    <>
      <Button size="M" variant="secondary" onClick={() => setIsViewingPdf(true)}>View PDF</Button>
      <Button size="M" onClick={onClose}>Close</Button>
    </>
  );

  return (
    <ClientModal
      title={isApprovalReview ? "Review contractor invoice" : "Contractor invoice"}
      description={`${invoiceItem.contractorName} submitted ${invoiceItem.fileNames.length} ${invoiceItem.fileNames.length === 1 ? "PDF" : "PDFs"}.`}
      onClose={onClose}
      footer={reviewFooter}
    >
      <dl className="costs-review-summary">
        <div><dt className="label-xs">Agreed rate</dt><dd className="label-m-semibold">{formatCostAmount(offerItem.agreedRate, offerItem.currency)}</dd></div>
        <div><dt className="label-xs">Invoice total</dt><dd className="label-m-semibold">{formatCostAmount(invoiceItem.amount, invoiceItem.currency)}</dd></div>
        <div className="is-wide"><dt className="label-xs">Files</dt><dd className="label-s">{invoiceItem.fileNames.join(", ")}</dd></div>
      </dl>
      {mismatch ? <div className="costs-warning-block"><DsIcon name="alert-triangle" size={18} /><p className="label-s"><strong>Different from the offer.</strong> {isApprovalReview ? "Add a note before approving. Approval remains available." : "The approved invoice has a different rate or currency."}</p></div> : null}
      {invoiceItem.contractorNote ? <div className="costs-info-block"><DsIcon name="info" size={18} /><p className="label-s"><strong>Contractor note:</strong> {invoiceItem.contractorNote}</p></div> : null}
      {invoiceItem.approvalNote && invoiceItem.state !== "Submitted" ? <div className="costs-info-block"><DsIcon name="check-circle" size={18} /><p className="label-s"><strong>Approval note:</strong> {invoiceItem.approvalNote}</p></div> : null}
      {invoiceItem.sendBackReason ? <div className="costs-info-block"><DsIcon name="arrow-counter-clockwise" size={18} /><p className="label-s"><strong>Sent back reason:</strong> {invoiceItem.sendBackReason}</p></div> : null}
      {isApprovalReview ? <label className="costs-field">
        <span className="label-m-semibold">Approval note <small className="label-xs">{mismatch ? "Required" : "Optional"}</small></span>
        <textarea value={approvalNote} placeholder={mismatch ? "Explain why this difference is approved" : "Add an internal approval note"} onChange={(event) => setApprovalNote(event.target.value)} />
      </label> : null}
    </ClientModal>
  );
}

export function formatCostDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function slug(value: string) {
  return value.toLocaleLowerCase("en-AU").replace(/\s+/gu, "-");
}
