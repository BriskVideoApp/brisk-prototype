"use client";

import { useEffect, useState, useRef } from "react";
import { Popover } from "../../../Brisk DS/src/app/components/Popover";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { DsIcon } from "@/components/video-review/DsIcon";
import { getTagClass, tagColourOptions, type TagClass } from "@/data/project-tags";

type ProjectTagsProps = {
  projectName: string;
  tags: string[];
  tagOptions: string[];
  tagClasses: Record<string, TagClass>;
  isTagMenuOpen: boolean;
  onToggleTagMenu: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onCreateTag: (tag: string, colour: TagClass) => void;
  readOnly?: boolean;
  showAddAction?: boolean;
};

export function ProjectTags({ projectName, tags, tagOptions, tagClasses, isTagMenuOpen,
  onToggleTagMenu, onAddTag, onRemoveTag, onCreateTag, readOnly = false, showAddAction = false }: ProjectTagsProps) {
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [draftTagName, setDraftTagName] = useState("");
  const [draftTagClass, setDraftTagClass] = useState<TagClass>("critical");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const availableTags = tagOptions.filter((tag) => !tags.includes(tag));

  useEffect(() => {
    if (!isTagMenuOpen) {
      setIsCreatingTag(false);
      setDraftTagName("");
      setDraftTagClass("critical");
    }
  }, [isTagMenuOpen]);

  const submitNewTag = () => {
    const trimmedTagName = draftTagName.trim();

    if (!trimmedTagName) {
      return;
    }

    onCreateTag(trimmedTagName, draftTagClass);
    requestAnimationFrame(() => triggerRef.current?.focus());
    setIsCreatingTag(false);
    setDraftTagName("");
    setDraftTagClass("critical");
  };

  return (
    <div className="project-meta-row" onClick={(event) => event.stopPropagation()}>
      {tags.map((tag) => (
        <span className={`project-tag-chip tag-option ${getTagClass(tag, tagClasses)} label-s-semibold`} key={tag}>
          {tag}
          {!readOnly ? <button
            className="project-tag-remove"
            type="button"
            aria-label={`Remove ${tag} tag from ${projectName}`}
            onClick={(event) => {
              event.stopPropagation();
              onRemoveTag(tag);
            }}
          >
            ×
          </button> : null}
        </span>
      ))}
      {!readOnly ? <Popover
        open={isTagMenuOpen}
        onOpenChange={(open) => {
          if (open) setIsCreatingTag(tagOptions.length === 0);
          if (open !== isTagMenuOpen) onToggleTagMenu();
        }}
        title={isCreatingTag ? "Create tag" : "Select a tag"}
        trigger={(props) => {
          const bindTrigger: typeof props.ref = (node) => {
            triggerRef.current = node;
            if (typeof props.ref === "function") props.ref(node);
            else if (props.ref) props.ref.current = node;
          };
          return showAddAction && tags.length === 0 ? <Button {...props} ref={bindTrigger}
            size="S" variant="ghost" aria-label={`Add tag to ${projectName}`}>
            <DsIcon name="plus" size={16} />Add tag
          </Button> : <button {...props} ref={bindTrigger}
            className={`project-plus-action label-s${showAddAction ? " is-visible" : ""}`}
            type="button" aria-label={`Add tag to ${projectName}`}>+</button>;
        }}
      >
        <div className="project-tag-options">
          {!isCreatingTag && availableTags.length > 0 ? (
            availableTags.map((tag) => (
              <button
                className="project-tag-menu-option label-s"
                type="button"
                key={tag}
                onClick={(event) => {
                  event.stopPropagation();
                  onAddTag(tag);
                  requestAnimationFrame(() => triggerRef.current?.focus());
                }}
              >
                <span className={`tag-option ${getTagClass(tag, tagClasses)}`}>{tag}</span>
              </button>
            ))
          ) : !isCreatingTag ? (
            <span className="project-tag-menu-empty label-s">{tagOptions.length ? "All tags are added." : "No tags yet. Create your first tag."}</span>
          ) : null}
          {isCreatingTag ? (
            <div className="project-tag-create-form">
              <input
                className="project-tag-input label-s"
                type="text"
                aria-label="Tag name"
                value={draftTagName}
                placeholder="Tag name..."
                autoFocus
                onChange={(event) => setDraftTagName(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitNewTag();
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    setIsCreatingTag(false);
                    setDraftTagName("");
                  }
                }}
              />
              <div className="project-tag-colour-grid" aria-label="Tag colour">
                {tagColourOptions.map((tagColour) => (
                  <button
                    className={`project-tag-colour-swatch tag-option ${tagColour.className} ${
                      draftTagClass === tagColour.className ? "selected" : ""
                    }`}
                    type="button"
                    key={tagColour.className}
                    aria-label={tagColour.label}
                    aria-pressed={draftTagClass === tagColour.className}
                    onClick={(event) => {
                      event.stopPropagation();
                      setDraftTagClass(tagColour.className);
                    }}
                  />
                ))}
              </div>
              <div className="project-tag-create-actions">
                <Button size="S" variant="primary"
                  className="project-tag-create-submit"
                  type="button"
                  disabled={draftTagName.trim().length === 0}
                  onClick={(event) => {
                    event.stopPropagation();
                    submitNewTag();
                  }}
                >
                  Create
                </Button>
                <Button size="S" variant="ghost"
                  className="project-tag-create-cancel"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsCreatingTag(false);
                    setDraftTagName("");
                    if (tagOptions.length === 0) onToggleTagMenu();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="project-tag-create label-s-semibold"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsCreatingTag(true);
              }}
            >
              <span aria-hidden="true">+</span>
              Create new tag
            </button>
          )}
        </div>
      </Popover> : null}
    </div>
  );
}
