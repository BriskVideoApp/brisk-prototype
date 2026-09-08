"use client";

import { useMemo, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { BriskSelect } from "@/components/form/BriskSelect";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { ProductionFlowRail } from "@/components/production-flow/ProductionFlowRail";
import {
  ProductionFlowStagePreview,
  type StoryboardRowId,
} from "@/components/production-flow/ProductionFlowStagePreview";
import {
  createProductionFlowStatuses,
  getProductionFlowStageDefinition,
  getRecommendedProductionFlow,
  productionBriefOverrideOptions,
  productionFlowTemplates,
  productionVideoTypeOptions,
  type ProductionBriefOverride,
  type ProductionFlowSelection,
  type ProductionFlowPostProductionTerm,
  type ProductionFlowStageKey,
  type ProductionFlowStatus,
  type ProductionFlowTemplate,
  type ProductionFlowTemplateId,
} from "@/data/production-flow";

const initialVideoType = "Live Action";
const initialTemplate = productionFlowTemplates.scripted;
const initialStoryboardImages: Record<StoryboardRowId, boolean> = {
  opening: true,
  problem: false,
  proof: true,
};

type HiddenStageLocation = {
  previousStage: ProductionFlowStageKey | null;
  nextStage: ProductionFlowStageKey | null;
};

export function ProductionFlow() {
  const { selectedRole } = usePrototypeRole();
  const [draftVideoType, setDraftVideoType] = useState(initialVideoType);
  const [draftBriefOverride, setDraftBriefOverride] = useState<ProductionBriefOverride>("video-type");
  const [appliedVideoType, setAppliedVideoType] = useState(initialVideoType);
  const [appliedBriefOverride, setAppliedBriefOverride] = useState<ProductionBriefOverride>("video-type");
  const [appliedTemplateId, setAppliedTemplateId] = useState<ProductionFlowTemplateId>(initialTemplate.id);
  const [postProductionTerm, setPostProductionTerm] = useState<ProductionFlowPostProductionTerm>(initialTemplate.postProductionTerm);
  const [stages, setStages] = useState<ProductionFlowStageKey[]>([...initialTemplate.stages]);
  const [statuses, setStatuses] = useState<Record<ProductionFlowStageKey, ProductionFlowStatus>>(
    () => createProductionFlowStatuses(initialTemplate.id),
  );
  const [hiddenStageLocations, setHiddenStageLocations] = useState<Partial<Record<ProductionFlowStageKey, HiddenStageLocation>>>({});
  const [selectedStage, setSelectedStage] = useState<ProductionFlowSelection>("brief");
  const [storyboardImages, setStoryboardImages] = useState<Record<StoryboardRowId, boolean>>(initialStoryboardImages);
  const [notice, setNotice] = useState(`${initialVideoType} maps to the ${initialTemplate.label} template.`);
  const recommendedTemplate = useMemo(
    () => getRecommendedProductionFlow(draftVideoType, draftBriefOverride),
    [draftBriefOverride, draftVideoType],
  );
  const appliedTemplate = productionFlowTemplates[appliedTemplateId];
  const briefAnswerLabel = productionBriefOverrideOptions.find((option) => option.value === appliedBriefOverride)?.label ?? "Use video type recommendation";
  const recommendationIsPending = draftVideoType !== appliedVideoType || draftBriefOverride !== appliedBriefOverride;

  const applyTemplate = (template: ProductionFlowTemplate, videoType: string, briefOverride: ProductionBriefOverride) => {
    setAppliedTemplateId(template.id);
    setAppliedVideoType(videoType);
    setAppliedBriefOverride(briefOverride);
    setPostProductionTerm(template.postProductionTerm);
    setStages([...template.stages]);
    setHiddenStageLocations({});
    setStatuses(createProductionFlowStatuses(template.id));
    setSelectedStage("brief");
    setStoryboardImages(initialStoryboardImages);
    setNotice(`${template.label} created automatically from the completed Brief. No approval was required.`);
  };

  const completeBrief = () => {
    applyTemplate(recommendedTemplate, draftVideoType, draftBriefOverride);
  };

  const resetToRecommendedFlow = () => {
    setStages([...appliedTemplate.stages]);
    setHiddenStageLocations({});
    setStatuses(createProductionFlowStatuses(appliedTemplate.id));
    setPostProductionTerm(appliedTemplate.postProductionTerm);
    setSelectedStage("brief");
    setNotice(`Reset to the recommended ${appliedTemplate.label} flow.`);
  };

  const addStage = (stage: ProductionFlowStageKey) => {
    if (stages.includes(stage)) return;

    const hiddenLocation = hiddenStageLocations[stage];
    const nextStages = hiddenLocation
      ? restoreStage(stages, stage, hiddenLocation)
      : insertStage(stages, stage);

    setStages(nextStages);
    setHiddenStageLocations((current) => {
      const nextLocations = { ...current };
      delete nextLocations[stage];
      return nextLocations;
    });
    if (stage === "storyboard" && !hiddenLocation) {
      setStatuses((current) => ({ ...current, storyboard: "waiting-studio" }));
    }
    setSelectedStage(stage);
    setNotice(`${getProductionFlowStageDefinition(stage, postProductionTerm).label} added to the project flow.`);
  };

  const hideStage = (stage: ProductionFlowStageKey) => {
    const stageIndex = stages.indexOf(stage);
    if (stageIndex < 0) return;

    const nextStages = stages.filter((candidate) => candidate !== stage);
    setHiddenStageLocations((current) => ({
      ...current,
      [stage]: {
        previousStage: stages[stageIndex - 1] ?? null,
        nextStage: stages[stageIndex + 1] ?? null,
      },
    }));
    setStages(nextStages);
    if (selectedStage === stage) setSelectedStage(nextStages[0] ?? "media");
    setNotice(`${getProductionFlowStageDefinition(stage, postProductionTerm).label} hidden. Its work has been preserved.`);
  };

  const reorderStage = (stage: ProductionFlowStageKey, beforeStage: ProductionFlowStageKey) => {
    const withoutStage = stages.filter((candidate) => candidate !== stage);
    const targetIndex = withoutStage.indexOf(beforeStage);
    const nextStages = [...withoutStage];
    nextStages.splice(targetIndex < 0 ? withoutStage.length : targetIndex, 0, stage);
    commitStageOrder(nextStages, setStages, setNotice);
  };

  const approveScript = () => {
    setStatuses((current) => ({
      ...current,
      script: "approved",
      storyboard: stages.includes("storyboard") ? "waiting-studio" : current.storyboard,
    }));
    setNotice(stages.includes("storyboard")
      ? "Script approved. Storyboard created with locked Words and editable Visuals."
      : "Script approved.");
  };

  const editApprovedScript = () => {
    setStatuses((current) => ({
      ...current,
      script: "waiting-studio",
      storyboard: stages.includes("storyboard") ? "waiting-studio" : current.storyboard,
    }));
    setSelectedStage("script");
    setNotice("Script and Storyboard are no longer approved. Storyboard images on unchanged rows were preserved.");
  };

  const addStoryboardImage = (rowId: StoryboardRowId) => {
    setStoryboardImages((current) => ({ ...current, [rowId]: true }));
    setNotice(storyboardImages[rowId] ? "Storyboard image replaced." : "Storyboard image added.");
  };

  const updatePostProductionTerm = (term: ProductionFlowPostProductionTerm) => {
    setPostProductionTerm(term);
    setNotice(`${getProductionFlowStageDefinition("edit", term).label} selected for this project. Versions, comments, approvals and permissions are unchanged.`);
  };

  const previewVideoType = (videoType: string) => {
    const template = getRecommendedProductionFlow(videoType, appliedBriefOverride);
    setDraftVideoType(videoType);
    setDraftBriefOverride(appliedBriefOverride);
    applyTemplate(template, videoType, appliedBriefOverride);
  };

  const previewProductionAnswer = (briefOverride: ProductionBriefOverride) => {
    const template = getRecommendedProductionFlow(appliedVideoType, briefOverride);
    setDraftVideoType(appliedVideoType);
    setDraftBriefOverride(briefOverride);
    applyTemplate(template, appliedVideoType, briefOverride);
  };

  const previewTemplate = (template: ProductionFlowTemplate) => {
    const videoType = template.videoTypes[0] ?? appliedVideoType;
    const override: ProductionBriefOverride = template.id === "default"
      ? "existing-footage"
      : template.id === "mixed"
        ? "mixed"
        : "video-type";
    setDraftVideoType(videoType);
    setDraftBriefOverride(override);
    applyTemplate(template, videoType, override);
  };

  return (
    <main className="production-flow-shell">
      <header className="production-flow-page-header">
        <div>
          <span className="production-flow-badge label-xs-semibold">Project workflow</span>
          <h1 className="headings-l-bold">Production flow</h1>
          <p className="paragraph-m">Brisk recommends one adaptable flow from the completed Brief. Studios can then adjust it without losing work.</p>
        </div>
        <div className="production-flow-role-summary">
          <DsIcon name={selectedRole === "Customer" ? "users-three" : "video-camera-ds"} size={18} />
          <div>
            <span className="label-xs">Viewing as</span>
            <strong className="label-s-semibold">{selectedRole}</strong>
          </div>
        </div>
      </header>

      <section className="production-flow-brief" aria-labelledby="production-flow-brief-heading">
        <header>
          <div>
            <span className="label-xs-semibold">Completed Brief simulation</span>
            <h2 className="headings-xs-bold" id="production-flow-brief-heading">See how Brisk recommends a flow</h2>
          </div>
          <span className="production-flow-recommendation label-s-semibold">
            Recommended: {recommendedTemplate.label}
          </span>
        </header>
        <div className="production-flow-brief-fields">
          <label>
            <span className="label-s-semibold">Video type</span>
            <BriskSelect
              ariaLabel="Video type"
              clearable={false}
              options={productionVideoTypeOptions}
              placeholder="Choose video type"
              searchable
              value={draftVideoType}
              onChange={(value) => { if (value) setDraftVideoType(value); }}
            />
          </label>
          <label>
            <span className="label-s-semibold">Explicit production answer</span>
            <BriskSelect
              ariaLabel="Explicit production answer"
              clearable={false}
              options={productionBriefOverrideOptions}
              placeholder="Choose production answer"
              value={draftBriefOverride}
              onChange={(value) => { if (value) setDraftBriefOverride(value); }}
            />
          </label>
          <div className="production-flow-brief-action">
            <Button size="M" onClick={completeBrief}>Complete Brief and create flow</Button>
          </div>
        </div>
        {recommendationIsPending ? (
          <p className="production-flow-pending label-xs"><DsIcon name="info" size={14} />The project flow stays unchanged while the Brief is being answered.</p>
        ) : null}
      </section>

      <ProductionFlowRail
        stages={stages}
        selectedStage={selectedStage}
        statuses={statuses}
        postProductionTerm={postProductionTerm}
        mediaCount={12}
        onAddStage={addStage}
        onHideStage={hideStage}
        onReorderStage={reorderStage}
        onPostProductionTermChange={updatePostProductionTerm}
        onReset={resetToRecommendedFlow}
        onSelectStage={setSelectedStage}
      />

      <div className="production-flow-notice" role="status">
        <DsIcon name="info" size={16} />
        <span className="label-s">{notice}</span>
      </div>

      <ProductionFlowStagePreview
        selectedStage={selectedStage}
        template={appliedTemplate}
        showInterviewQuestions={appliedTemplate.id === "interview" || appliedTemplate.id === "mixed"}
        statuses={statuses}
        postProductionTerm={postProductionTerm}
        storyboardImages={storyboardImages}
        videoType={appliedVideoType}
        briefAnswer={briefAnswerLabel}
        onApproveScript={approveScript}
        onEditApprovedScript={editApprovedScript}
        onAddStoryboardImage={addStoryboardImage}
      />

      <section className="production-flow-mapping" aria-labelledby="production-flow-mapping-heading">
        <header>
          <span className="label-xs-semibold">Video type mapping</span>
          <h2 className="headings-s-bold" id="production-flow-mapping-heading">Template examples</h2>
          <p className="paragraph-s">Choose the Brief answers to see the production flow Brisk recommends.</p>
        </header>
        <div className="production-flow-mapping-controls">
          <label className="production-flow-mapping-select">
            <span className="label-s-semibold">Video type</span>
            <BriskSelect
              ariaLabel="Template example video type"
              clearable={false}
              options={productionVideoTypeOptions}
              placeholder="Choose video type"
              searchable
              value={appliedVideoType}
              onChange={(value) => { if (value) previewVideoType(value); }}
            />
          </label>
          <label className="production-flow-mapping-select">
            <span className="label-s-semibold">Content and production</span>
            <BriskSelect
              ariaLabel="Template example content and production answer"
              clearable={false}
              options={productionBriefOverrideOptions}
              placeholder="Choose production answer"
              value={appliedBriefOverride}
              onChange={(value) => { if (value) previewProductionAnswer(value); }}
            />
          </label>
        </div>
        <article className="production-flow-mapping-result" aria-live="polite">
          <span className="label-xs-semibold">Matching template</span>
          <strong className="headings-xs-bold">{appliedTemplate.label}</strong>
          <p className="label-s-semibold">
            {appliedTemplate.stages.map((stage) => getProductionFlowStageDefinition(stage, postProductionTerm).label).join(" → ")} | Media
          </p>
          <p className="label-xs">{appliedTemplate.summary}</p>
        </article>
        <div className="production-flow-template-list">
          {Object.values(productionFlowTemplates).map((template) => (
            <article key={template.id} className={template.id === appliedTemplate.id ? "is-active" : ""}>
              <div>
                <span className="label-xs-semibold">{template.label}</span>
                <strong className="label-s-semibold">{template.stages.map((stage) => getProductionFlowStageDefinition(stage, template.postProductionTerm).label).join(" → ")} | Media</strong>
                <p className="label-xs">
                  {template.videoTypes.length > 0
                    ? template.videoTypes.join(", ")
                    : template.id === "default"
                      ? "Explicit Brief answer: Existing footage only"
                      : "Explicit Brief answer: Scripted and interview production"}
                </p>
              </div>
              <Button size="S" variant={template.id === appliedTemplate.id ? "tertiary" : "secondary"} onClick={() => previewTemplate(template)}>
                {template.id === appliedTemplate.id ? "Showing" : "Preview"}
              </Button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function insertStage(stages: ProductionFlowStageKey[], stage: ProductionFlowStageKey) {
  const nextStages = [...stages];
  let index = nextStages.length;

  if (stage === "brief") index = 0;
  else if (stage === "script") index = Math.min(1, nextStages.length);
  else if (stage === "shoot") {
    index = getFirstIndex(nextStages, ["edit", "masters"]);
  } else if (stage === "storyboard") {
    const scriptIndex = nextStages.indexOf("script");
    index = scriptIndex >= 0
      ? scriptIndex + 1
      : getFirstIndex(nextStages, ["edit", "masters"]);
  } else if (stage === "edit") {
    const mastersIndex = nextStages.indexOf("masters");
    index = mastersIndex >= 0 ? mastersIndex : nextStages.length;
  }

  nextStages.splice(Math.max(0, index), 0, stage);
  return nextStages;
}

function restoreStage(
  stages: ProductionFlowStageKey[],
  stage: ProductionFlowStageKey,
  location: HiddenStageLocation,
) {
  const nextStages = [...stages];
  const nextStageIndex = location.nextStage ? nextStages.indexOf(location.nextStage) : -1;
  if (nextStageIndex >= 0) {
    nextStages.splice(nextStageIndex, 0, stage);
    return nextStages;
  }

  const previousStageIndex = location.previousStage ? nextStages.indexOf(location.previousStage) : -1;
  if (previousStageIndex >= 0) {
    nextStages.splice(previousStageIndex + 1, 0, stage);
    return nextStages;
  }

  return insertStage(stages, stage);
}

function getFirstIndex(stages: ProductionFlowStageKey[], candidates: ProductionFlowStageKey[]) {
  const indices = candidates.map((candidate) => stages.indexOf(candidate)).filter((index) => index >= 0);
  return indices.length > 0 ? Math.min(...indices) : stages.length;
}

function getFlowValidationIssue(stages: ProductionFlowStageKey[]) {
  if (stages[0] !== "brief") return "Brief must remain the first production stage.";
  if (stages[stages.length - 1] !== "masters") return "Masters must remain the final production stage.";

  const scriptIndex = stages.indexOf("script");
  const storyboardIndex = stages.indexOf("storyboard");
  if (storyboardIndex >= 0 && scriptIndex < 0) return "Storyboard requires an approved Script.";
  if (storyboardIndex >= 0 && storyboardIndex < scriptIndex) return "Storyboard must follow Script.";

  const editIndex = stages.indexOf("edit");
  const mastersIndex = stages.indexOf("masters");
  if (editIndex < 0) return "Masters requires the post-production stage.";
  if (editIndex > mastersIndex) return "Masters must follow the post-production stage.";
  return null;
}

function commitStageOrder(
  stages: ProductionFlowStageKey[],
  setStages: (stages: ProductionFlowStageKey[]) => void,
  setNotice: (notice: string) => void,
) {
  const validationIssue = getFlowValidationIssue(stages);
  if (validationIssue) {
    setNotice(validationIssue);
    return;
  }

  setStages(stages);
  setNotice("Project flow reordered.");
}
