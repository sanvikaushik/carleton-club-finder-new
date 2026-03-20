import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EventModel, Friend, getEvents, getFriends } from "../api/client";
import { FriendList } from "../components/FriendList";

export const Friends: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [events, setEvents] = useState<EventModel[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [f, e] = await Promise.all([getFriends(), getEvents()]);
        if (cancelled) return;
        setFriends(f);
        setEvents(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <h1 className="pageTitle">Friends</h1>
      {loading ? <div className="placeholderCard">Loading friends…</div> : <FriendList friends={friends} events={events} onOpenEvent={(id) => navigate(`/event/${encodeURIComponent(id)}`)} />}
    </div>
  );
};

