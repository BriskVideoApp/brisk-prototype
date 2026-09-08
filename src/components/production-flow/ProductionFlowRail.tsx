"use client";

import { useId, useState, type DragEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  getProductionFlowStageDefinition,
  productionFlowPostProductionDefinitions,
  getProductionFlowStatusLabel,
  productionFlowStages,
  type ProductionFlowPostProductionTerm,
  type ProductionFlowSelection,
  type ProductionFlowStageKey,
  type ProductionFlowStatus,
} from "@/data/production-flow";

type ProductionFlowRailProps = {
  stages: ProductionFlowStageKey[];
  selectedStage: ProductionFlowSelection;
  statuses: Record<ProductionFlowStageKey, ProductionFlowStatus>;
  postProductionTerm: ProductionFlowPostProductionTerm;
  mediaCount: number;
  onAddStage: (stage: ProductionFlowStageKey) => void;
  onHideStage: (stage: ProductionFlowStageKey) => void;
  onReorderStage: (stage: ProductionFlowStageKey, beforeStage: ProductionFlowStageKey) => void;
  onPostProductionTermChange: (term: ProductionFlowPostProductionTerm) => void;
  onReset: () => void;
  onSelectStage: (stage: ProductionFlowSelection) => void;
};

export function ProductionFlowRail({
  stages,
  selectedStage,
  statuses,
  postProductionTerm,
  mediaCount,
  onAddStage,
  onHideStage,
  onReorderStage,
  onPostProductionTermChange,
  onReset,
  onSelectStage,
}: ProductionFlowRailProps) {
  const { selectedRole } = usePrototypeRole();
  const canAdjust = selectedRole === "Studio Staff";

  return (
    <section className="production-flow-rail" aria-labelledby="production-flow-rail-heading">
      <header className="production-flow-rail-heading">
        <div>
          <span className="label-xs-semibold">Project flow</span>
          <h2 className="headings-xs-bold" id="production-flow-rail-heading">Loom / Recommended production flow</h2>
        </div>
        {canAdjust ? (
          <ProductionFlowAdjuster
            stages={stages}
            postProductionTerm={postProductionTerm}
            onAddStage={onAddStage}
            onHideStage={onHideStage}
            onReorderStage={onReorderStage}
            onPostProductionTermChange={onPostProductionTermChange}
            onReset={onReset}
          />
        ) : (
          <span className="production-flow-permission label-xs-semibold">
            Only Studio Staff can adjust this flow
          </span>
        )}
      </header>

      <div className="production-flow-scroll">
        <ol className="production-flow-stage-track" aria-label="Production stages">
          {stages.map((stage, index) => (
            <ProductionFlowStage
              key={stage}
              stage={stage}
              postProductionTerm={postProductionTerm}
              status={statuses[stage]}
              selected={selectedStage === stage}
              showConnector={index < stages.length - 1}
              onSelect={() => onSelectStage(stage)}
            />
          ))}
        </ol>

        <div className="production-flow-media-divider" aria-hidden="true" />
        <button
          className={`production-flow-media ${selectedStage === "media" ? "is-current" : ""}`}
          type="button"
          aria-label={`Open Media. ${mediaCount} files available throughout the project.`}
          onClick={() => onSelectStage("media")}
        >
          <span className="production-flow-stage-icon" aria-hidden="true">
            <DsIcon name="image-square" size={24} />
          </span>
          <span className="label-xs-semibold">Media ({mediaCount})</span>
          <small className="label-xs">Always available</small>
        </button>
      </div>
    </section>
  );
}

function ProductionFlowStage({
  stage,
  postProductionTerm,
  status,
  selected,
  showConnector,
  onSelect,
}: {
  stage: ProductionFlowStageKey;
  postProductionTerm: ProductionFlowPostProductionTerm;
  status: ProductionFlowStatus;
  selected: boolean;
  showConnector: boolean;
  onSelect: () => void;
}) {
  const definition = getProductionFlowStageDefinition(stage, postProductionTerm);
  const statusLabel = getProductionFlowStatusLabel(status);

  return (
    <li className={`production-flow-stage is-${status} ${selected ? "is-current" : ""}`}>
      <button
        className="production-flow-stage-button"
        type="button"
        aria-current={selected ? "step" : undefined}
        aria-label={`${definition.label}: ${statusLabel}`}
        data-tooltip={statusLabel}
        onClick={onSelect}
      >
        <span className="production-flow-stage-icon" aria-hidden="true">
          <DsIcon name={definition.icon} size={24} />
        </span>
      </button>
      <span className="production-flow-stage-label label-xs-semibold">{definition.label}</span>
      <small className="production-flow-stage-status label-xs">{statusLabel}</small>
      {showConnector ? (
        <span className="production-flow-stage-connector" aria-hidden="true">
          <DsIcon name="caret-right" size={20} />
        </span>
      ) : null}
    </li>
  );
}

export function ProductionFlowAdjuster({
  stages,
  postProductionTerm,
  onAddStage,
  onHideStage,
  onReorderStage,
  onPostProductionTermChange,
  onReset,
  triggerIconSize = 18,
}: Pick<ProductionFlowRailProps, "stages" | "postProductionTerm" | "onAddStage" | "onHideStage" | "onReorderStage" | "onPostProductionTermChange" | "onReset"> & {
  triggerIconSize?: number;
}) {
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [draggedStage, setDraggedStage] = useState<ProductionFlowStageKey | null>(null);
  const [dropStage, setDropStage] = useState<ProductionFlowStageKey | null>(null);
  const [pendingHide, setPendingHide] = useState<ProductionFlowStageKey | null>(null);
  const [isPostProductionTermOpen, setIsPostProductionTermOpen] = useState(false);
  const hiddenStages = (Object.keys(productionFlowStages) as ProductionFlowStageKey[])
    .filter((stage) => !stages.includes(stage));

  const requestHide = (stage: ProductionFlowStageKey) => {
    setIsPostProductionTermOpen(false);
    setPendingHide(stage);
  };

  const closeAdjuster = () => {
    setIsOpen(false);
    setDraggedStage(null);
    setDropStage(null);
    setPendingHide(null);
    setIsPostProductionTermOpen(false);
  };

  const completeDrop = (event: DragEvent<HTMLLIElement>, beforeStage: ProductionFlowStageKey) => {
    event.preventDefault();
    if (draggedStage && draggedStage !== beforeStage) onReorderStage(draggedStage, beforeStage);
    setDraggedStage(null);
    setDropStage(null);
    setIsPostProductionTermOpen(false);
  };

  return (
    <div className="production-flow-adjuster">
      <button
        className="production-flow-adjuster-trigger"
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label="Adjust project flow"
        data-tooltip="Adjust project flow"
        onClick={() => {
          if (isOpen) closeAdjuster();
          else setIsOpen(true);
        }}
      >
        <DsIcon name="faders-horizontal" size={triggerIconSize} />
      </button>

      {isOpen ? (
        <>
          <button
            className="production-flow-adjuster-backdrop"
            type="button"
            aria-label="Close project flow adjuster"
            onClick={closeAdjuster}
          />
          <section
            className="production-flow-adjuster-panel"
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${panelId}-title`}
          >
            <header>
              <div>
                <span className="label-xs-semibold">Project settings</span>
                <h3 className="headings-xs-bold" id={`${panelId}-title`}>Adjust project flow</h3>
              </div>
              <button className="production-flow-close" type="button" aria-label="Close" onClick={closeAdjuster}>
                <DsIcon name="x-close-cross" size={16} />
              </button>
            </header>

            <p className="paragraph-s">Drag stages to reorder them. Media stays pinned outside the production flow.</p>

            <ol className="production-flow-adjuster-list">
              {stages.map((stage) => {
                const definition = getProductionFlowStageDefinition(stage, postProductionTerm);
                return (
                  <li
                    className={`${draggedStage === stage ? "is-dragging" : ""} ${dropStage === stage ? "is-drop-target" : ""}`.trim()}
                    key={stage}
                    draggable
                    onDragStart={() => {
                      setDraggedStage(stage);
                      setDropStage(null);
                      setIsPostProductionTermOpen(false);
                    }}
                    onDragEnd={() => {
                      setDraggedStage(null);
                      setDropStage(null);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDropStage(stage);
                    }}
                    onDrop={(event) => completeDrop(event, stage)}
                  >
                    <span className="production-flow-drag" aria-hidden="true"><DsIcon name="dots-six-vertical" size={18} /></span>
                    {stage === "edit" ? (
                      <button
                        className="production-flow-stage-term-trigger"
                        type="button"
                        aria-controls={`${panelId}-term-popover`}
                        aria-expanded={isPostProductionTermOpen}
                        onClick={() => {
                          setPendingHide(null);
                          setIsPostProductionTermOpen((current) => !current);
                        }}
                      >
                        <span className="production-flow-adjuster-stage-icon" aria-hidden="true"><DsIcon name={definition.icon} size={18} /></span>
                        <span className="label-s-semibold">{definition.label}</span>
                        <DsIcon name="caret-down" size={14} />
                      </button>
                    ) : (
                      <>
                        <span className="production-flow-adjuster-stage-icon" aria-hidden="true"><DsIcon name={definition.icon} size={18} /></span>
                        <span className="label-s-semibold">{definition.label}</span>
                      </>
                    )}
                    <span className="production-flow-adjuster-actions">
                      <button type="button" aria-label={`Hide ${definition.label}`} onClick={() => requestHide(stage)}>
                        <DsIcon name="eye-slash" size={14} />
                      </button>
                    </span>
                    {stage === "edit" && isPostProductionTermOpen ? (
                      <aside
                        className="production-flow-stage-term-popover"
                        id={`${panelId}-term-popover`}
                        role="dialog"
                        aria-labelledby={`${panelId}-term-title`}
                      >
                        <div>
                          <h4 className="label-s-semibold" id={`${panelId}-term-title`}>Post-production term</h4>
                          <p className="label-xs">The label, icon and action copy change together. Existing work is unchanged.</p>
                        </div>
                        <div className="production-flow-stage-term-options">
                          {(Object.keys(productionFlowPostProductionDefinitions) as ProductionFlowPostProductionTerm[]).map((term) => {
                            const presentation = productionFlowPostProductionDefinitions[term];
                            return (
                              <Button
                                className="production-flow-stage-term-option"
                                key={term}
                                size="S"
                                variant={postProductionTerm === term ? "tertiary" : "secondary"}
                                onClick={() => {
                                  onPostProductionTermChange(term);
                                  setIsPostProductionTermOpen(false);
                                }}
                              >
                                <DsIcon name={presentation.icon} size={16} />
                                {presentation.label}
                              </Button>
                            );
                          })}
                        </div>
                      </aside>
                    ) : null}
                  </li>
                );
              })}
            </ol>

            {pendingHide ? (
              <div className="production-flow-popconfirm" role="alert">
                <strong className="label-s-semibold">Hide {getProductionFlowStageDefinition(pendingHide, postProductionTerm).label}?</strong>
                <p className="label-xs">This stage will be hidden from the project flow. Its work will be preserved and restored if the stage is revealed again.</p>
                <div>
                  <Button size="S" variant="secondary" onClick={() => setPendingHide(null)}>Keep visible</Button>
                  <Button size="S" onClick={() => { onHideStage(pendingHide); setPendingHide(null); }}>Hide stage</Button>
                </div>
              </div>
            ) : null}

            {hiddenStages.length > 0 ? (
              <section className="production-flow-add-stage" aria-labelledby={`${panelId}-add-title`}>
                <h4 className="label-s-semibold" id={`${panelId}-add-title`}>Add a supported stage</h4>
                <div>
                  {hiddenStages.map((stage) => (
                    <button type="button" key={stage} onClick={() => onAddStage(stage)}>
                      <DsIcon name="plus" size={14} />
                      <span className="label-s">{getProductionFlowStageDefinition(stage, postProductionTerm).label}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <footer>
              <Button size="S" variant="secondary" onClick={onReset}>Reset to recommended flow</Button>
            </footer>
          </section>
        </>
      ) : null}
    </div>
  );
}
