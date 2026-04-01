import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Building, Club, globalSearch, SearchResponse, SearchResultEvent, SearchResultUser } from "../api/client";
import { SearchResultsSection } from "../components/SearchResultsSection";
import { SegmentedControl, SegmentedOption } from "../components/filters/SegmentedControl";

type SearchFilter = "all" | "clubs" | "events" | "users" | "buildings";

const RECENT_SEARCHES_KEY = "campus-search-recent";

function formatEventTime(startIso: string) {
  const date = new Date(startIso);
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} · ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function loadRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const normalized = query.trim();
  if (!normalized) return;
  const next = [normalized, ...loadRecentSearches().filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 6);
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

export const Search: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialQuery = ((location.state as { initialQuery?: string } | null) ?? {}).initialQuery ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [results, setResults] = useState<SearchResponse>({ clubs: [], events: [], users: [], buildings: [] });
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());

  useEffect(() => {
    const normalized = query.trim();
    if (!normalized) {
      setResults({ clubs: [], events: [], users: [], buildings: [] });
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const payload = await globalSearch(normalized);
        if (!cancelled) {
          setResults(payload);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  const sections = useMemo(
    () => [
      {
        key: "clubs" as const,
        title: "Clubs",
        items: results.clubs,
      },
      {
        key: "events" as const,
        title: "Events",
        items: results.events,
      },
      {
        key: "users" as const,
        title: "People",
        items: results.users,
      },
      {
        key: "buildings" as const,
        title: "Buildings",
        items: results.buildings,
      },
    ],
    [results],
  );

  const visibleSections = filter === "all" ? sections : sections.filter((section) => section.key === filter);
  const hasAnyResults = sections.some((section) => section.items.length > 0);

  const filterOptions: SegmentedOption<SearchFilter>[] = [
    { value: "all", label: "All" },
    { value: "events", label: "Events" },
    { value: "clubs", label: "Clubs" },
    { value: "users", label: "People" },
    { value: "buildings", label: "Buildings" },
  ];

  const handleOpenClub = (club: Club) => {
    saveRecentSearch(query);
    setRecentSearches(loadRecentSearches());
    navigate(`/clubs/${encodeURIComponent(club.id)}`);
  };

  const handleOpenEvent = (event: SearchResultEvent) => {
    saveRecentSearch(query);
    setRecentSearches(loadRecentSearches());
    navigate(`/event/${encodeURIComponent(event.id)}`);
  };

  const handleOpenUser = (_user: SearchResultUser) => {
    saveRecentSearch(query);
    setRecentSearches(loadRecentSearches());
    navigate("/friends");
  };

  const handleOpenBuilding = (building: Building) => {
    saveRecentSearch(query);
    setRecentSearches(loadRecentSearches());
    navigate(`/building/${encodeURIComponent(building.id)}`);
  };

  return (
    <div className="page detailPage">
      <div className="detailTopRow">
        <button type="button" className="backBtn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <div className="detailTopTitle">Search</div>
        <div />
      </div>

      <div className="searchPageIntro">
        <div className="pageSubtitle">Search clubs, events, people, and buildings from one place.</div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          saveRecentSearch(query);
          setRecentSearches(loadRecentSearches());
        }}
      >
        <input
          type="search"
          className="formInput searchInput"
          placeholder="Search clubs, events, people, buildings"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
        />
      </form>

      <div className="spacer12" />

      <SegmentedControl value={filter} options={filterOptions} onChange={setFilter} />

      <div className="spacer12" />

      {!query.trim() ? (
        <div className="sectionBlock">
          <div className="sectionTitle">Recent Searches</div>
          {recentSearches.length === 0 ? (
            <div className="mutedText">Start typing to search clubs, events, people, and buildings.</div>
          ) : (
            <div className="searchRecentRow">
              {recentSearches.map((item) => (
                <button key={item} type="button" className="searchRecentChip" onClick={() => setQuery(item)}>
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="placeholderCard">Searching...</div>
      ) : !hasAnyResults ? (
        <div className="placeholderCard">No results found for “{query.trim()}”.</div>
      ) : (
        <div className="searchResultsStack">
          {visibleSections.map((section) => (
            <SearchResultsSection key={section.key} title={section.title} count={section.items.length}>
              {section.key === "clubs" &&
                (section.items as Club[]).map((club) => (
                  <button key={club.id} type="button" className="searchResultCard" onClick={() => handleOpenClub(club)}>
                    <div className="searchResultTop">
                      <div className="searchResultTitle">{club.name}</div>
                      <div className="searchResultBadge">Club</div>
                    </div>
                    <div className="searchResultMeta">
                      {club.category} · {club.followerCount ?? 0} followers
                    </div>
                  </button>
                ))}

              {section.key === "events" &&
                (section.items as SearchResultEvent[]).map((event) => (
                  <button key={event.id} type="button" className="searchResultCard" onClick={() => handleOpenEvent(event)}>
                    <div className="searchResultTop">
                      <div className="searchResultTitle">{event.title}</div>
                      <div className="searchResultBadge">Event</div>
                    </div>
                    <div className="searchResultMeta">
                      {formatEventTime(event.startTime)} · {event.buildingName} · {event.room}
                    </div>
                    <div className="searchResultSub">{event.clubName}</div>
                  </button>
                ))}

              {section.key === "users" &&
                (section.items as SearchResultUser[]).map((user) => (
                  <button key={user.id} type="button" className="searchResultCard" onClick={() => handleOpenUser(user)}>
                    <div className="searchResultTop">
                      <div className="searchResultTitle">{user.name}</div>
                      <div className="searchResultBadge">Person</div>
                    </div>
                    <div className="searchResultMeta">{[user.program, user.year].filter(Boolean).join(" · ") || user.email || "Student"}</div>
                    <div className="searchResultSub">
                      {user.privacyNote
                        ? user.privacyNote
                        : user.status === "friends"
                          ? "Friends"
                          : user.status === "requested"
                            ? "Request sent"
                            : user.status === "incoming_request"
                              ? "Incoming request"
                              : "Open Friends to connect"}
                    </div>
                  </button>
                ))}

              {section.key === "buildings" &&
                (section.items as Building[]).map((building) => (
                  <button key={building.id} type="button" className="searchResultCard" onClick={() => handleOpenBuilding(building)}>
                    <div className="searchResultTop">
                      <div className="searchResultTitle">{building.name}</div>
                      <div className="searchResultBadge">Building</div>
                    </div>
                    <div className="searchResultMeta">
                      {building.id.toUpperCase()} · {building.floors.length} floors
                    </div>
                    <div className="searchResultSub">{building.todayEventsCount ?? 0} events today</div>
                  </button>
                ))}
            </SearchResultsSection>
          ))}
        </div>
      )}
    </div>
  );
};
