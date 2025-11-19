// pages/Scoreboard.jsx
import { useEffect, useMemo, useState } from "react";
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

  // PLAYERS (realtime)
  useEffect(() => {
    const ref = collection(db, "quizRooms", roomCode, "players");
    return onSnapshot(ref, (snap) => {
      const arr = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      setPlayers(arr);
    });
  }, [roomCode]);

  // QUESTIONS (realtime)
  useEffect(() => {
    const ref = collection(db, "quizRooms", roomCode, "questions");
    return onSnapshot(ref, (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [roomCode]);

  // ANSWERS (snapshot – pro scoreboard stačí)
  useEffect(() => {
    const load = async () => {
      const ref = collection(db, "quizRooms", roomCode, "answers");
      const snap = await getDocs(ref);
      setAnswers(snap.docs.map((d) => d.data()));
    };
    load();
  }, [roomCode]);

  // mapy pro rychlý přístup
  const questionById = useMemo(() => {
    const map = {};
    questions.forEach((q) => (map[q.id] = q));
    return map;
  }, [questions]);

  const answersByQuestion = useMemo(() => {
    const map = {};
    answers.forEach((a) => {
      if (!map[a.questionId]) map[a.questionId] = [];
      map[a.questionId].push(a);
    });
    return map;
  }, [answers]);

  // statistiky pro hráče (accuracy, speed index, atd.)
  const buildStatsForPlayer = (pid) => {
    const totalQuestions = questions.length;
    const myAnswers = answers.filter((a) => a.playerId === pid);

    let answeredCount = 0;
    let correctCount = 0;

    let speedRounds = 0;
    let speedRankSum = 0;
    let speedWins = 0;

    // projdeme všechny otázky, aby seděl kontext
    questions.forEach((q) => {
      const ans = myAnswers.find((a) => a.questionId === q.id);

      // odpovědi + správně/špatně
      if (ans) {
        answeredCount++;
        if (evaluateAnswer(q, ans.answer)) {
          correctCount++;
        }
      }

      // speed statistiky
      if (q.type === "speed" && answersByQuestion[q.id]) {
        const all = [...answersByQuestion[q.id]].sort(
          (a, b) => Number(a.timeSubmitted) - Number(b.timeSubmitted)
        );

        const idx = all.findIndex((a) => a.playerId === pid);
        if (idx !== -1) {
          const rank = idx + 1;
          speedRounds++;
          speedRankSum += rank;
          if (rank === 1) speedWins++;
        }
      }
    });

    const accuracy =
      answeredCount > 0
        ? Math.round((correctCount / answeredCount) * 100)
        : 0;

    const avgSpeedRank =
      speedRounds > 0 ? speedRankSum / speedRounds : null;

    return {
      totalQuestions,
      answeredCount,
      correctCount,
      accuracy,
      speedRounds,
      avgSpeedRank,
      speedWins,
    };
  };

  const toggleExpand = (pid) => {
    setExpanded((prev) => (prev === pid ? null : pid));
  };

  return (
    <NeonLayout maxWidth={720}>
      <div className="neon-card">
        <h1 style={styles.title}>📊 Žebříček – {roomCode}</h1>

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

        {players.length === 0 && (
          <p style={{ fontSize: 13, opacity: 0.75 }}>
            Zatím žádní hráči…
          </p>
        )}

        {/* PLAYER ROWS */}
        <div>
          {players.map((p, index) => {
            const rank = index + 1;
            const isMe = p.id === playerId;
            const medal =
              rank === 1
                ? "🥇"
                : rank === 2
                ? "🥈"
                : rank === 3
                ? "🥉"
                : `${rank}.`;

            const stats = buildStatsForPlayer(p.id);

            return (
              <div
                key={p.id}
                style={{
                  ...styles.playerRow,
                  background: isMe
                    ? "rgba(59,130,246,0.25)"
                    : "rgba(15,23,42,0.92)",
                  border:
                    rank <= 3
                      ? "1px solid rgba(250,204,21,0.5)"
                      : "1px solid rgba(148,163,184,0.3)",
                }}
              >
                {/* HLAVNÍ ŘÁDEK */}
                <div
                  style={styles.playerHeader}
                  onClick={() => toggleExpand(p.id)}
                >
                  <div style={styles.playerLeft}>
                    <span
                      style={{
                        width: 30,
                        display: "inline-block",
                      }}
                    >
                      {medal}
                    </span>
                    <span>{p.name}</span>
                  </div>

                  <div style={styles.playerRight}>
                    <span>{p.score ?? 0} b.</span>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "999px",
                        background: p.color,
                        marginLeft: 6,
                      }}
                    />
                    <span style={styles.chevron}>
                      {expanded === p.id ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {/* MINI STATISTIKY */}
                <div style={styles.miniStatsRow}>
                  <StatChip
                    label="Accuracy"
                    value={`${stats.accuracy}%`}
                    type="accent"
                  />
                  <StatChip
                    label="Odpovědi"
                    value={`${stats.answeredCount}/${stats.totalQuestions}`}
                  />
                  <StatChip
                    label="Speed výhry"
                    value={stats.speedWins}
                  />
                  {stats.avgSpeedRank && (
                    <StatChip
                      label="Speed index"
                      value={stats.avgSpeedRank.toFixed(1)}
                    />
                  )}
                </div>

                {/* DETAILY */}
                {expanded === p.id && (
                  <PlayerDetails
                    questions={questions}
                    answers={answers}
                    playerId={p.id}
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
// STAT CHIP
// -------------------------------------------------
function StatChip({ label, value, type }) {
  const baseStyle = {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    border: "1px solid rgba(148,163,184,0.5)",
    minWidth: 80,
  };

  const accent =
    type === "accent"
      ? {
          border: "1px solid rgba(74,222,128,0.8)",
          boxShadow: "0 0 12px rgba(74,222,128,0.35)",
        }
      : {};

  return (
    <div style={{ ...baseStyle, ...accent }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: 13 }}>{value}</span>
    </div>
  );
}

// -------------------------------------------------
// PLAYER DETAILS – seznam všech otázek + stav
// -------------------------------------------------
function PlayerDetails({ questions, answers, playerId }) {
  const rows = questions.map((q) => {
    const ans = answers.find(
      (a) => a.playerId === playerId && a.questionId === q.id
    );
    const answered = !!ans;
    const correct = answered
      ? evaluateAnswer(q, ans.answer)
      : false;

    return { q, ans, answered, correct };
  });

  return (
    <div style={styles.detailsBox}>
      {rows.map((row, i) => (
        <div key={row.q.id || i} style={styles.detailRow}>
          <div style={styles.detailLeft}>
            <span style={styles.detailTitle}>{row.q.title}</span>
            <span style={styles.detailType}>
              {typeToLabel(row.q.type)}
            </span>
          </div>
          <div style={styles.detailRight}>
            {!row.answered && (
              <span style={{ color: "#facc15", fontSize: 12 }}>
                neodpověděl
              </span>
            )}
            {row.answered && (
              <span
                style={{
                  fontSize: 12,
                  color: row.correct ? "#4ade80" : "#f97373",
                }}
              >
                {row.correct ? "správně" : "špatně"}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function typeToLabel(type) {
  switch (type) {
    case "abc":
      return "ABC";
    case "open":
      return "Otevřená";
    case "image":
      return "Obrázková";
    case "speed":
      return "Speed";
    case "multi":
      return "Multi";
    case "number":
      return "Číselná";
    case "arrange":
      return "Seřazení";
    default:
      return type || "";
  }
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
    borderRadius: 14,
  },
  playerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
  },
  playerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 16,
    fontWeight: 600,
  },
  playerRight: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 13,
  },
  chevron: {
    marginLeft: 4,
    opacity: 0.7,
    fontSize: 11,
  },
  miniStatsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  detailsBox: {
    marginTop: 10,
    padding: "8px 10px",
    borderRadius: 12,
    background: "rgba(15,23,42,0.96)",
    border: "1px solid rgba(148,163,184,0.4)",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
    fontSize: 12,
  },
  detailLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    maxWidth: "70%",
  },
  detailTitle: {
    opacity: 0.9,
  },
  detailType: {
    opacity: 0.6,
    fontSize: 11,
  },
  detailRight: {
    display: "flex",
    alignItems: "center",
  },
};



