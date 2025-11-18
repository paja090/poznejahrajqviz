// pages/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  setDoc,
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

import { evaluateAnswer, evaluateSpeedScoring } from "../utils/evaluateAnswer";

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

  // -------------------------------
  // LOAD ROOM
  // -------------------------------
  useEffect(() => {
    const roomRef = doc(db, "quizRooms", roomCode);
    return onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        setRoom({ id: roomCode, ...snap.data() });
      }
    });
  }, [roomCode]);

  // -------------------------------
  // LOAD QUESTIONS
  // -------------------------------
  useEffect(() => {
    const qRef = query(
      collection(db, "quizRooms", roomCode, "questions"),
      orderBy("order", "asc")
    );
    return onSnapshot(qRef, (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [roomCode]);

  // -------------------------------
  // LOAD PLAYERS
  // -------------------------------
  useEffect(() => {
    const pRef = collection(db, "quizRooms", roomCode, "players");
    return onSnapshot(pRef, (snap) => {
      setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [roomCode]);

  // =============================================================
  // 1) START QUESTION
  // =============================================================
  const startQuestion = async (id) => {
    if (loading) return;

    await updateDoc(doc(db, "quizRooms", roomCode), {
      currentQuestionId: id,
      status: "running",
    });
  };

  // =============================================================
  // 2) STOP QUESTION = VYHODNOCENÍ
  // =============================================================
  const stopQuestion = async () => {
    if (loading || !room?.currentQuestionId) return;

    setLoading(true);

    const questionId = room.currentQuestionId;
    const qRef = doc(db, "quizRooms", roomCode, "questions", questionId);
    const qSnap = await getDoc(qRef);

    if (!qSnap.exists()) {
      setLoading(false);
      return;
    }

    const question = qSnap.data();

    // ---- načíst všechny odpovědi
    const ansSnap = await getDocs(
      collection(db, "quizRooms", roomCode, "answers")
    );

    const allAnswers = ansSnap.docs
      .map((d) => d.data())
      .filter((a) => a.questionId === questionId);

    // -------------------------------
    // SPEED QUESTION
    // -------------------------------
    if (question.type === "speed") {
      const sorted = allAnswers.sort(
        (a, b) => Number(a.timeSubmitted) - Number(b.timeSubmitted)
      );

      const scoring = evaluateSpeedScoring(sorted, room.settings || {});

      // zapiš skóre hráčům
      for (const pid in scoring) {
        await updateDoc(
          doc(db, "quizRooms", roomCode, "players", pid),
          { score: increment(scoring[pid]) }
        );
      }
    }

    // -------------------------------
    // NORMAL QUESTIONS
    // -------------------------------
    else {
      for (const ans of allAnswers) {
        const isCorrect = evaluateAnswer(question, ans.answer);

        if (isCorrect) {
          await updateDoc(
            doc(db, "quizRooms", roomCode, "players", ans.playerId),
            { score: increment(1) }
          );
        }
      }
    }

    // Reset question
    await updateDoc(doc(db, "quizRooms", roomCode), {
      currentQuestionId: null,
      status: "waiting",
    });

    setLoading(false);
  };

  // =============================================================
  // DELETE QUESTION
  // =============================================================
  const deleteQuestion = async (id) => {
    if (!window.confirm("Opravdu smazat tuto otázku?")) return;
    await deleteDoc(doc(db, "quizRooms", roomCode, "questions", id));
  };

  // =============================================================
  // SCOREBOARD PAGE
  // =============================================================
  const goScoreboard = () => {
    navigate(`/scoreboard/${roomCode}`);
  };

  // =============================================================
  // DRAG & DROP ORDER
  // =============================================================
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

  // =============================================================
  // RENDER
  // =============================================================
  return (
    <NeonLayout>
      <div className="neon-card" style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              background:
                "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            🎛 Moderátorský panel – {roomCode}
          </h1>

          <Link
            to={`/`}
            style={{
              textDecoration: "none",
              padding: "6px 10px",
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.4)",
              color: "white",
            }}
          >
            Domů
          </Link>
        </div>

        {/* ---------------- STATUS + ACTIONS ---------------- */}
        {room && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 14, opacity: 0.7 }}>
              Stav: <b>{room.status}</b> • Hráčů:{" "}
              <b>{players.length}</b>
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <Link
                to={`/host/${roomCode}/questions`}
                className="neon-btn"
                style={{ padding: "6px 12px" }}
              >
                ➕ Přidat manuálně
              </Link>

              <Link
                to={`/host/${roomCode}/select-questions`}
                className="neon-btn"
                style={{ padding: "6px 12px" }}
              >
                📚 Z databáze
              </Link>

              <button
                className="neon-btn"
                disabled={loading}
                style={{ padding: "6px 12px" }}
                onClick={stopQuestion}
              >
                ⏹ Stop otázky
              </button>

              <button
                className="neon-btn"
                style={{ padding: "6px 12px" }}
                onClick={goScoreboard}
              >
                📊 Scoreboard
              </button>
            </div>

            {loading && (
              <p style={{ marginTop: 8, opacity: 0.8 }}>
                ⏳ Probíhá vyhodnocení…
              </p>
            )}
          </div>
        )}

        {/* ---------------- QUESTIONS LIST ---------------- */}
        <h2 className="section-title">Otázky v místnosti</h2>

        {questions.length === 0 && (
          <p style={{ fontSize: 13, opacity: 0.7 }}>
            Zatím žádné otázky…
          </p>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="questions">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {questions.map((q, index) => (
                  <Draggable key={q.id} draggableId={q.id} index={index}>
                    {(provided) => (
                      <div
                        className="question-item"
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        {/* Q INFO */}
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {TYPE_ICONS[q.type]} {q.title}
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.7 }}>
                            Typ: {TYPE_LABELS[q.type]} • ID: {q.id}
                          </div>

                          {q.imageUrl && (
                            <img
                              src={q.imageUrl}
                              alt="preview"
                              style={{
                                marginTop: 6,
                                width: 140,
                                borderRadius: 8,
                                border:
                                  "1px solid rgba(148,163,184,0.3)",
                              }}
                            />
                          )}
                        </div>

                        {/* ACTIONS */}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="neon-btn"
                            style={{ padding: "6px 12px" }}
                            onClick={() => startQuestion(q.id)}
                          >
                            ▶ Spustit
                          </button>

                          <button
                            className="neon-btn"
                            style={{
                              padding: "6px 12px",
                              background: "#9b1c1c",
                            }}
                            onClick={() => deleteQuestion(q.id)}
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

        {/* ---------------- PLAYERS LIST ---------------- */}
        <h2 className="section-title" style={{ marginTop: 30 }}>
          Hráči v místnosti
        </h2>

        {players.length === 0 && (
          <p style={{ fontSize: 13, opacity: 0.7 }}>Nikdo nepřipojen.</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {players.map((p) => (
            <div
              key={p.id}
              className="question-item"
              style={{ justifyContent: "space-between" }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 12,
                      background: p.color,
                      borderRadius: 4,
                      marginRight: 6,
                    }}
                  />
                  {p.name}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Skóre: {p.score ?? 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </NeonLayout>
  );
}



