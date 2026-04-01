import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Club,
  EventModel,
  getClubs,
  getEvents,
  getManagedClubs,
  getMyPrivacySettings,
  PrivacySettings,
  uploadProfileImage,
  updateMyPrivacySettings,
} from "../api/client";
import { ImageUploadField } from "../components/ImageUploadField";
import { useAppState } from "../state/appState";

function formatDayTime(startIso: string) {
  const date = new Date(startIso);
  return `${date.toLocaleDateString([], { weekday: "short" })} | ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", help: "Anyone in the app can see this." },
  { value: "friends", label: "Friends only", help: "Only confirmed friends can see this." },
  { value: "private", label: "Private", help: "Only you can see this." },
] as const;

const FRIEND_REQUEST_OPTIONS = [
  { value: "everyone", label: "Everyone", help: "Any student can send a request." },
  { value: "mutuals_only", label: "Mutuals only", help: "Only students with mutual friends can request." },
  { value: "nobody", label: "Nobody", help: "No new friend requests." },
] as const;

const MESSAGE_OPTIONS = [
  { value: "friends", label: "Friends", help: "Only friends can start chats or invite you." },
  { value: "nobody", label: "Nobody", help: "Turn this off entirely." },
] as const;

type PrivacyFormState = Omit<PrivacySettings, "id" | "userId" | "createdAt" | "updatedAt">;

function formatPrivacySummary(settings: PrivacyFormState | null) {
  if (!settings) return [];
  return [
    `Profile: ${settings.profileVisibility}`,
    `Attendance: ${settings.attendanceVisibility}`,
    `Messages: ${settings.allowMessagesFrom}`,
    settings.showInSearch ? "Search visible" : "Hidden from search",
  ];
}

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, authUser, isAuthenticated, favoriteClubIds, goingEventIds, toggleFavoriteClub, isEventGoing, logOutUser, refreshSessionState } = useAppState();

  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<EventModel[]>([]);
  const [managedClubs, setManagedClubs] = useState<Club[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [privacyForm, setPrivacyForm] = useState<PrivacyFormState | null>(null);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyError, setPrivacyError] = useState("");
  const [privacySuccess, setPrivacySuccess] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreviewUrl, setProfileImagePreviewUrl] = useState<string | null>(null);
  const [profileImageBusy, setProfileImageBusy] = useState(false);
  const [profileImageError, setProfileImageError] = useState("");
  const [profileImageSuccess, setProfileImageSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [clubRows, eventRows, managedClubRows, privacyRows] = await Promise.all([
          getClubs(),
          getEvents(),
          isAuthenticated ? getManagedClubs().catch(() => []) : Promise.resolve([]),
          isAuthenticated ? getMyPrivacySettings().catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setClubs(clubRows);
        setEvents(eventRows);
        setManagedClubs(managedClubRows);
        setPrivacySettings(privacyRows);
        setPrivacyForm(
          privacyRows
            ? {
                profileVisibility: privacyRows.profileVisibility,
                clubsVisibility: privacyRows.clubsVisibility,
                attendanceVisibility: privacyRows.attendanceVisibility,
                activityVisibility: privacyRows.activityVisibility,
                allowFriendRequestsFrom: privacyRows.allowFriendRequestsFrom,
                allowMessagesFrom: privacyRows.allowMessagesFrom,
                allowEventInvitesFrom: privacyRows.allowEventInvitesFrom,
                showInSearch: privacyRows.showInSearch,
              }
            : null,
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const favoriteClubs = useMemo(() => clubs.filter((club) => favoriteClubIds.has(club.id)), [clubs, favoriteClubIds]);
  const goingEvents = useMemo(() => events.filter((event) => goingEventIds.has(event.id)), [events, goingEventIds]);
  const streak = Math.min(goingEvents.length, 7);
  const privacyBadges = useMemo(() => formatPrivacySummary(privacyForm), [privacyForm]);
  const badges = [
    { id: "explorer", label: "Explorer", unlocked: goingEvents.length >= 2 },
    { id: "social", label: "Social", unlocked: favoriteClubs.length >= 3 },
    { id: "pulse", label: "Pulse", unlocked: goingEvents.some((event) => event.happeningNow) },
  ];

  const handlePrivacySave = async () => {
    if (!privacyForm) return;
    setPrivacySaving(true);
    setPrivacyError("");
    setPrivacySuccess("");
    try {
      const updated = await updateMyPrivacySettings(privacyForm);
      setPrivacySettings(updated);
      setPrivacyForm({
        profileVisibility: updated.profileVisibility,
        clubsVisibility: updated.clubsVisibility,
        attendanceVisibility: updated.attendanceVisibility,
        activityVisibility: updated.activityVisibility,
        allowFriendRequestsFrom: updated.allowFriendRequestsFrom,
        allowMessagesFrom: updated.allowMessagesFrom,
        allowEventInvitesFrom: updated.allowEventInvitesFrom,
        showInSearch: updated.showInSearch,
      });
      setPrivacySuccess("Privacy settings updated.");
    } catch (error: any) {
      setPrivacyError(error?.response?.data?.error ?? "Could not save privacy settings.");
    } finally {
      setPrivacySaving(false);
    }
  };

  const handleProfileImageFileChange = (file: File | null) => {
    if (profileImagePreviewUrl) {
      URL.revokeObjectURL(profileImagePreviewUrl);
    }
    setProfileImageFile(file);
    setProfileImagePreviewUrl(file ? URL.createObjectURL(file) : null);
    setProfileImageError("");
    setProfileImageSuccess("");
  };

  const handleProfileImageUpload = async () => {
    if (!profileImageFile) return;
    setProfileImageBusy(true);
    setProfileImageError("");
    setProfileImageSuccess("");
    try {
      await uploadProfileImage(profileImageFile);
      await refreshSessionState();
      setProfileImageSuccess("Profile image updated.");
      setProfileImageFile(null);
      if (profileImagePreviewUrl) {
        URL.revokeObjectURL(profileImagePreviewUrl);
      }
      setProfileImagePreviewUrl(null);
    } catch (error: any) {
      setProfileImageError(error?.response?.data?.error ?? "Could not upload the profile image.");
    } finally {
      setProfileImageBusy(false);
    }
  };

  return (
    <div className="page">
      <h1 className="pageTitle">Profile</h1>

      {loading ? (
        <div className="placeholderCard">Loading profile...</div>
      ) : (
        <>
          <div className="profileHero upgraded">
            <div className="profileHeroTop">
              <div className="profileHeroAvatarWrap">
                {profileImagePreviewUrl || user?.profileImageUrl ? (
                  <img className="profileHeroAvatar" src={profileImagePreviewUrl || user?.profileImageUrl || ""} alt="" />
                ) : (
                  <div className="profileHeroAvatar fallback">{(user?.name ?? "Student").split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("")}</div>
                )}
              </div>
              <div>
                <div className="profileName">{user?.name ?? "Student"}</div>
                <div className="profileProgram">{[user?.program, user?.year].filter(Boolean).join(" | ") || "Carleton student"}</div>
              </div>
            </div>

            <div className="heroStatGrid compactStats">
              <div className="heroStatCard">
                <div className="heroStatValue">{favoriteClubs.length}</div>
                <div className="heroStatLabel">Followed clubs</div>
              </div>
              <div className="heroStatCard">
                <div className="heroStatValue">{goingEvents.length}</div>
                <div className="heroStatLabel">Events joined</div>
              </div>
              <div className="heroStatCard">
                <div className="heroStatValue">{streak}</div>
                <div className="heroStatLabel">Campus streak</div>
              </div>
            </div>

            <div className="profileSessionRow">
              {isAuthenticated ? (
                <>
                  <div className="profileSessionMeta">{authUser?.email ?? "Signed in"}</div>
                  <div className="profileAuthActions">
                    <button type="button" className="secondaryBtn profileSessionBtn" onClick={() => navigate("/messages")}>
                      Messages
                    </button>
                    <button type="button" className="secondaryBtn profileSessionBtn" onClick={() => void logOutUser()}>
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="profileSessionMeta">Demo mode. Log in to make this profile yours.</div>
                  <div className="profileAuthActions">
                    <button type="button" className="secondaryBtn profileSessionBtn" onClick={() => navigate("/login")}>
                      Login
                    </button>
                    <button type="button" className="primaryBtn profileSessionPrimary" onClick={() => navigate("/signup")}>
                      Sign Up
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {isAuthenticated ? (
            <div className="sectionBlock">
              <div className="sectionTitle">Profile Photo</div>
              <ImageUploadField
                title="Upload profile image"
                helperText="This photo will appear on your profile, in friend lists, and in chat/social surfaces."
                currentImageUrl={user?.profileImageUrl}
                previewUrl={profileImagePreviewUrl}
                fallbackLabel={user?.name || "Student"}
                inputId="profile-image-upload"
                busy={profileImageBusy}
                onFileChange={handleProfileImageFileChange}
              />
              {profileImageError ? <div className="statusBanner error">{profileImageError}</div> : null}
              {profileImageSuccess ? <div className="statusBanner success">{profileImageSuccess}</div> : null}
              <div className="profilePreferenceActions">
                <button type="button" className="primaryBtn notificationToolbarBtn" onClick={() => void handleProfileImageUpload()} disabled={!profileImageFile || profileImageBusy}>
                  {profileImageBusy ? "Uploading..." : "Save Profile Photo"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="sectionBlock">
            <div className="sectionTitle">Interests</div>
            {user?.interests?.length ? (
              <>
                <div className="interestChipGrid">
                  {user.interests.map((interest) => (
                    <div key={interest} className="interestChip active static">
                      {interest}
                    </div>
                  ))}
                </div>
                <div className="profilePreferenceActions">
                  <button type="button" className="secondaryBtn notificationToolbarBtn" onClick={() => navigate("/onboarding")}>
                    Edit Preferences
                  </button>
                </div>
              </>
            ) : (
              <div className="preferencesEmptyState">
                <div className="mutedText">
                  Pick a few interests to improve recommendations across Home, Explore, and club suggestions.
                </div>
                <button type="button" className="primaryBtn notificationToolbarBtn" onClick={() => navigate("/onboarding")}>
                  Set Interests
                </button>
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <div className="sectionBlock">
              <div className="sectionTitle">Privacy Controls</div>
              <div className="mutedText">
                Decide who can see your activity, message you, and send invites. Existing features stay the same for people who still have access.
              </div>
              <div className="privacyBadgeRow">
                {privacyBadges.map((item) => (
                  <span key={item} className="socialBadge subtle">
                    {item}
                  </span>
                ))}
              </div>

              {privacyError ? <div className="statusBanner error">{privacyError}</div> : null}
              {privacySuccess ? <div className="statusBanner success">{privacySuccess}</div> : null}

              {loading || !privacyForm ? (
                <div className="placeholderCard">Loading privacy settings...</div>
              ) : (
                <div className="privacySettingsGrid">
                  <label className="privacySettingCard">
                    <span className="privacySettingTitle">Profile visibility</span>
                    <span className="privacySettingHelp">Control who can see your program, year, and profile details.</span>
                    <select
                      className="formInput"
                      value={privacyForm.profileVisibility}
                      onChange={(event) => setPrivacyForm({ ...privacyForm, profileVisibility: event.target.value as PrivacyFormState["profileVisibility"] })}
                    >
                      {VISIBILITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="privacySettingCard">
                    <span className="privacySettingTitle">Followed clubs</span>
                    <span className="privacySettingHelp">Affects shared clubs, friend activity, and social recommendations.</span>
                    <select
                      className="formInput"
                      value={privacyForm.clubsVisibility}
                      onChange={(event) => setPrivacyForm({ ...privacyForm, clubsVisibility: event.target.value as PrivacyFormState["clubsVisibility"] })}
                    >
                      {VISIBILITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="privacySettingCard">
                    <span className="privacySettingTitle">Event attendance</span>
                    <span className="privacySettingHelp">Controls who can see that you are going to events.</span>
                    <select
                      className="formInput"
                      value={privacyForm.attendanceVisibility}
                      onChange={(event) => setPrivacyForm({ ...privacyForm, attendanceVisibility: event.target.value as PrivacyFormState["attendanceVisibility"] })}
                    >
                      {VISIBILITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="privacySettingCard">
                    <span className="privacySettingTitle">Activity feed</span>
                    <span className="privacySettingHelp">Controls whether friends can see your campus activity feed items.</span>
                    <select
                      className="formInput"
                      value={privacyForm.activityVisibility}
                      onChange={(event) => setPrivacyForm({ ...privacyForm, activityVisibility: event.target.value as PrivacyFormState["activityVisibility"] })}
                    >
                      {VISIBILITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="privacySettingCard">
                    <span className="privacySettingTitle">Friend requests</span>
                    <span className="privacySettingHelp">Choose who can send you a new request.</span>
                    <select
                      className="formInput"
                      value={privacyForm.allowFriendRequestsFrom}
                      onChange={(event) => setPrivacyForm({ ...privacyForm, allowFriendRequestsFrom: event.target.value as PrivacyFormState["allowFriendRequestsFrom"] })}
                    >
                      {FRIEND_REQUEST_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="privacySettingCard">
                    <span className="privacySettingTitle">Who can message me</span>
                    <span className="privacySettingHelp">Existing friends can still view old chats, but new messages respect this setting.</span>
                    <select
                      className="formInput"
                      value={privacyForm.allowMessagesFrom}
                      onChange={(event) => setPrivacyForm({ ...privacyForm, allowMessagesFrom: event.target.value as PrivacyFormState["allowMessagesFrom"] })}
                    >
                      {MESSAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="privacySettingCard">
                    <span className="privacySettingTitle">Who can invite me</span>
                    <span className="privacySettingHelp">Controls who can include you in event plans.</span>
                    <select
                      className="formInput"
                      value={privacyForm.allowEventInvitesFrom}
                      onChange={(event) => setPrivacyForm({ ...privacyForm, allowEventInvitesFrom: event.target.value as PrivacyFormState["allowEventInvitesFrom"] })}
                    >
                      {MESSAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="privacySettingCard privacyToggleCard">
                    <span className="privacySettingTitle">Show me in search</span>
                    <span className="privacySettingHelp">Turn this off to hide from global student search for other people.</span>
                    <button
                      type="button"
                      className={`togglePill ${privacyForm.showInSearch ? "active" : ""}`}
                      onClick={() => setPrivacyForm({ ...privacyForm, showInSearch: !privacyForm.showInSearch })}
                    >
                      {privacyForm.showInSearch ? "Visible in search" : "Hidden from search"}
                    </button>
                  </label>
                </div>
              )}

              <div className="profilePreferenceActions">
                <button type="button" className="primaryBtn notificationToolbarBtn" onClick={() => void handlePrivacySave()} disabled={privacySaving || !privacyForm}>
                  {privacySaving ? "Saving..." : "Save Privacy Settings"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="sectionBlock">
            <div className="sectionTitle">Organizer Dashboard</div>
            {managedClubs.length === 0 ? (
              <div className="mutedText">You are not managing any clubs yet.</div>
            ) : (
              <div className="listStack">
                {managedClubs.map((club) => (
                  <div key={club.id} className="profileListRow organizerDashboardRow">
                    <div className="profileListMain">
                      <div className="profileListName">{club.name}</div>
                      <div className="profileListMeta">
                        {[club.userRole, `${club.activeEventCount ?? 0} active events`, `${club.followerCount ?? 0} followers`].filter(Boolean).join(" | ")}
                      </div>
                    </div>
                    <div className="inlineActionRow">
                      {club.canManageEvents ? (
                        <button type="button" className="secondaryBtn organizerActionBtn" onClick={() => navigate(`/clubs/${encodeURIComponent(club.id)}/events/create`)}>
                          Create Event
                        </button>
                      ) : null}
                      {club.canEditClub ? (
                        <button type="button" className="secondaryBtn organizerActionBtn" onClick={() => navigate(`/clubs/${encodeURIComponent(club.id)}/edit`)}>
                          Edit Club
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sectionBlock">
            <div className="sectionTitle">Badges</div>
            <div className="badgeShelf">
              {badges.map((badge) => (
                <div key={badge.id} className={`badgeCard ${badge.unlocked ? "unlocked" : ""}`}>
                  <div className="badgeCardTitle">{badge.label}</div>
                  <div className="badgeCardMeta">{badge.unlocked ? "Unlocked" : "Keep exploring"}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="sectionBlock">
            <div className="sectionTitle">Followed Clubs</div>
            {favoriteClubs.length === 0 ? (
              <div className="mutedText">{isAuthenticated ? "No followed clubs yet." : "Log in to follow clubs with your own account."}</div>
            ) : (
              <div className="listStack">
                {favoriteClubs.map((club) => (
                  <div key={club.id} className="profileListRow">
                    <div className="profileListMain">
                      <div className="profileListName">{club.name}</div>
                      <div className="profileListMeta">
                        {club.category} | {club.followerCount ?? 0} followers
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`followBtn small ${favoriteClubIds.has(club.id) ? "active" : ""}`}
                      onClick={() => {
                        if (!authUser) {
                          navigate("/login");
                          return;
                        }
                        toggleFavoriteClub(club.id);
                      }}
                    >
                      {favoriteClubIds.has(club.id) ? "Following" : "Follow"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sectionBlock">
            <div className="sectionTitle">Events You're Going To</div>
            {goingEvents.length === 0 ? (
              <div className="mutedText">No events marked as going.</div>
            ) : (
              <div className="listStack">
                {goingEvents.map((event) => (
                  <div key={event.id} className="profileEventRow">
                    <div className="profileEventMain">
                      <div className="profileEventTitle">{event.title}</div>
                      <div className="profileEventMeta">
                        {event.building} | {event.room} | {formatDayTime(event.startTime)}
                      </div>
                    </div>
                    <div className="goingPill">{isEventGoing(event.id) ? "Going" : "Saved"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
