"use client";

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
          <button
            className="chat-call-menu-button"
            type="button"
            aria-label="Open call options"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <DsIcon name="caret-down" size={14} />
          </button>
        </div>

        {isMenuOpen ? (
          <div className="chat-call-menu" role="menu">
            <button className="label-s" type="button" role="menuitem" onClick={openPreview}>
              <DsIcon name="headphones" size={18} />
              Start call
            </button>
            <button className="label-s" type="button" role="menuitem" onClick={copyCallLink}>
              <DsIcon name="link" size={18} />
              Copy call link
            </button>
          </div>
        ) : null}
      </div>

      {isPreviewOpen ? (
        <div className="chat-modal-backdrop chat-call-backdrop" role="presentation" onMouseDown={() => setIsPreviewOpen(false)}>
          <section
            className="chat-call-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-call-preview-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="chat-call-preview-header">
              <div>
                <p className="label-xs">Start a call</p>
                <h2 id="chat-call-preview-title">{contextName}</h2>
              </div>
              <button
                className="chat-icon-button"
                type="button"
                aria-label="Close call preview"
                onClick={() => setIsPreviewOpen(false)}
              >
                <DsIcon name="x-close-cross" size={18} />
              </button>
            </header>

            <div className="chat-call-preview-content">
              <div className="chat-call-participant-bar">
                <div className="chat-call-selected-people" aria-label={`${selectedUsers.length} people in this call`}>
                  {selectedUsers.slice(0, 5).map((user) => (
                    <CommentAvatar user={user} compact key={user.id} />
                  ))}
                  <span className="label-s-semibold">{selectedUsers.length} people</span>
                </div>
                <div className="chat-call-add-people">
                  <button
                    className="chat-secondary-button label-s-semibold"
                    type="button"
                    aria-expanded={isPeoplePickerOpen}
                    onClick={() => setIsPeoplePickerOpen((current) => !current)}
                  >
                    <DsIcon name="users-three" size={16} />
                    Add people
                  </button>
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
                  <select aria-label="Microphone">
                    <option>MacBook microphone</option>
                    <option>Studio headset</option>
                  </select>
                </label>
                <label>
                  <span className="label-xs-semibold"><DsIcon name="speaker-high" size={16} /> Speaker</span>
                  <select aria-label="Speaker">
                    <option>MacBook speakers</option>
                    <option>Studio headset</option>
                  </select>
                </label>
                <label>
                  <span className="label-xs-semibold"><DsIcon name="video-camera" size={16} /> Camera</span>
                  <select aria-label="Camera">
                    <option>FaceTime HD camera</option>
                    <option>External camera</option>
                  </select>
                </label>
              </div>
            </div>

            <footer className="chat-call-preview-footer">
              <button className="chat-secondary-button label-s-semibold" type="button" onClick={() => setIsPreviewOpen(false)}>
                Cancel
              </button>
              <button
                className="chat-primary-button label-s-semibold"
                type="button"
                onClick={() => {
                  setIsPreviewOpen(false);
                  onNotify(`Call started in ${contextName} with ${selectedUsers.length} people`);
                }}
              >
                <DsIcon name="headphones" size={18} />
                Start call
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
