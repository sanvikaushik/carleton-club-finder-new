import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConversationSummary, getConversations } from "../api/client";
import { ConversationList } from "../components/ConversationList";
import { useAppState } from "../state/appState";

export const Messages: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppState();

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isAuthenticated) {
        setLoading(false);
        setConversations([]);
        return;
      }
      setLoading(true);
      setPageError("");
      try {
        const rows = await getConversations();
        if (!cancelled) {
          setConversations(rows);
        }
      } catch (error: any) {
        if (!cancelled) {
          setPageError(error?.response?.data?.error ?? "Could not load conversations.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 12000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isAuthenticated]);

  return (
    <div className="page detailPage">
      <div className="detailTopRow">
        <button type="button" className="backBtn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <div className="detailTopTitle">Messages</div>
        <div />
      </div>

      {!isAuthenticated ? (
        <div className="sectionBlock">
          <div className="sectionTitle">Sign in to message friends</div>
          <div className="mutedText">Direct messages are tied to your account and your friends list.</div>
          <button type="button" className="primaryBtn" onClick={() => navigate("/login")}>
            Login
          </button>
        </div>
      ) : pageError ? (
        <div className="statusBanner error">{pageError}</div>
      ) : (
        <>
          <div className="pageSubtitle messagePageIntro">Direct chats with your friends. New messages refresh automatically.</div>
          <div className="spacer12" />
          <ConversationList conversations={conversations} loading={loading} onOpenConversation={(conversationId) => navigate(`/messages/${encodeURIComponent(conversationId)}`)} />
        </>
      )}
    </div>
  );
};
