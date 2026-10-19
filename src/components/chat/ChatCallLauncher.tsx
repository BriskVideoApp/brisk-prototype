"use client";

import { Button } from "../../../Brisk DS/src/app/components/Button";

import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";
import { BriskSelect } from "@/components/form/BriskSelect";

import { useEffect, useMemo, useState } from "react";
import { CommentAvatar } from "@/components/comments/CommentPrimitives";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { ChatUser } from "@/components/chat/types";

type ChatCallLauncherProps = {
  contextName: string;
  currentUserId: string;
  defaultMemberIds: string[];
  availableMemberIds: string[];
  users: ChatUser[];
  prominent?: boolean;
  onNotify: (message: string) => void;
};

export function ChatCallLauncher({
  contextName,
  currentUserId,
  defaultMemberIds,
  availableMemberIds,
  users,
  prominent = false,
  onNotify,
}: ChatCallLauncherProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPeoplePickerOpen, setIsPeoplePickerOpen] = useState(false);
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [microphone, setMicrophone] = useState("MacBook microphone");
  const [speaker, setSpeaker] = useState("MacBook speakers");
  const [camera, setCamera] = useState("FaceTime HD camera");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(defaultMemberIds);
  const defaultMembersKey = defaultMemberIds.join("|");

  useEffect(() => {
    setSelectedMemberIds(defaultMemberIds);
    setIsMenuOpen(false);
    setIsPreviewOpen(false);
    setIsPeoplePickerOpen(false);
  }, [contextName, defaultMembersKey]);

  useEffect(() => {
    if (!isPreviewOpen) {
      return;
    }

    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPreviewOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isPreviewOpen]);

  const availableUsers = useMemo(
    () => users.filter((user) => availableMemberIds.includes(user.id)),
    [availableMemberIds, users],
  );
  const selectedUsers = selectedMemberIds
    .map((userId) => users.find((user) => user.id === userId))
    .filter((user): user is ChatUser => Boolean(user));
  const currentUser = users.find((user) => user.id === currentUserId) ?? users[0];

  const openPreview = () => {
    setIsMenuOpen(false);
    setIsPreviewOpen(true);
  };

  const copyCallLink = async () => {
    const callLink = `https://app.brisk.video/calls/${contextName.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`;

    try {
      await navigator.clipboard.writeText(callLink);
      onNotify("Call link copied");
    } catch {
      onNotify("Call link ready to share");
    }
    setIsMenuOpen(false);
  };

  const toggleMember = (userId: string) => {
    if (userId === currentUserId) {
      return;
    }

    setSelectedMemberIds((current) =>
      current.includes(userId)
        ? current.filter((memberId) => memberId !== userId)
        : [...current, userId],
    );
  };

  return (
    <>
      <div className="chat-call-launcher">
        <div
          className={`chat-call-control ${prominent ? "prominent" : ""}`}
          role="group"
          aria-label={`Call options for ${contextName}`}
        >
          <button
            className={`chat-call-start-button ${prominent ? "label-s-semibold" : ""}`}
            type="button"
            title={`Start a call in ${contextName}`}
            aria-label={`Start a call in ${contextName}`}
            onClick={openPreview}
          >
            <DsIcon name="headphones" size={18} />
            {prominent ? <span>Start a call</span> : null}
          </button>
          <BriskSelect
            mode="action"
            ariaLabel="Open call options"
            placeholder="Call options"
            value=""
            clearable={false}
            open={isMenuOpen}
            onOpenChange={setIsMenuOpen}
            className="chat-call-actions"
            actionTrigger={(props) => <button {...props} className="chat-call-menu-button" type="button"><DsIcon name="caret-down" size={14} /></button>}
            options={[
              { value: "start", label: "Start call", icon: "headphones" },
              { value: "copy", label: "Copy call link", icon: "link" },
            ]}
            onChange={(action) => { if (action === "start") openPreview(); else if (action === "copy") void copyCallLink(); }}
          />
        </div>

      </div>

      {isPreviewOpen ? (
        <EditingDialog title={contextName} size="full" onCancel={() => setIsPreviewOpen(false)} actions={<> <Button size="S" variant="secondary"  type="button" onClick={() => setIsPreviewOpen(false)}>
                Cancel
              </Button>  <Button size="S" variant="primary"

                type="button"
                onClick={() => {
                  setIsPreviewOpen(false);
                  onNotify(`Call started in ${contextName} with ${selectedUsers.length} people`);
                }}
              >
                <DsIcon name="headphones" size={18} />
                Start call
              </Button> </>}>  <div className="chat-call-preview-content">
              <div className="chat-call-participant-bar">
                <div className="chat-call-selected-people" aria-label={`${selectedUsers.length} people in this call`}>
                  {selectedUsers.slice(0, 5).map((user) => (
                    <CommentAvatar user={user} compact key={user.id} />
                  ))}
                  <span className="label-s-semibold">{selectedUsers.length} people</span>
                </div>
                <div className="chat-call-add-people">
                  <Button size="S" variant="secondary"
                    className="chat-secondary-button"
                    type="button"
                    aria-expanded={isPeoplePickerOpen}
                    onClick={() => setIsPeoplePickerOpen((current) => !current)}
                  >
                    <DsIcon name="users-three" size={16} />
                    Add people
                  </Button>
                  {isPeoplePickerOpen ? (
                    <div className="chat-call-people-picker" role="dialog" aria-label="Add people to call">
                      <p className="label-xs-semibold">Invite people</p>
                      {availableUsers.map((user) => {
                        const isSelected = selectedMemberIds.includes(user.id);
                        const isCurrentUser = user.id === currentUserId;

                        return (
                          <button
                            type="button"
                            key={user.id}
                            disabled={isCurrentUser}
                            aria-pressed={isSelected}
                            onClick={() => toggleMember(user.id)}
                          >
                            <CommentAvatar user={user} compact />
                            <span>
                              <strong className="label-s-semibold">{user.name}</strong>
                              <small className="label-xs">{isCurrentUser ? "You" : user.roleLabel}</small>
                            </span>
                            {isSelected ? <DsIcon name="check" size={16} /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="chat-call-preview-stage">
                <span className={`chat-call-self-preview headings-s-bold ${isCameraOn ? "camera-on" : ""}`} aria-label={currentUser?.name}>
                  {currentUser?.initials ?? "NS"}
                </span>
                <strong>{currentUser?.name ?? "You"}</strong>
                <div className="chat-call-preview-toggles" role="group" aria-label="Call preview controls">
                  <button
                    className={isMicrophoneOn ? "active" : ""}
                    type="button"
                    aria-pressed={isMicrophoneOn}
                    onClick={() => setIsMicrophoneOn((current) => !current)}
                  >
                    <DsIcon name="headphones" size={18} />
                    <span className="label-xs-semibold">Mic {isMicrophoneOn ? "on" : "off"}</span>
                  </button>
                  <button
                    className={isCameraOn ? "active" : ""}
                    type="button"
                    aria-pressed={isCameraOn}
                    onClick={() => setIsCameraOn((current) => !current)}
                  >
                    <DsIcon name="video-camera" size={18} />
                    <span className="label-xs-semibold">Camera {isCameraOn ? "on" : "off"}</span>
                  </button>
                </div>
              </div>

              <div className="chat-call-device-grid">
                <label>
                  <span className="label-xs-semibold"><DsIcon name="headphones" size={16} /> Microphone</span>
                  <BriskSelect ariaLabel="Microphone" clearable={false} placeholder="Choose microphone" value={microphone} onChange={setMicrophone} options={["MacBook microphone", "Studio headset"].map((value) => ({ value, label: value }))} />
                </label>
                <label>
                  <span className="label-xs-semibold"><DsIcon name="speaker-high" size={16} /> Speaker</span>
                  <BriskSelect ariaLabel="Speaker" clearable={false} placeholder="Choose speaker" value={speaker} onChange={setSpeaker} options={["MacBook speakers", "Studio headset"].map((value) => ({ value, label: value }))} />
                </label>
                <label>
                  <span className="label-xs-semibold"><DsIcon name="video-camera" size={16} /> Camera</span>
                  <BriskSelect ariaLabel="Camera" clearable={false} placeholder="Choose camera" value={camera} onChange={setCamera} options={["FaceTime HD camera", "External camera"].map((value) => ({ value, label: value }))} />
                </label>
              </div>
            </div>  </EditingDialog>
      ) : null}
    </>
  );
}
