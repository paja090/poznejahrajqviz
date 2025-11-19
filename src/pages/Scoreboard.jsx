// pages/Scoreboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, doc, onSnapshot } from "firebase/firestore";

import { db } from "../firebaseConfig";
import NeonLayout from "../components/NeonLayout";
import { evaluateAnswer } from "../utils/evaluateAnswer";

export default function Scoreboard() {
  const { roomCode } = useParams();
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [expanded, setExpanded] = useState(null);

  const playerId = localStorage.getItem("playerId");

  // ROOM
  useEffect(() => {
    const ref = doc(db, "quizRooms", roomCode);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setRoom({ id: snap.id, ...snap.data() });
      } else {
        setRoom(null);
      }
    });
  }, [roomCode]);

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

  // TEAMS (realtime)
  useEffect(() => {
    const ref = collection(db, "quizRooms", roomCode, "teams");
    return onSnapshot(ref, (snap) => {
      const arr = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      setTeams(arr);
    });
  }, [roomCode]);

  // QUESTIONS (realtime)
  useEffect(() => {
    const ref = collection(db, "quizRooms", roomCode, "questions");
    return onSnapshot(ref, (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [roomCode]);

  // ANSWERS (realtime pro živé statistiky)
  useEffect(() => {
    const ref = collection(db, "quizRooms", roomCode, "answers");
    return onSnapshot(ref, (snap) => {
      setAnswers(snap.docs.map((d) => d.data()));
    });
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

  const teamById = useMemo(() => {
    const map = new Map();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

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

  const playerStatsMap = useMemo(() => {
    const map = new Map();
    players.forEach((p) => {
      map.set(p.id, buildStatsForPlayer(p.id));
    });
    return map;
  }, [players, answers, questions, answersByQuestion]);

  const teamStats = useMemo(() => {
    if (!teams.length) return [];

    return teams
      .map((team) => {
        const members = players.filter((p) => p.teamId === team.id);
        const totals = members.reduce(
          (acc, member) => {
            const stats = playerStatsMap.get(member.id);
            acc.correct += stats?.correctCount || 0;
            acc.answered += stats?.answeredCount || 0;
            acc.speedWins += stats?.speedWins || 0;
            return acc;
          },
          { correct: 0, answered: 0, speedWins: 0 }
        );

        const accuracy =
          totals.answered > 0
            ? Math.round((totals.correct / totals.answered) * 100)
            : 0;

        const totalScore =
          typeof team.score === "number"
            ? team.score
            : members.reduce((sum, member) => sum + (member.score || 0), 0);

        return {
          ...team,
          members,
          totalScore,
          accuracy,
          speedWins: totals.speedWins,
        };
      })
      .sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
  }, [teams, players, playerStatsMap]);

  const maxTeamScore = teamStats.length
    ? Math.max(...teamStats.map((t) => t.totalScore || 0))
    : 0;

  const unassignedPlayers = useMemo(
    () => players.filter((p) => !p.teamId),
    [players]
  );

  const toggleExpand = (pid) => {
    setExpanded((prev) => (prev === pid ? null : pid));
  };

  return (
    <NeonLayout maxWidth={720}>
      <div className="neon-card">
        <h1 style={styles.title}>📊 Žebříček – {roomCode}</h1>

        <div style={{ marginBottom: 14 }}>
          <Link
            to={`/host/${roomCode}/dashboard`}
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

        <div style={styles.metaRow}>
          <span>Stav: {statusToLabel(room?.status)}</span>
          <span>Režim: {room?.teamMode ? "Týmový" : "Solo"}</span>
          <span>Hráčů: {players.length}</span>
        </div>

        {room?.status === "finished" && (
          <div style={{ marginTop: 12 }}>
            <Link
              to={
                room?.eventId
                  ? `/events/${room.eventId}/results/${roomCode}`
                  : `/results/${roomCode}`
              }
              className="neon-btn"
              style={{ display: "inline-block" }}
            >
              🏆 Otevřít kompletní vyhodnocení
            </Link>
          </div>
        )}

        {room?.teamMode && (
          <section style={{ marginTop: 16 }}>
            <h2 className="section-title">🏆 Týmové pořadí</h2>
            {teamStats.length === 0 && (
              <p style={{ fontSize: 13, opacity: 0.75 }}>
                Zatím nejsou vytvořené žádné týmy.
              </p>
            )}
            <div style={styles.teamGrid}>
              {teamStats.map((team, index) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  rank={index + 1}
                  maxScore={maxTeamScore}
                />
              ))}
            </div>
            {unassignedPlayers.length > 0 && (
              <p style={styles.note}>
                {unassignedPlayers.length} hráčů zatím nemá přiřazený tým.
              </p>
            )}
          </section>
        )}

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

            const stats = playerStatsMap.get(p.id) || {
              accuracy: 0,
              answeredCount: 0,
              totalQuestions: questions.length,
              speedWins: 0,
              avgSpeedRank: null,
            };

            const team = p.teamId ? teamById.get(p.teamId) : null;

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
                    {team && (
                      <span
                        style={{
                          ...styles.teamBadge,
                          backgroundColor: `${team.color || "#22c55e"}22`,
                          borderColor: team.color || "#22c55e",
                        }}
                      >
                        {team.name}
                      </span>
                    )}
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

function statusToLabel(status) {
  switch (status) {
    case "running":
      return "Hra běží";
    case "paused":
      return "Pozastaveno";
    case "finished":
      return "Dokončeno";
    case "prepared":
      return "Připraveno";
    default:
      return "Čeká se";
  }
}

function TeamCard({ team, rank, maxScore }) {
  const percent = maxScore > 0 ? Math.round(((team.totalScore || 0) / maxScore) * 100) : 0;
  const badge = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;

  return (
    <div style={styles.teamCard}>
      <div style={styles.teamHeader}>
        <span style={{ width: 28 }}>{badge}</span>
        <div style={styles.teamName}>
          <span
            style={{
              ...styles.teamDot,
              background: team.color || "#22c55e",
            }}
          />
          <span>{team.name}</span>
        </div>
        <span style={{ fontWeight: 600 }}>{team.totalScore ?? 0} b.</span>
      </div>
      <div style={styles.teamProgressOuter}>
        <div
          style={{
            ...styles.teamProgressInner,
            width: `${percent}%`,
            background: team.color || "#22c55e",
          }}
        />
      </div>
      <div style={styles.teamStatsRow}>
        <StatChip label="Accuracy" value={`${team.accuracy}%`} />
        <StatChip label="Speed wins" value={team.speedWins} />
        <StatChip label="Členové" value={team.members.length} />
      </div>
      {team.members.length > 0 && (
        <div style={styles.teamMembersRow}>
          {team.members.map((member) => (
            <span key={member.id} style={styles.memberPill}>
              {member.name}
            </span>
          ))}
        </div>
      )}
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
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    fontSize: 12,
    opacity: 0.85,
    marginBottom: 10,
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
  teamBadge: {
    fontSize: 11,
    borderRadius: 999,
    padding: "2px 8px",
    border: "1px solid transparent",
    fontWeight: 500,
  },
  teamGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    marginTop: 10,
  },
  teamCard: {
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid rgba(148,163,184,0.35)",
    background: "rgba(15,23,42,0.92)",
  },
  teamHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 14,
    marginBottom: 8,
  },
  teamName: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 600,
  },
  teamDot: {
    width: 10,
    height: 10,
    borderRadius: "999px",
  },
  teamProgressOuter: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    background: "rgba(15,23,42,0.8)",
    border: "1px solid rgba(148,163,184,0.3)",
    overflow: "hidden",
    marginBottom: 10,
  },
  teamProgressInner: {
    height: "100%",
    borderRadius: 999,
    transition: "width 0.4s ease",
  },
  teamStatsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  teamMembersRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  memberPill: {
    fontSize: 11,
    borderRadius: 999,
    padding: "2px 8px",
    background: "rgba(255,255,255,0.06)",
  },
  note: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 8,
  },
};



