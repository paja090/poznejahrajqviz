// pages/AdminDashboard.jsx

import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  increment,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import NeonLayout from "../components/NeonLayout";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import {
  evaluateAnswer,
  evaluateSpeedScoring,
} from "../utils/evaluateAnswer";

import { autoBalanceTeams, splitIntoTeams } from "../utils/teamUtils";
import TeamDebugPanel from "../components/TeamDebugPanel"; // 🔥 debug panel

const TYPE_ICONS = {
  abc: "🅰",
  open: "✏️",
  image: "🖼️",
  speed: "⚡",
  multi: "✅",
  number: "🔢",
  arrange: "🔁",
};

const TYPE_LABELS = {
  abc: "ABC",
  open: "Otevřená",
  image: "Obrázková",
  speed: "Speed",
  multi: "Multi-select",
  number: "Číselná",
  arrange: "Seřazení",
};

export default function AdminDashboard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // LOAD ROOM
  useEffect(() => {
    if (!roomCode) return;
    const ref = doc(db, "quizRooms", roomCode);
    return onSnapshot(ref, (snap) => {
      snap.exists() && setRoom({ id: roomCode, ...snap.data() });
    });
  }, [roomCode]);

  // LOAD QUESTIONS
  useEffect(() => {
    if (!roomCode) return;
    const ref = query(
      collection(db, "quizRooms", roomCode, "questions"),
      orderBy("order", "asc")
    );
    return onSnapshot(ref, (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [roomCode]);

  // LOAD PLAYERS
  useEffect(() => {
    if (!roomCode) return;
    const ref = collection(db, "quizRooms", roomCode, "players");
    return onSnapshot(ref, (snap) => {
      setPlayers(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });
  }, [roomCode]);

  // START QUESTION
  const startQuestion = async (id) => {
    if (loading) return;
    await updateDoc(doc(db, "quizRooms", roomCode), {
      currentQuestionId: id,
      status: "running",
    });
  };

  // STOP + EVALUATE QUESTION
  const stopQuestion = async () => {
    if (!room?.currentQuestionId) return;

    setLoading(true);

    const qId = room.currentQuestionId;
    const qSnap = await getDoc(
      doc(db, "quizRooms", roomCode, "questions", qId)
    );
    if (!qSnap.exists()) return;

    const question = qSnap.data();

    const ansSnap = await getDocs(
      collection(db, "quizRooms", roomCode, "answers")
    );
    const allAnswers = ansSnap.docs
      .map((d) => d.data())
      .filter((a) => a.questionId === qId);

    const teamMode = room.teamMode === true;

    // SPEED QUESTION
    if (question.type === "speed") {
      const sorted = [...allAnswers].sort((a, b) => {
        const getTime = (x) => {
          if (!x || !x.timeSubmitted) return Infinity;
          const t = x.timeSubmitted;
          if (typeof t === "number") return t;
          if (typeof t?.toMillis === "function") return t.toMillis();
          return Number(t) || Infinity;
        };
        return getTime(a) - getTime(b);
      });

      const scoring = evaluateSpeedScoring(
        sorted,
        room.settings || {}
      );

      // přidat body hráčům
      for (const pid in scoring) {
        await updateDoc(
          doc(db, "quizRooms", roomCode, "players", pid),
          { score: increment(scoring[pid]) }
        );
      }
    }

    // NORMAL / ABC / IMAGE / MULTI / NUMBER / OPEN
    else {
      for (const ans of allAnswers) {
        if (evaluateAnswer(question, ans.answer)) {
          await updateDoc(
            doc(db, "quizRooms", roomCode, "players", ans.playerId),
            { score: increment(1) }
          );
        }
      }
    }

    // Reset otázky
    await updateDoc(doc(db, "quizRooms", roomCode), {
      currentQuestionId: null,
      status: "waiting",
    });

    setLoading(false);
  };

  // RANDOM TEAMS A/B
  const randomizeTeams = async () => {
    if (players.length < 2) return;

    const { teamA, teamB } = splitIntoTeams(players);

    for (const p of teamA) {
      await updateDoc(
        doc(db, "quizRooms", roomCode, "players", p.id),
        { team: "A" }
      );
    }

    for (const p of teamB) {
      await updateDoc(
        doc(db, "quizRooms", roomCode, "players", p.id),
        { team: "B" }
      );
    }

    await updateDoc(doc(db, "quizRooms", roomCode), {
      teamMode: true,
    });
  };

  // AUTO BALANCE
  const balanceTeams = async () => {
    await autoBalanceTeams(roomCode);
  };

  // SCOREBOARD
  const goScoreboard = () => navigate(`/scoreboard/${roomCode}`);

  // DRAG & DROP ORDER
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const reordered = Array.from(questions);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    setQuestions(reordered);

    const updates = reordered.map((q, index) =>
      updateDoc(
        doc(db, "quizRooms", roomCode, "questions", q.id),
        { order: index }
      )
    );
    await Promise.all(updates);
  };

  return (
    <NeonLayout>
      <div className="neon-card" style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* HEADER */}
        <div style={styles.header}>
          <h1 style={styles.title}>🎛 Moderátorský panel – {roomCode}</h1>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="neon-btn small"
              onClick={() => setShowDebug(true)}
            >
              🛠 Debug
            </button>

            <Link className="neon-btn small" to="/">
              Domů
            </Link>
          </div>
        </div>

        {/* ROOM STATUS */}
        {room && (
          <div style={{ marginBottom: 20 }}>
            <p style={styles.roomInfo}>
              Stav: <b>{room.status}</b> • Hráčů: <b>{players.length}</b> •
              Týmový mód: <b>{room.teamMode ? "zapnutý" : "vypnutý"}</b>
            </p>

            <div style={styles.actionRow}>
              <Link to={`/host/${roomCode}/questions`} className="neon-btn small">
                ➕ Přidat otázku
              </Link>

              <Link to={`/host/${roomCode}/select-questions`} className="neon-btn small">
                📚 Databáze otázek
              </Link>

              <button className="neon-btn small" onClick={stopQuestion}>
                ⏹ Stop + vyhodnotit
              </button>

              <button className="neon-btn small" onClick={goScoreboard}>
                📊 Scoreboard
              </button>
            </div>
          </div>
        )}

        {/* TEAM MODE */}
        <div style={styles.teamCard}>
          <h2 className="section-title">👥 Týmy</h2>

          <div style={styles.teamButtons}>
            <button className="neon-btn small" onClick={randomizeTeams}>
              🎲 Rozdělit A/B
            </button>
            <button className="neon-btn small" onClick={balanceTeams}>
              ⚖ Auto-balance
            </button>
          </div>

          <div style={styles.teamList}>
            <div style={styles.teamCol}>
              <h3 style={{ color: "#3b82f6" }}>🔵 Team A</h3>
              <ul style={styles.ul}>
                {players
                  .filter((p) => p.team === "A")
                  .map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
              </ul>
            </div>

            <div style={styles.teamCol}>
              <h3 style={{ color: "#ef4444" }}>🔴 Team B</h3>
              <ul style={styles.ul}>
                {players
                  .filter((p) => p.team === "B")
                  .map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
              </ul>
            </div>
          </div>
        </div>

        {/* QUESTIONS */}
        <h2 className="section-title">Otázky</h2>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="questions">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {questions.map((q, index) => (
                  <Draggable key={q.id} draggableId={q.id} index={index}>
                    {(provided) => (
                      <div
                        className="question-item"
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <div>
                          <div style={styles.qTitle}>
                            {TYPE_ICONS[q.type]} {q.title}
                          </div>
                          <div style={styles.qSub}>
                            {TYPE_LABELS[q.type]} • ID: {q.id}
                          </div>
                          {q.imageUrl && (
                            <img
                              src={q.imageUrl}
                              style={styles.qImg}
                              alt="preview"
                            />
                          )}
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="neon-btn small" onClick={() => startQuestion(q.id)}>
                            ▶ Spustit
                          </button>

                          <button
                            className="neon-btn small"
                            style={{ background: "#9b1c1c" }}
                            onClick={() =>
                              deleteDoc(
                                doc(db, "quizRooms", roomCode, "questions", q.id)
                              )
                            }
                          >
                            ❌
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* PLAYERS */}
        <h2 className="section-title" style={{ marginTop: 30 }}>
          Hráči
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {players.map((p) => (
            <div
              key={p.id}
              className="question-item"
              style={{ justifyContent: "space-between" }}
            >
              <div>
                <div style={styles.playerName}>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      background: p.color,
                      display: "inline-block",
                      borderRadius: 4,
                      marginRight: 6,
                    }}
                  ></span>
                  {p.name}
                </div>

                <div style={styles.playerInfo}>
                  Skóre: {p.score ?? 0}
                  {p.team && <span> • tým: {p.team}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DEBUG PANEL */}
      {showDebug && (
        <TeamDebugPanel roomCode={roomCode} onClose={() => setShowDebug(false)} />
      )}
    </NeonLayout>
  );
}



// ---------------------------------------------------
// STYLES
// ---------------------------------------------------
const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    background: "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
    WebkitBackgroundClip: "text",
    color: "transparent",
  },
  roomInfo: {
    fontSize: 14,
    opacity: 0.75,
  },
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  teamCard: {
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.5)",
    padding: 14,
    background: "rgba(15,23,42,0.92)",
    marginBottom: 20,
  },
  teamButtons: {
    display: "flex",
    gap: 10,
    marginBottom: 12,
  },
  teamList: {
    display: "flex",
    gap: 40,
  },
  teamCol: {},
  ul: {
    paddingLeft: 12,
    marginTop: 6,
  },
  qTitle: {
    fontWeight: 600,
  },
  qSub: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  qImg: {
    width: 140,
    borderRadius: 6,
    marginTop: 6,
    border: "1px solid rgba(148,163,184,0.3)",
  },
  playerName: {
    fontSize: 14,
    fontWeight: 600,
  },
  playerInfo: {
    fontSize: 12,
    opacity: 0.75,
    marginTop: 2,
  },
};





