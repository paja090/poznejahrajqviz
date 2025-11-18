// pages/Scoreboard.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  collection,
  doc,
  onSnapshot,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import NeonLayout from "../components/NeonLayout";
import { evaluateAnswer } from "../utils/evaluateAnswer";

export default function Scoreboard() {
  const { roomCode } = useParams();
  const [players, setPlayers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [expanded, setExpanded] = useState(null);

  const playerId = localStorage.getItem("playerId");

  // --------------------------
  // Load Players
  // --------------------------
  useEffect(() => {
    const ref = collection(db, "quizRooms", roomCode, "players");
    return onSnapshot(ref, (snap) => {
      const arr = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => b.score - a.score);
      setPlayers(arr);
    });
  }, [roomCode]);

  // --------------------------
  // Load Questions
  // --------------------------
  useEffect(() => {
    const qRef = collection(db, "quizRooms", roomCode, "questions");
    return onSnapshot(qRef, (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [roomCode]);

  // --------------------------
  // Load Answers
  // --------------------------
  useEffect(() => {
    const load = async () => {
      const aRef = collection(db, "quizRooms", roomCode, "answers");
      const aSnap = await getDocs(aRef);
      setAnswers(aSnap.docs.map((d) => d.data()));
    };
    load();
  }, [roomCode]);

  // --------------------------
  // Build details per player
  // --------------------------
  const getPlayerAnswers = (pid) => {
    const out = [];

    questions.forEach((q) => {
      const ans = answers.find(
        (a) => a.playerId === pid && a.questionId === q.id
      );

      if (!ans) {
        out.push({
          q,
          answered: false,
          correct: false,
        });
      } else {
        const correct = evaluateAnswer(q, ans.answer);
        out.push({
          q,
          answered: true,
          correct,
          answer: ans.answer,
        });
      }
    });

    return out;
  };

  // --------------------------
  // Toggle detail
  // --------------------------
  const toggleExpand = (pid) => {
    setExpanded((prev) => (prev === pid ? null : pid));
  };

  // --------------------------
  // RENDER
  // --------------------------
  return (
    <NeonLayout maxWidth={650}>
      <div className="neon-card">
        <h1 style={styles.title}>
          📊 Žebříček – {roomCode}
        </h1>

        <div style={{ marginBottom: 14 }}>
          <Link
            to={`/host/${roomCode}`}
            style={{
              fontSize: 13,
              color: "white",
              opacity: 0.8,
              textDecoration: "none",
            }}
          >
            ← Zpět do moderátoru
          </Link>
        </div>

        {/* PLAYERS */}
        <div>
          {players.map((p, index) => {
            const isMe = p.id === playerId;
            const rank = index + 1;
            const medal =
              rank === 1
                ? "🥇"
                : rank === 2
                ? "🥈"
                : rank === 3
                ? "🥉"
                : `${rank}.`;

            return (
              <div
                key={p.id}
                style={{
                  ...styles.playerRow,
                  background: isMe
                    ? "rgba(59,130,246,0.25)"
                    : "rgba(255,255,255,0.06)",
                  border:
                    rank <= 3
                      ? "1px solid rgba(250,204,21,0.5)"
                      : "1px solid transparent",
                }}
                onClick={() => toggleExpand(p.id)}
              >
                <div style={styles.playerLeft}>
                  <span style={{ width: 28, display: "inline-block" }}>
                    {medal}
                  </span>
                  <span>{p.name}</span>
                </div>

                <div style={styles.playerRight}>
                  <span>{p.score ?? 0} b.</span>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "999px",
                      background: p.color,
                      marginLeft: 6,
                    }}
                  />
                </div>

                {/* DETAILS */}
                {expanded === p.id && (
                  <PlayerDetails
                    items={getPlayerAnswers(p.id)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </NeonLayout>
  );
}

// -------------------------------------------------
// PLAYER DETAILS COMPONENT
// -------------------------------------------------
function PlayerDetails({ items }) {
  return (
    <div style={styles.detailsBox}>
      {items.map((row, i) => (
        <div key={i} style={styles.detailRow}>
          <span style={styles.detailTitle}>
            {row.q.title}
          </span>

          <span
            style={{
              ...styles.detailStatus,
              color: !row.answered
                ? "#facc15"
                : row.correct
                ? "#4ade80"
                : "#f87171",
            }}
          >
            {!row.answered
              ? "neodpověděl"
              : row.correct
              ? "správně"
              : "špatně"}
          </span>
        </div>
      ))}
    </div>
  );
}

// -------------------------------------------------
// STYLES
// -------------------------------------------------
const styles = {
  title: {
    fontSize: 28,
    marginBottom: 18,
    fontWeight: 700,
    background:
      "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
    WebkitBackgroundClip: "text",
    color: "transparent",
  },

  playerRow: {
    padding: "10px 12px",
    marginBottom: 10,
    borderRadius: 12,
    cursor: "pointer",
    backdropFilter: "blur(4px)",
  },

  playerLeft: {
    fontSize: 16,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },

  playerRight: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 14,
    float: "right",
  },

  detailsBox: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.05)",
  },

  detailRow: {
    padding: "6px 0",
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
  },

  detailTitle: {
    opacity: 0.85,
  },

  detailStatus: {
    fontWeight: 600,
  },
};


