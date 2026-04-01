import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Club, FriendSearchResult, completeOnboarding, getDiscovery, getInterests, getMyInterests } from "../api/client";
import { InterestPicker } from "../components/InterestPicker";
import { OnboardingStepHeader } from "../components/OnboardingStepHeader";
import { useAppState } from "../state/appState";

type OnboardingStep = 0 | 1 | 2 | 3 | 4;

function toggleSelection(current: string[], value: string, limit: number) {
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }
  if (current.length >= limit) {
    return current;
  }
  return [...current, value];
}

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { authLoaded, authUser, refreshSessionState } = useAppState();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [step, setStep] = useState<OnboardingStep>(0);
  const [availableInterests, setAvailableInterests] = useState<string[]>([]);
  const [recommendedClubs, setRecommendedClubs] = useState<Club[]>([]);
  const [suggestedFriends, setSuggestedFriends] = useState<FriendSearchResult[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  const isEditingPreferences = Boolean(authUser?.onboardingCompleted);
  const totalSteps = 5;

  useEffect(() => {
    if (!authLoaded || !authUser) {
      return;
    }

    const sessionUser = authUser;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setSubmitError("");
      try {
        const [interestOptions, currentInterests, discovery] = await Promise.all([
          getInterests(),
          getMyInterests(),
          getDiscovery(),
        ]);
        if (cancelled) return;

        setAvailableInterests(interestOptions);
        setRecommendedClubs(discovery.recommendedClubs.slice(0, 6));
        setSuggestedFriends(discovery.suggestedFriends.slice(0, 6));
        setSelectedInterests(currentInterests.length ? currentInterests : discovery.selectedInterests ?? []);
        setSelectedClubIds(
          discovery.recommendedClubs
            .filter((club) => sessionUser.favoriteClubIds.includes(club.id))
            .slice(0, 6)
            .map((club) => club.id),
        );
      } catch (error: any) {
        if (cancelled) return;
        setSubmitError(error?.response?.data?.error ?? "Could not load onboarding.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [authLoaded, authUser]);

  const summary = useMemo(
    () => ({
      interests: selectedInterests.slice(0, 3).join(", "),
      clubs: recommendedClubs.filter((club) => selectedClubIds.includes(club.id)).map((club) => club.name),
      friends: suggestedFriends.filter((friend) => selectedFriendIds.includes(friend.id)).map((friend) => friend.name),
    }),
    [recommendedClubs, selectedClubIds, selectedFriendIds, selectedInterests, suggestedFriends],
  );

  if (!authLoaded) {
    return (
      <div className="page">
        <div className="placeholderCard">Loading onboarding...</div>
      </div>
    );
  }

  if (!authUser) {
    return null;
  }

  const stepConfig = [
    {
      eyebrow: isEditingPreferences ? "Preferences" : "Welcome",
      title: isEditingPreferences ? "Tune your recommendations" : `Welcome, ${authUser.name.split(" ")[0]}`,
      subtitle: isEditingPreferences
        ? "Update the interests and starter signals that shape your For You feed."
        : "Set a few preferences so the app can feel more personal from the start.",
    },
    {
      eyebrow: "Interests",
      title: "Pick what you are into",
      subtitle: "Choose up to six interests. These boost clubs, events, and discovery surfaces across the app.",
    },
    {
      eyebrow: "Starter Clubs",
      title: "Follow a few starter clubs",
      subtitle: "These club follows help personalize event recommendations right away.",
    },
    {
      eyebrow: "Starter Friends",
      title: "Find a few familiar faces",
      subtitle: "Optional. Send a few starter friend requests based on shared campus overlap.",
    },
    {
      eyebrow: "Finish",
      title: "You are ready to go",
      subtitle: "Review your picks and save them to your account.",
    },
  ] as const;

  const currentStep = stepConfig[step];

  const handleToggleInterest = (interest: string) => {
    setSelectedInterests((current) => toggleSelection(current, interest, 6));
  };

  const handleToggleClub = (clubId: string) => {
    setSelectedClubIds((current) => toggleSelection(current, clubId, 6));
  };

  const handleToggleFriend = (friendId: string) => {
    setSelectedFriendIds((current) => toggleSelection(current, friendId, 4));
  };

  const handleNext = () => {
    setStep((current) => Math.min(current + 1, 4) as OnboardingStep);
  };

  const handleBack = () => {
    setStep((current) => Math.max(current - 1, 0) as OnboardingStep);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setSubmitError("");
    try {
      await completeOnboarding({
        interests: selectedInterests,
        starterClubIds: selectedClubIds,
        starterFriendIds: selectedFriendIds,
      });
      await refreshSessionState();
      navigate("/profile", { replace: true });
    } catch (error: any) {
      setSubmitError(error?.response?.data?.error ?? "Could not save your onboarding choices.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page onboardingPage">
      <div className="detailTopRow">
        <button
          type="button"
          className="backBtn"
          onClick={() => {
            if (step === 0) {
              navigate(isEditingPreferences ? "/profile" : "/");
              return;
            }
            handleBack();
          }}
          aria-label="Back"
        >
          ←
        </button>
        <div className="detailTopTitle">{isEditingPreferences ? "Preferences" : "Onboarding"}</div>
        <div />
      </div>

      <div className="onboardingCard">
        <OnboardingStepHeader
          step={step + 1}
          totalSteps={totalSteps}
          eyebrow={currentStep.eyebrow}
          title={currentStep.title}
          subtitle={currentStep.subtitle}
        />

        {loading ? (
          <div className="placeholderCard">Loading your starter recommendations...</div>
        ) : (
          <>
            {step === 0 ? (
              <div className="onboardingHero">
                <div className="onboardingHeroStatGrid">
                  <div className="heroStatCard">
                    <div className="heroStatValue">{availableInterests.length}</div>
                    <div className="heroStatLabel">Interest lanes</div>
                  </div>
                  <div className="heroStatCard">
                    <div className="heroStatValue">{recommendedClubs.length}</div>
                    <div className="heroStatLabel">Starter clubs</div>
                  </div>
                  <div className="heroStatCard">
                    <div className="heroStatValue">{suggestedFriends.length}</div>
                    <div className="heroStatLabel">Friend suggestions</div>
                  </div>
                </div>
                <div className="onboardingInfoList">
                  <div className="onboardingInfoRow">Your interests persist to the database and feed Home, Explore, and search recommendations.</div>
                  <div className="onboardingInfoRow">Starter clubs are followed immediately when you finish.</div>
                  <div className="onboardingInfoRow">Starter friends are optional and sent as normal friend requests.</div>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="onboardingSection">
                <InterestPicker options={availableInterests} selected={selectedInterests} onToggle={handleToggleInterest} />
                <div className="formHint">
                  {selectedInterests.length > 0
                    ? `${selectedInterests.length} selected. You can update these later from Profile.`
                    : "You can skip this for now, but recommendations will be less tailored."}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="onboardingSelectionGrid">
                {recommendedClubs.length === 0 ? (
                  <div className="placeholderCard">No starter clubs available right now.</div>
                ) : (
                  recommendedClubs.map((club) => {
                    const selected = selectedClubIds.includes(club.id);
                    return (
                      <button
                        key={club.id}
                        type="button"
                        className={`onboardingSelectCard ${selected ? "selected" : ""}`}
                        onClick={() => handleToggleClub(club.id)}
                      >
                        <div className="onboardingSelectTop">
                          <div>
                            <div className="onboardingSelectTitle">{club.name}</div>
                            <div className="onboardingSelectMeta">{club.category}</div>
                          </div>
                          <div className="socialBadge subtle">{selected ? "Following" : "Select"}</div>
                        </div>
                        <div className="onboardingSelectBody">{club.description}</div>
                        {club.becauseYouLike ? <div className="onboardingSelectReason">Because you like {club.becauseYouLike}</div> : null}
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="onboardingSelectionGrid">
                {suggestedFriends.length === 0 ? (
                  <div className="placeholderCard">No friend suggestions available yet.</div>
                ) : (
                  suggestedFriends.map((friend) => {
                    const selected = selectedFriendIds.includes(friend.id);
                    return (
                      <button
                        key={friend.id}
                        type="button"
                        className={`onboardingSelectCard ${selected ? "selected" : ""}`}
                        onClick={() => handleToggleFriend(friend.id)}
                      >
                        <div className="onboardingSelectTop">
                          <div>
                            <div className="onboardingSelectTitle">{friend.name}</div>
                            <div className="onboardingSelectMeta">{[friend.program, friend.year].filter(Boolean).join(" | ") || "Carleton student"}</div>
                          </div>
                          <div className="socialBadge subtle">{selected ? "Requested" : "Add"}</div>
                        </div>
                        <div className="onboardingSelectBody">
                          {[friend.sharedClubCount ? `${friend.sharedClubCount} shared clubs` : "", friend.mutualFriendsCount ? `${friend.mutualFriendsCount} mutual friends` : ""]
                            .filter(Boolean)
                            .join(" | ") || "Suggested from campus overlap"}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="onboardingSummary">
                <div className="sectionBlock compact">
                  <div className="sectionTitle">Interests</div>
                  <div className="mutedText">{summary.interests || "No interests selected yet."}</div>
                </div>
                <div className="sectionBlock compact">
                  <div className="sectionTitle">Starter Clubs</div>
                  <div className="mutedText">{summary.clubs.join(", ") || "No starter clubs selected."}</div>
                </div>
                <div className="sectionBlock compact">
                  <div className="sectionTitle">Starter Friends</div>
                  <div className="mutedText">{summary.friends.join(", ") || "No starter friend requests selected."}</div>
                </div>
              </div>
            ) : null}

            {submitError ? <div className="statusBanner error">{submitError}</div> : null}

            <div className="onboardingActions">
              <button type="button" className="secondaryBtn onboardingActionBtn" onClick={handleBack} disabled={step === 0 || saving}>
                Back
              </button>

              {step < 4 ? (
                <button type="button" className="primaryBtn onboardingActionBtn" onClick={handleNext} disabled={saving}>
                  {step === 0 ? "Get Started" : step >= 2 ? "Continue" : "Next"}
                </button>
              ) : (
                <button type="button" className="primaryBtn onboardingActionBtn" onClick={() => void handleSubmit()} disabled={saving}>
                  {saving ? "Saving..." : isEditingPreferences ? "Save Preferences" : "Finish"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
