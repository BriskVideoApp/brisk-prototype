"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { CommentCountBadge } from "@/components/CommentCountBadge";
import { useCostsData } from "@/components/costs/CostsDataContext";
import { InvoiceUploadModal } from "@/components/costs/CostsPrimitives";
import { BriskSelect } from "@/components/form/BriskSelect";
import { StageProgress } from "@/components/active-videos/StageProgress";
import {
  useRoleVideoTable,
  type RoleVideoColumnContextMenuState,
  type RoleVideoColumnDragState,
  type RoleVideoColumnSettlingGhostState,
} from "@/components/active-videos/useRoleVideoTable";
import { useProjectCompletion } from "@/components/project/ProjectCompletionContext";
import { useProjectStageStatus } from "@/components/project/ProjectStageStatusContext";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import type { StageKey } from "@/components/active-videos/types";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import {
  freelancerPreviewViewer,
  getFreelancerEngagements,
  getFreelancerPaymentLabel,
  type FreelancerEngagement,
  type FreelancerPaymentStatus,
} from "@/data/freelancer-videos";
import { formatCostAmount, type ContractorInvoice, type ContractorOffer } from "@/data/costs";
import { getDemoProjectDestination } from "@/data/projects";
import { getFileLocationHref } from "@/lib/project-files";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";

type FreelancerView = "videos" | "offers";
type OfferView = "open" | "history";
type PaymentFilter = "all" | Exclude<FreelancerPaymentStatus, "not_ready">;
type FreelancerColumnKey = "work" | "progress" | "latestAction" | "deadline" | "time" | "commercial";
type FreelancerTableColumnKey = "video" | FreelancerColumnKey;
type CostedFreelancerEngagement = FreelancerEngagement & {
  offer: ContractorOffer;
  invoices: ContractorInvoice[];
};

const paymentFilterOptions: Array<{ value: PaymentFilter; label: string }> = [
  { value: "all", label: "All payment states" },
  { value: "invoice_required", label: "Invoice required" },
  { value: "invoice_submitted", label: "Invoice submitted" },
  { value: "sent_back", label: "Invoice sent back" },
  { value: "approved", label: "Payment approved" },
  { value: "paid", label: "Paid" },
];
const freelancerPrimaryColumnWidth = 290;
const freelancerColumnStorageKey = "brisk-freelancer-videos-column-order-v1";
const freelancerColumnOrder: FreelancerColumnKey[] = ["work", "progress", "latestAction", "deadline", "time", "commercial"];
const freelancerColumnConfig: Record<FreelancerColumnKey, { label: string; width: number }> = {
  work: { label: "Your work", width: 138 },
  progress: { label: "Progress", width: 318 },
  latestAction: { label: "Latest action", width: 235 },
  deadline: { label: "Deadline", width: 138 },
  time: { label: "Time", width: 124 },
  commercial: { label: "Commercial", width: 138 },
};

function useFreelancerVideoTable() {
  return useRoleVideoTable<FreelancerColumnKey, "video">({
    allowColumnHiding: false,
    columnConfig: freelancerColumnConfig,
    defaultOrder: freelancerColumnOrder,
    primaryColumnKey: "video",
    primaryColumnWidth: freelancerPrimaryColumnWidth,
    storageKey: freelancerColumnStorageKey,
  });
}

type FreelancerVideoTableController = ReturnType<typeof useFreelancerVideoTable>;
const stageMeta: Record<StageKey, { label: string; icon: DsIconName }> = {
  brief: { label: "Brief", icon: "clipboard-text" },
  script: { label: "Script", icon: "pen-nib" },
  shoot: { label: "Shoot", icon: "video-camera-ds" },
  media: { label: "Media", icon: "image-square" },
  edit: { label: "Edit", icon: "stage-edit" },
  masters: { label: "Masters", icon: "film-strip" },
};

export function FreelancerVideosPage() {
  const searchParams = useSearchParams();
  const { activeScenario } = usePrototypeScenario();
  const { completionRecords } = useProjectCompletion();
  const { getProjectStages } = useProjectStageStatus();
  const { invoices, offers, setOfferState } = useCostsData();
  const scenarioProjects = activeScenario?.state === "new" ? [] : activeVideoProjects;
  const projects = useMemo(() => scenarioProjects.map((project) => {
    const completion = completionRecords[project.id];
    return {
      ...project,
      status: completion ? "Completed" as const : project.status,
      stages: getProjectStages(project),
      deliveredAt: completion?.deliveredAt ?? project.deliveredAt,
    };
  }), [completionRecords, getProjectStages, scenarioProjects]);
  const baseEngagements = useMemo(
    () => getFreelancerEngagements(projects, freelancerPreviewViewer.id),
    [projects],
  );
  const [view, setView] = useState<FreelancerView>(() => searchParams.get("scenario-view") === "offer-history" ? "offers" : "videos");
  const [offerView, setOfferView] = useState<OfferView>(() => searchParams.get("scenario-view") === "offer-history" ? "history" : "open");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [query, setQuery] = useState("");
  const [invoiceOffer, setInvoiceOffer] = useState<ContractorOffer | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const videoTable = useFreelancerVideoTable();

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const engagements = useMemo<CostedFreelancerEngagement[]>(() => baseEngagements.flatMap((engagement) => {
    const offer = offers.find((offerItem) => offerItem.projectId === engagement.project.id && offerItem.contractorId === freelancerPreviewViewer.id);
    if (!offer) return [];
    return [{
      ...engagement,
      offer,
      invoices: invoices.filter((invoiceItem) => invoiceItem.offerId === offer.id),
    }];
  }), [baseEngagements, invoices, offers]);
  const acceptedEngagements = engagements.filter((engagement) => engagement.offer.state === "Accepted");
  const openOffers = engagements.filter((engagement) => engagement.offer.state === "Pending");
  const offerHistory = engagements.filter((engagement) => engagement.offer.state === "Declined" || engagement.offer.state === "Revoked");
  const normalisedQuery = query.trim().toLocaleLowerCase("en-AU");
  const visibleVideos = acceptedEngagements
    .filter((engagement) => {
      const paymentStatus = getPaymentStatus(engagement);
      const matchesPayment = paymentFilter === "all" || paymentStatus === paymentFilter;
      const matchesQuery = !normalisedQuery || `${engagement.project.name} ${engagement.project.clientName} ${engagement.roleLabel}`.toLocaleLowerCase("en-AU").includes(normalisedQuery);
      return matchesPayment && matchesQuery;
    })
    .sort(compareFreelancerVideos);
  const visibleOffers = (offerView === "open" ? openOffers : offerHistory).filter((engagement) =>
    !normalisedQuery || `${engagement.project.name} ${engagement.project.clientName} ${engagement.roleLabel}`.toLocaleLowerCase("en-AU").includes(normalisedQuery),
  );

  const acceptOffer = (engagement: CostedFreelancerEngagement) => {
    setOfferState(engagement.offer.id, "Accepted");
    setView("videos");
    setToast(`${engagement.project.name} added to Active jobs`);
  };
  const declineOffer = (engagement: CostedFreelancerEngagement) => {
    setOfferState(engagement.offer.id, "Declined");
    setToast(`Offer declined for ${engagement.project.name}`);
  };
  const clearControls = () => {
    setQuery("");
    setPaymentFilter("all");
  };

  return (
    <main className="freelancer-videos-page">
      <header className="freelancer-videos-header">
        <div>
          <span className="label-xs-semibold">{freelancerPreviewViewer.name} - Freelancer</span>
          <h1 className="headings-m-bold">My jobs</h1>
          <p className="paragraph-s">Review offers, follow active project work and submit contractor invoices.</p>
        </div>
        <label className="freelancer-videos-search" htmlFor="freelancer-videos-search">
          <DsIcon name="search" size={16} />
          <span className="sr-only">Search your jobs</span>
          <input id="freelancer-videos-search" type="search" value={query} placeholder="Search your jobs" onChange={(event) => setQuery(event.target.value)} />
        </label>
      </header>

      <nav className="freelancer-primary-tabs" aria-label="Contractor job views">
        <button className={`label-s-semibold ${view === "videos" ? "is-active" : ""}`} type="button" aria-current={view === "videos" ? "page" : undefined} onClick={() => setView("videos")}>Active jobs <span className="label-xs">{acceptedEngagements.length}</span></button>
        <button className={`label-s-semibold ${view === "offers" ? "is-active" : ""}`} type="button" aria-current={view === "offers" ? "page" : undefined} onClick={() => setView("offers")}>Offers <span className="label-xs">{openOffers.length}</span></button>
        {view === "videos" ? <div className="freelancer-payment-filter"><span className="label-xs-semibold">Payment</span><BriskSelect ariaLabel="Filter by payment status" clearable={false} searchable={false} options={paymentFilterOptions} placeholder="Payment status" value={paymentFilter} onChange={(value) => setPaymentFilter((value || "all") as PaymentFilter)} /></div> : null}
      </nav>

      {view === "videos" ? (
        <>
          <FreelancerVideoTable engagements={visibleVideos} table={videoTable} onSubmitInvoice={setInvoiceOffer} />
          {visibleVideos.length === 0 ? <FreelancerEmptyState
            title={activeScenario?.state === "new" ? "No jobs yet" : "No jobs match these controls"}
            body={activeScenario?.state === "new" ? "Accepted project work will appear here when a Studio assigns it to you." : "Try another payment state or search."}
            action={activeScenario?.state === "new" ? "Check offers" : "Clear controls"}
            onAction={activeScenario?.state === "new" ? () => setView("offers") : clearControls}
          /> : null}
        </>
      ) : (
        <>
          <section className="freelancer-offer-controls" aria-label="Offer views">
            <button className={`label-s-semibold ${offerView === "open" ? "is-active" : ""}`} type="button" onClick={() => setOfferView("open")}>Open offers <span className="label-xs">{openOffers.length}</span></button>
            <button className={`label-s-semibold ${offerView === "history" ? "is-active" : ""}`} type="button" onClick={() => setOfferView("history")}>History <span className="label-xs">{offerHistory.length}</span></button>
          </section>
          {visibleOffers.length ? <section className="freelancer-offer-grid" aria-label={offerView === "open" ? "Open offers" : "Offer history"}>{visibleOffers.map((engagement) => <FreelancerOfferCard engagement={engagement} isOpen={offerView === "open"} key={engagement.id} onAccept={() => acceptOffer(engagement)} onDecline={() => declineOffer(engagement)} />)}</section> : <FreelancerEmptyState title={offerView === "open" ? "No open offers" : "No offer history"} body={normalisedQuery ? "Try another search." : offerView === "open" ? "New offers from the Studio will appear here." : "Declined and revoked offers will appear here."} action={normalisedQuery ? "Clear search" : "Open Active jobs"} onAction={() => normalisedQuery ? setQuery("") : setView("videos")} />}
        </>
      )}

      {toast ? <div className="freelancer-videos-toast" role="status"><DsIcon name="check-circle" size={16} /><span className="label-s-semibold">{toast}</span></div> : null}
      {invoiceOffer ? <InvoiceUploadModal offer={invoiceOffer} onClose={() => setInvoiceOffer(null)} onSubmitted={(invoiceItem) => { setInvoiceOffer(null); setToast(`${invoiceItem.fileNames.length} ${invoiceItem.fileNames.length === 1 ? "PDF" : "PDFs"} submitted for review`); }} /> : null}
    </main>
  );
}

function FreelancerVideoTable({
  engagements,
  onSubmitInvoice,
  table,
}: {
  engagements: CostedFreelancerEngagement[];
  onSubmitInvoice: (offer: ContractorOffer) => void;
  table: FreelancerVideoTableController;
}) {
  if (!engagements.length) return null;

  const {
    columnContextMenu,
    columnDrag,
    columnOrder,
    draggedColumn,
    droppedColumn,
    dropIndicatorStyle,
    getColumnShiftDirection,
    getColumnWidth,
    handleColumnContextMenu,
    handleColumnPointerDown,
    handleTableScroll,
    headerRefs,
    hiddenColumns,
    isTableScrolledX,
    moveColumnByStep,
    pinColumn,
    setColumnContextMenu,
    settlingGhost,
    tableMinWidth,
    tableScrollRef,
    visibleDataColumns,
    visibleTableColumns,
  } = table;

  return (
    <section className="freelancer-video-table-frame" aria-label="My videos">
      <div
        className={`freelancer-video-table-scroll ${isTableScrolledX ? "has-horizontal-scroll" : ""}`}
        ref={tableScrollRef}
        onScroll={handleTableScroll}
      >
        <table
          className={`freelancer-video-table ${draggedColumn ? "is-column-dragging" : ""}`}
          style={{ minWidth: tableMinWidth } as CSSProperties}
        >
          <colgroup>
            {visibleTableColumns.map((columnKey) => (
              <col key={columnKey} className={`column-${columnKey}`} style={{ width: getColumnWidth(columnKey) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {visibleTableColumns.map((columnKey, columnIndex) => (
                <FreelancerTableHeaderCell
                  columnIndex={columnIndex}
                  columnKey={columnKey}
                  dropIndex={columnDrag?.dropIndex ?? null}
                  isDragging={draggedColumn === columnKey}
                  isDropped={droppedColumn === columnKey}
                  key={columnKey}
                  shiftDirection={getColumnShiftDirection(columnKey)}
                  setHeaderRef={(element) => {
                    if (element) headerRefs.current[columnKey] = element;
                    else delete headerRefs.current[columnKey];
                  }}
                  onContextMenu={handleColumnContextMenu}
                  onPointerDown={handleColumnPointerDown}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {engagements.map((engagement) => (
              <FreelancerVideoRow
                draggedColumn={draggedColumn}
                droppedColumn={droppedColumn}
                engagement={engagement}
                getColumnShiftDirection={getColumnShiftDirection}
                key={engagement.id}
                visibleColumns={visibleDataColumns}
                onSubmitInvoice={onSubmitInvoice}
              />
            ))}
          </tbody>
        </table>
      </div>
      {dropIndicatorStyle ? <span className="column-drop-indicator" style={dropIndicatorStyle} aria-hidden="true" /> : null}
      {columnDrag?.isDragging ? <FreelancerColumnDragGhost state={columnDrag} /> : null}
      {settlingGhost ? <FreelancerColumnSettlingGhost state={settlingGhost} /> : null}
      {columnContextMenu ? (
        <FreelancerColumnHeaderMenu
          state={columnContextMenu}
          columnOrder={columnOrder}
          hiddenColumns={hiddenColumns}
          onClose={() => setColumnContextMenu(null)}
          onMoveLeft={(columnKey) => moveColumnByStep(columnKey, -1)}
          onMoveRight={(columnKey) => moveColumnByStep(columnKey, 1)}
          onPin={pinColumn}
        />
      ) : null}
    </section>
  );
}

function FreelancerVideoRow({
  draggedColumn,
  droppedColumn,
  engagement,
  getColumnShiftDirection,
  onSubmitInvoice,
  visibleColumns,
}: {
  draggedColumn: FreelancerColumnKey | null;
  droppedColumn: FreelancerColumnKey | null;
  engagement: CostedFreelancerEngagement;
  getColumnShiftDirection: (columnKey: FreelancerTableColumnKey) => "left" | "right" | null;
  onSubmitInvoice: (offer: ContractorOffer) => void;
  visibleColumns: FreelancerColumnKey[];
}) {
  const destination = getDemoProjectDestination(engagement.project.id, "brief");

  return (
    <tr>
      <td className="column-video" data-label="Video">
        <FreelancerProjectIdentity engagement={engagement} destinationHref={destination?.href ?? null} />
      </td>
      {visibleColumns.map((columnKey) => (
        <FreelancerVideoDataCell
          columnKey={columnKey}
          isDragging={draggedColumn === columnKey}
          isDropped={droppedColumn === columnKey}
          engagement={engagement}
          key={columnKey}
          shiftDirection={getColumnShiftDirection(columnKey)}
          onSubmitInvoice={onSubmitInvoice}
        />
      ))}
    </tr>
  );
}

function FreelancerVideoDataCell({
  columnKey,
  engagement,
  isDragging,
  isDropped,
  onSubmitInvoice,
  shiftDirection,
}: {
  columnKey: FreelancerColumnKey;
  engagement: CostedFreelancerEngagement;
  isDragging: boolean;
  isDropped: boolean;
  onSubmitInvoice: (offer: ContractorOffer) => void;
  shiftDirection: "left" | "right" | null;
}) {
  const className = [
    `column-${columnKey}`,
    isDragging ? "column-is-dragging" : "",
    isDropped ? "column-was-dropped" : "",
    shiftDirection ? `column-shift-${shiftDirection}` : "",
  ].filter(Boolean).join(" ");

  if (columnKey === "work") {
    return <td className={className} data-label="Your work"><strong className="label-s-semibold">{engagement.roleLabel}</strong><StageAssignmentPills stages={engagement.stages} /></td>;
  }

  if (columnKey === "progress") {
    return <td className={`${className} freelancer-progress-cell`} data-label="Progress"><StageProgress compact projectId={engagement.project.id} projectName={engagement.project.name} stages={engagement.project.stages} studioName="North Star Films" customerName={engagement.project.clientName} videoType={engagement.project.videoType} /></td>;
  }

  if (columnKey === "latestAction") {
    return <td className={className} data-label="Latest action"><strong className="label-s-semibold">{engagement.project.latestUpdate.label}</strong><small className="label-xs">{formatActivityAge(engagement.project.latestUpdate.daysAgo)}</small></td>;
  }

  if (columnKey === "deadline") {
    return <td className={className} data-label="Deadline"><strong className="label-s-semibold">{formatDeadline(engagement.project.deadlineAt)}</strong><small className="label-xs">Final delivery</small></td>;
  }

  if (columnKey === "time") {
    return <td className={className} data-label="Time"><strong className="label-s-semibold">{formatHours(engagement.loggedHours)} / {formatHours(engagement.estimatedHours)}</strong><small className="label-xs">{engagement.paymentBasis === "hourly" ? "Logged / estimated" : "Logged / planned - optional"}</small><Link className="freelancer-inline-action label-xs-semibold" href={makeFreelancerLogHref(engagement)}>{engagement.paymentBasis === "hourly" ? "Log hours" : "Log time"}</Link></td>;
  }

  const paymentStatus = getPaymentStatus(engagement);
  return <td className={className} data-label="Commercial"><PaymentBadge status={paymentStatus} /><small className="label-xs">{getEngagementRateLabel(engagement)}</small>{paymentStatus === "invoice_required" || paymentStatus === "sent_back" ? <button className="freelancer-inline-action label-xs-semibold" type="button" onClick={() => onSubmitInvoice(engagement.offer)}>{paymentStatus === "sent_back" ? "Submit another invoice" : "Submit invoice"}</button> : null}</td>;
}

function FreelancerTableHeaderCell({
  columnIndex,
  columnKey,
  dropIndex,
  isDragging,
  isDropped,
  onContextMenu,
  onPointerDown,
  setHeaderRef,
  shiftDirection,
}: {
  columnIndex: number;
  columnKey: FreelancerTableColumnKey;
  dropIndex: number | null;
  isDragging: boolean;
  isDropped: boolean;
  onContextMenu: (event: ReactMouseEvent<HTMLTableCellElement>, columnKey: FreelancerColumnKey) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLTableCellElement>, columnKey: FreelancerColumnKey) => void;
  setHeaderRef: (element: HTMLTableCellElement | null) => void;
  shiftDirection: "left" | "right" | null;
}) {
  const showsDropBefore = dropIndex === columnIndex && columnKey !== "video";
  const showsDropAfter = dropIndex === columnIndex + 1 && columnKey !== "video";

  if (columnKey === "video") {
    return <th className={`column-video ${showsDropAfter ? "has-drop-indicator-after" : ""}`} scope="col" ref={setHeaderRef}>Video</th>;
  }

  const className = [
    `column-${columnKey}`,
    "draggable-column-header",
    isDragging ? "column-is-dragging" : "",
    isDropped ? "column-was-dropped" : "",
    shiftDirection ? `column-shift-${shiftDirection}` : "",
    showsDropBefore ? "has-drop-indicator-before" : "",
    showsDropAfter ? "has-drop-indicator-after" : "",
  ].filter(Boolean).join(" ");

  return (
    <th
      className={className}
      scope="col"
      ref={setHeaderRef}
      onContextMenu={(event) => onContextMenu(event, columnKey)}
      onPointerDown={(event) => onPointerDown(event, columnKey)}
    >
      {freelancerColumnConfig[columnKey].label}
    </th>
  );
}

function FreelancerColumnDragGhost({ state }: { state: RoleVideoColumnDragState<FreelancerColumnKey> }) {
  return (
    <div
      className="column-drag-ghost label-s-semibold"
      style={{
        left: state.originLeft + state.currentX - state.startX,
        top: state.originTop,
        width: state.originWidth,
        height: state.originHeight,
      }}
    >
      {freelancerColumnConfig[state.columnKey].label}
    </div>
  );
}

function FreelancerColumnSettlingGhost({ state }: { state: RoleVideoColumnSettlingGhostState }) {
  return (
    <div
      className="column-drag-ghost column-drag-ghost-settling label-s-semibold"
      style={{
        "--ghost-start-x": `${state.startLeft - state.endLeft}px`,
        left: state.endLeft,
        top: state.top,
        width: state.width,
        height: state.height,
      } as CSSProperties}
    >
      {state.label}
    </div>
  );
}

function FreelancerColumnHeaderMenu({
  columnOrder,
  hiddenColumns,
  onClose,
  onMoveLeft,
  onMoveRight,
  onPin,
  state,
}: {
  columnOrder: FreelancerColumnKey[];
  hiddenColumns: FreelancerColumnKey[];
  onClose: () => void;
  onMoveLeft: (columnKey: FreelancerColumnKey) => void;
  onMoveRight: (columnKey: FreelancerColumnKey) => void;
  onPin: (columnKey: FreelancerColumnKey) => void;
  state: RoleVideoColumnContextMenuState<FreelancerColumnKey>;
}) {
  const visibleColumnOrder = columnOrder.filter((columnKey) => !hiddenColumns.includes(columnKey));
  const columnIndex = visibleColumnOrder.indexOf(state.columnKey);

  useEffect(() => {
    const closeMenu = () => onClose();
    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeMenu);
    };
  }, [onClose]);

  return (
    <div
      className="column-header-menu"
      style={{ left: state.x, top: state.y }}
      onClick={(event) => event.stopPropagation()}
    >
      <button className="label-s-semibold" type="button" disabled={columnIndex <= 0} onClick={() => { onMoveLeft(state.columnKey); onClose(); }}>Move left</button>
      <button className="label-s-semibold" type="button" disabled={columnIndex === -1 || columnIndex >= visibleColumnOrder.length - 1} onClick={() => { onMoveRight(state.columnKey); onClose(); }}>Move right</button>
      <button className="label-s-semibold" type="button" onClick={() => { onPin(state.columnKey); onClose(); }}>Pin column</button>
    </div>
  );
}

function FreelancerProjectIdentity({ engagement, destinationHref }: { engagement: FreelancerEngagement; destinationHref: string | null }) {
  const { project, toolAccess } = engagement;
  const unreadMessages = project.unreadMessages ?? 0;
  const fileDestination = getDemoProjectDestination(project.id, "files");
  const primaryFileLocation = project.file_locations[0];
  const filesHref = fileDestination?.href ?? (primaryFileLocation ? getFileLocationHref(primaryFileLocation.url) : null);
  const filesExternal = !fileDestination && Boolean(primaryFileLocation);

  return <div className="project-cell-inner freelancer-project-identity"><span className="client-badge label-xs-semibold">{project.clientBadge}</span><div className="project-title-row">{destinationHref ? <Link className="project-title heading-3xs" href={destinationHref}>{project.name}</Link> : <span className="project-title is-static heading-3xs" title="This project is visible for context but does not have a complete demo route.">{project.name}<small className="project-demo-unavailable label-xs">Demo not available</small></span>}<div className="project-quick-actions" aria-label={`Project tools for ${project.name}`}>{toolAccess.chat ? <Link className="project-quick-action" href={`/chat?project=${encodeURIComponent(project.id)}`} aria-label={unreadMessages ? `Open chat (${unreadMessages} unread)` : "Open chat"} data-tooltip={unreadMessages ? `Open chat (${unreadMessages} unread)` : "Open chat"}><DsIcon name="chats" size={20} /><CommentCountBadge count={unreadMessages} label={`${unreadMessages} unread messages`} /></Link> : null}{toolAccess.files && filesHref ? <a className="project-quick-action" href={filesHref} aria-label="Open project files" data-tooltip="Open project files" target={filesExternal ? "_blank" : undefined} rel={filesExternal ? "noopener" : undefined}><DsIcon name="folder" size={20} /></a> : null}{toolAccess.queue ? <Link className="project-quick-action" href="/customer-dashboard" aria-label="Open Client queue" data-tooltip="Open Client queue"><DsIcon name="queue" size={20} /></Link> : null}</div></div>{toolAccess.tags && project.tags?.length ? <div className="project-meta-row" aria-label="Project tags">{project.tags.map((tag) => <span className={`project-tag-chip tag-option ${getReadOnlyTagClass(tag)} label-s-semibold`} key={tag}>{tag}</span>)}</div> : null}{engagement.assignmentMethod === "direct" ? <small className="freelancer-direct-tag label-xs-semibold">Direct assignment</small> : null}</div>;
}

function FreelancerOfferCard({ engagement, isOpen, onAccept, onDecline }: { engagement: CostedFreelancerEngagement; isOpen: boolean; onAccept: () => void; onDecline: () => void }) {
  const destination = getDemoProjectDestination(engagement.project.id, "brief");
  return <article className="freelancer-offer-card"><header><div><span className="label-xs-semibold">{engagement.project.clientName}</span><h2 className="headings-xs-bold">{engagement.project.name}</h2></div><span className={`freelancer-offer-status is-${engagement.offer.state.toLocaleLowerCase("en-AU")} label-xs-semibold`}>{engagement.offer.state}</span></header><dl><div><dt className="label-xs">Your role</dt><dd className="label-s-semibold">{engagement.offer.role}</dd></div><div><dt className="label-xs">Assigned Stages</dt><dd><StageAssignmentPills stages={engagement.stages} /></dd></div><div><dt className="label-xs">Estimated work</dt><dd className="label-s-semibold">{formatHours(engagement.estimatedHours)}</dd></div><div><dt className="label-xs">Agreed rate</dt><dd className="label-s-semibold">{formatCostAmount(engagement.offer.agreedRate, engagement.offer.currency)}</dd></div><div><dt className="label-xs">Final delivery</dt><dd className="label-s-semibold">{formatDeadline(engagement.project.deadlineAt)}</dd></div></dl><footer>{destination ? <Link className="freelancer-offer-brief label-s-semibold" href={destination.href}>View brief</Link> : <span className="freelancer-offer-brief is-disabled label-s-semibold" title="This project does not have a complete demo route.">Demo not available</span>}{isOpen ? <div><Button size="S" variant="ghost" onClick={onDecline}>Decline</Button><Button size="S" onClick={onAccept}>Accept offer</Button></div> : null}</footer></article>;
}

function StageAssignmentPills({ stages }: { stages: StageKey[] }) {
  return <span className="freelancer-stage-pills">{stages.map((stage) => <span className="label-xs-semibold" key={stage}><DsIcon name={stageMeta[stage].icon} size={13} />{stageMeta[stage].label}</span>)}</span>;
}

function PaymentBadge({ status }: { status: FreelancerPaymentStatus }) {
  return <span className={`freelancer-payment-badge is-${status} label-xs-semibold`}>{getFreelancerPaymentLabel(status)}</span>;
}

function FreelancerEmptyState({ action, body, onAction, title }: { action: string; body: string; onAction: () => void; title: string }) {
  return <section className="freelancer-videos-empty"><span aria-hidden="true"><DsIcon name="video-camera-ds" size={28} /></span><h2 className="headings-xs-bold">{title}</h2><p className="paragraph-s">{body}</p><Button size="M" onClick={onAction}>{action}</Button></section>;
}

function getPaymentStatus(engagement: CostedFreelancerEngagement): FreelancerPaymentStatus {
  const latestInvoice = [...engagement.invoices].sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())[0];
  if (!latestInvoice) return "invoice_required";
  if (latestInvoice.state === "Submitted") return "invoice_submitted";
  if (latestInvoice.state === "Sent back") return "sent_back";
  if (latestInvoice.state === "Approved") return "approved";
  return "paid";
}

function compareFreelancerVideos(
  first: CostedFreelancerEngagement,
  second: CostedFreelancerEngagement,
) {
  const priorityDifference = getFreelancerVideoPriority(first) - getFreelancerVideoPriority(second);

  if (priorityDifference !== 0) return priorityDifference;

  return new Date(first.project.deadlineAt).getTime() - new Date(second.project.deadlineAt).getTime();
}

function getFreelancerVideoPriority(
  engagement: CostedFreelancerEngagement,
) {
  if (engagement.project.status === "In Production") return 0;
  if (engagement.project.status === "Queued") return 1;

  const paymentStatus = getPaymentStatus(engagement);
  if (paymentStatus === "invoice_required" || paymentStatus === "sent_back") return 2;
  if (paymentStatus === "invoice_submitted" || paymentStatus === "approved") return 3;
  if (paymentStatus === "paid") return 4;
  if (engagement.project.status === "Paused") return 5;
  if (engagement.project.status === "Archived") return 6;
  return 4;
}

function formatDeadline(value: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function formatHours(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}h`;
}

function formatActivityAge(daysAgo: number) {
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "1 day ago";
  return `${daysAgo} days ago`;
}

function getEngagementRateLabel(engagement: CostedFreelancerEngagement) {
  return `${formatCostAmount(engagement.offer.agreedRate, engagement.offer.currency)} agreed rate`;
}

function getReadOnlyTagClass(tag: string) {
  if (tag === "Critical") return "critical";
  if (tag === "High Priority") return "high-priority";
  if (tag === "In Review") return "in-review";
  return "neutral";
}

function makeFreelancerLogHref(engagement: FreelancerEngagement) {
  const stage = engagement.stages.find((assignedStage) => engagement.project.stages[assignedStage].state !== "done") ?? engagement.stages.at(-1) ?? "brief";
  return `/today?log=1&project=${encodeURIComponent(engagement.project.id)}&stage=${stage}`;
}
