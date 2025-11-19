// pages/Scoreboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import NeonLayout from "../components/NeonLayout";
import { evaluateAnswer } from "../utils/evaluateAnswer";

export default function Scoreboard() {
  const { roomCode } = useParams();
  const playerId = localStorage.getItem("playerId");

  const [players, setPlayers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [viewMode, setViewMode] = useState("individual"); // "team" | "individual"

  // PLAYERS realtime
  useEffect(() => {
    return onSnapshot(
      collection(db, "quizRooms", roomCode, "players"),
      (snap) => {
        setPlayers(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        );
      }
    );
  }, [roomCode]);

  // QUESTIONS realtime
  useEffect(() => {
    return onSnapshot(
      collection(db, "quizRooms", roomCode, "questions"),
      (snap) => setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [roomCode]);

  // ANSWERS realtime
  useEffect(() => {
    return onSnapshot(
      collection(db, "quizRooms", roomCode, "answers"),
      (snap) => setAnswers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [roomCode]);

  // Rozdělit na týmy
  const teamA = players.filter((p) => p.team === "A");
  const teamB = players.filter((p) => p.team === "B");

  const totalCorrectA = teamA.reduce((sum, p) => sum + (p.score ?? 0), 0);
  const totalCorrectB = teamB.reduce((sum, p) => sum + (p.score ?? 0), 0);

  return (
    <NeonLayout maxWidth={900}>
      <div className="neon-card">
        <h1 style={styles.title}>📊 Výsledky – {roomCode}</h1>

        {/* NAV */}
        <div style={styles.navRow}>
          <Link to={`/host/${roomCode}`} style={styles.backLink}>
            ← Zpět do moderátoru
          </Link>

          {/* Přepínač režimu */}
          <div style={styles.tabs}>
            <button
              style={{
                ...styles.tabBtn,
                ...(viewMode === "individual" ? styles.tabActive : {}),
              }}
              onClick={() => setViewMode("individual")}
            >
              Individuální
            </button>
            <button
              style={{
                ...styles.tabBtn,
                ...(viewMode === "team" ? styles.tabActive : {}),
              }}
              onClick={() => setViewMode("team")}
            >
              Týmy
            </button>
          </div>
        </div>

        {/* TEAM MODE -------------------------------- */}
        {viewMode === "team" && (
          <div style={styles.teamWrapper}>
            {/* TEAM A */}
            <div style={{ ...styles.teamCard, borderColor: "#3b82f6" }}>
              <h2 style={styles.teamTitle}>🔵 Team A</h2>
              <p style={styles.teamScore}>{totalCorrectA} b.</p>

              <ul style={styles.teamList}>
                {teamA.map((p) => (
                  <li key={p.id} style={styles.teamPlayer}>
                    {p.name} — <b>{p.score ?? 0} b</b>
                  </li>
                ))}
              </ul>
            </div>

            {/* TEAM B */}
            <div style={{ ...styles.teamCard, borderColor: "#ef4444" }}>
              <h2 style={styles.teamTitle}>🔴 Team B</h2>
              <p style={styles.teamScore}>{totalCorrectB} b.</p>

              <ul style={styles.teamList}>
                {teamB.map((p) => (
                  <li key={p.id} style={styles.teamPlayer}>
                    {p.name} — <b>{p.score ?? 0} b</b>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* INDIVIDUAL MODE -------------------------------- */}
        {viewMode === "individual" && (
          <div style={{ marginTop: 10 }}>
            {players.map((p, i) => {
              const rank = i + 1;

              return (
                <div
                  key={p.id}
                  style={{
                    ...styles.playerRow,
                    background:
                      p.id === playerId
                        ? "rgba(59,130,246,0.25)"
                        : "rgba(15,23,42,0.92)",
                  }}
                >
                  <div style={styles.playerRowLeft}>
                    <span style={styles.rank}>{rank}.</span>
                    <span>{p.name}</span>
                  </div>
                  <div>
                    <b>{p.score ?? 0}</b> b
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </NeonLayout>
  );
}

// -------------------------------------------------
// STYLY
// -------------------------------------------------
const styles = {
  title: {
    fontSize: 28,
    marginBottom: 18,
    fontWeight: 700,
    background: "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
    WebkitBackgroundClip: "text",
    color: "transparent",
  },

  navRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  backLink: {
    fontSize: 13,
    color: "white",
    opacity: 0.8,
    textDecoration: "none",
  },

  tabs: { display: "flex", gap: 8 },
  tabBtn: {
    padding: "6px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.3)",
    fontSize: 12,
    cursor: "pointer",
    color: "white",
  },
  tabActive: {
    background: "rgba(0,255,180,0.3)",
    border: "1px solid rgba(0,255,180,0.8)",
    boxShadow: "0 0 8px rgba(0,255,200,0.5)",
  },

  // TEAM MODE
  teamWrapper: {
    display: "flex",
    gap: 20,
    marginTop: 20,
  },
  teamCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
    borderLeft: "6px solid",
  },
  teamTitle: {
    fontSize: 22,
    marginBottom: 6,
  },
  teamScore: {
    fontSize: 42,
    fontWeight: 700,
    marginBottom: 10,
  },
  teamList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  teamPlayer: {
    padding: "4px 0",
    fontSize: 14,
    opacity: 0.9,
  },

  // INDIVIDUAL MODE
  playerRow: {
    padding: "10px 12px",
    marginBottom: 10,
    borderRadius: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playerRowLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  rank: {
    fontSize: 14,
    opacity: 0.7,
  },
};




