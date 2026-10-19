"use client";

import { Fragment } from "react";
import { BriskSelect } from "../../../Brisk DS/src/app/components/Select";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";

export type DocumentAction = {
  id: string;
  label: string;
  icon?: DsIconName;
  dividerBefore?: boolean;
  disabled?: boolean;
  title?: string;
  tone?: "danger";
  onSelect: () => void;
};

export function ScriptDocumentControls({
  actions,
  actionsLabel,
  actionMenu = "legacy",
  commentsLabel = "Comments",
  isActionsOpen,
  isCommentsOpen,
  onActionsOpenChange,
  onCommentsToggle,
}: {
  actions: DocumentAction[];
  actionsLabel: string;
  actionMenu?: "legacy" | "quiet";
  commentsLabel?: string;
  isActionsOpen: boolean;
  isCommentsOpen: boolean;
  onActionsOpenChange: (isOpen: boolean) => void;
  onCommentsToggle: () => void;
}) {
  return (
    <>
      <div className="script-current-version-menu-wrap" aria-label={`${actionsLabel} document controls`}>
        {actionMenu === "quiet" ? <BriskSelect
          mode="action"
          ariaLabel={`${actionsLabel} actions`}
          placeholder={`${actionsLabel} actions`}
          className="script-document-action-menu"
          value=""
          clearable={false}
          open={isActionsOpen}
          onOpenChange={onActionsOpenChange}
          options={actions.map((action) => ({
            value: action.id,
            label: action.label,
            disabled: action.disabled,
            title: action.title,
            tone: action.tone,
            dividerAbove: action.dividerBefore || action.tone === "danger",
          }))}
          onChange={(id) => {
            const action = actions.find((item) => item.id === id);
            if (action && !action.disabled) action.onSelect();
          }}
          actionTrigger={(triggerProps) => <Button {...triggerProps} size="S" variant="ghost">
            {actionsLabel} actions
            <DsIcon name="caret-down" size={14} />
          </Button>}
        /> : <>
        <button
          className="script-header-action-button label-s-semibold"
          type="button"
          aria-label={`Open ${actionsLabel.toLocaleLowerCase("en-AU")} actions`}
          aria-expanded={isActionsOpen}
          onClick={() => onActionsOpenChange(!isActionsOpen)}
        >
          <span>Actions</span>
          <DsIcon name="caret-down" size={14} />
        </button>
        {isActionsOpen ? (
          <span className="script-version-row-menu script-current-version-menu">
            {actions.map((action) => (
              <Fragment key={action.id}>
                {action.dividerBefore ? <span className="script-menu-divider" aria-hidden="true" /> : null}
                <button
                  className={`${action.tone === "danger" ? "delete " : ""}label-xs-semibold`}
                  disabled={action.disabled}
                  title={action.title}
                  type="button"
                  onClick={() => {
                    action.onSelect();
                    onActionsOpenChange(false);
                  }}
                >
                  <span>{action.label}</span>
                  {action.icon ? <DsIcon name={action.icon} size={12} /> : null}
                </button>
              </Fragment>
            ))}
          </span>
        ) : null}
        </>}
      </div>
      <button
        className={`script-header-action-button label-s-semibold ${isCommentsOpen ? "active" : ""}`}
        type="button"
        aria-label={`Show all ${actionsLabel.toLocaleLowerCase("en-AU")} comments`}
        aria-expanded={isCommentsOpen}
        aria-pressed={isCommentsOpen}
        onClick={onCommentsToggle}
      >
        <DsIcon name="chat-circle" size={16} />
        <span>{commentsLabel}</span>
      </button>
    </>
  );
}
