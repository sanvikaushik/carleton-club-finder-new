import React, { useMemo, useState } from "react";
import { SocialUser } from "../api/client";

type Props = {
  open: boolean;
  friends: SocialUser[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (friendIds: string[], message: string) => Promise<void>;
};

export const InviteFriendsSheet: React.FC<Props> = ({ open, friends, busy, onClose, onSubmit }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const selectedCount = selectedIds.length;
  const sortedFriends = useMemo(() => [...friends].sort((left, right) => left.name.localeCompare(right.name)), [friends]);

  if (!open) return null;

  const toggleSelected = (friendId: string) => {
    setSelectedIds((prev) => (prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]));
  };

  const handleSubmit = async () => {
    await onSubmit(selectedIds, message);
    setSelectedIds([]);
    setMessage("");
  };

  return (
    <div className="modalOverlay" role="presentation" onClick={onClose}>
      <div className="modalSheet" role="dialog" aria-modal="true" aria-label="Invite friends" onClick={(event) => event.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <div className="modalTitle">Invite Friends</div>
            <div className="modalSub">Pick a few friends and send them your plan for this event.</div>
          </div>
          <button type="button" className="iconBtn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modalBody inviteSheetBody">
          {sortedFriends.length === 0 ? (
            <div className="placeholderCard">No more friends available to invite right now.</div>
          ) : (
            <div className="socialStack">
              {sortedFriends.map((friend) => {
                const selected = selectedIds.includes(friend.id);
                return (
                  <button
                    key={friend.id}
                    type="button"
                    className={`inviteFriendRow ${selected ? "selected" : ""}`}
                    onClick={() => toggleSelected(friend.id)}
                  >
                    <div>
                      <div className="socialCardTitle">{friend.name}</div>
                      <div className="socialCardMeta">{[friend.program, friend.year].filter(Boolean).join(" · ") || "Friend"}</div>
                    </div>
                    <div className={`socialBadge ${selected ? "" : "subtle"}`}>{selected ? "Selected" : "Select"}</div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="spacer12" />

          <div className="formField">
            <label className="formLabel" htmlFor="invite-message">
              Plan note
            </label>
            <textarea
              id="invite-message"
              className="formInput formTextArea inviteMessageInput"
              placeholder="Optional: Meet at UC at 6:45?"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={240}
            />
          </div>
        </div>

        <div className="modalActions">
          <div className="modalActionRow">
            <button type="button" className="secondaryBtn notificationToolbarBtn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="primaryBtn" onClick={() => void handleSubmit()} disabled={busy || selectedCount === 0}>
              {busy ? "Sending..." : `Send Invite${selectedCount > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
