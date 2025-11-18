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
  setDoc,
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import NeonLayout from "../components/NeonLayout";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import {
  evaluateAnswer,
  evaluateSpeedScoring,
} from "../utils/evaluateAnswer";
import { createRandomTeams } from "../utils/teamUtils";

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
  const [teams, setTeams] = useState([]);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [teamSize, setTeamSize] = useState(4);

  // LOAD ROOM
  useEffect(() => {
    if (!roomCode) return;
    const roomRef = doc(db, "quizRooms", roomCode);
    return onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoom({ id: roomCode, ...data });
        if (data.teamSettings?.teamSize) {
          setTeamSize(data.teamSettings.teamSize);
        }
      }
    });
  }, [roomCode]);

  // LOAD QUESTIONS
  useEffect(() => {
    if (!roomCode) return;
    const qRef = query(
      collection(db, "quizRooms", roomCode, "questions"),
      orderBy("order", "asc")
    );
    return onSnapshot(qRef, (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [roomCode]);

  // LOAD PLAYERS
  useEffect(() => {
    if (!roomCode) return;
    const pRef = collection(db, "quizRooms", roomCode, "players");
    return onSnapshot(pRef, (snap) => {
      setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [roomCode]);

  // LOAD TEAMS
  useEffect(() => {
    if (!roomCode) return;
    const tRef = collection(db, "quizRooms", roomCode, "teams");
    return onSnapshot(tRef, (snap) => {
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [roomCode]);

  // START QUESTION
  const startQuestion = async (id) => {
    if (loading || !roomCode) return;
    await updateDoc(doc(db, "quizRooms", roomCode), {
      currentQuestionId: id,
      status: "running",
    });
  };

  // STOP QUESTION = VYHODNOCENÍ + TEAM BODY
  const stopQuestion = async () => {
    if (loading || !room?.currentQuestionId || !roomCode) return;

    setLoading(true);

    const questionId = room.currentQuestionId;
    const qRef = doc(db, "quizRooms", roomCode, "questions", questionId);
    const qSnap = await getDoc(qRef);

    if (!qSnap.exists()) {
      setLoading(false);
      return;
    }

    const question = qSnap.data();

    const ansSnap = await getDocs(
      collection(db, "quizRooms", roomCode, "answers")
    );
    const allAnswers = ansSnap.docs
      .map((d) => d.data())
      .filter((a) => a.questionId === questionId);

    const teamMode = !!room?.teamMode;

    // pomocné mapy pro team scoring
    const teamScoreDelta = {}; // {teamId: +points}

    // SPEED QUESTION
    if (question.type === "speed") {
      // robustní výpočet času (timestamp i number)
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

      const scoring = evaluateSpeedScoring(sorted, room.settings || {});

      for (const pid in scoring) {
        const pts = scoring[pid];

        // hráč body
        await updateDoc(
          doc(db, "quizRooms", roomCode, "players", pid),
          { score: increment(pts) }
        );

        if (teamMode) {
          const player = players.find((p) => p.id === pid);
          if (player?.teamId) {
            teamScoreDelta[player.teamId] =
              (teamScoreDelta[player.teamId] || 0) + pts;
          }
        }
      }
    }

    // NORMAL QUESTIONS
    else {
      for (const ans of allAnswers) {
        const isCorrect = evaluateAnswer(question, ans.answer);

        if (isCorrect) {
          // hráč body
          await updateDoc(
            doc(db, "quizRooms", roomCode, "players", ans.playerId),
            { score: increment(1) }
          );

          if (teamMode) {
            const player = players.find(
              (p) => p.id === ans.playerId
            );
            if (player?.teamId) {
              teamScoreDelta[player.teamId] =
                (teamScoreDelta[player.teamId] || 0) + 1;
            }
          }
        }
      }
    }

    // UPDATE TEAM SCORES
    if (teamMode) {
      const promises = Object.entries(teamScoreDelta).map(
        ([teamId, pts]) =>
          updateDoc(
            doc(db, "quizRooms", roomCode, "teams", teamId),
            { score: increment(pts) }
          )
      );
      await Promise.all(promises);
    }

    // reset otázky
    await updateDoc(doc(db, "quizRooms", roomCode), {
      currentQuestionId: null,
      status: "waiting",
    });

    setLoading(false);
  };

  // DELETE QUESTION
  const deleteQuestion = async (id) => {
    if (!roomCode) return;
    if (!window.confirm("Opravdu smazat tuto otázku?")) return;
    await deleteDoc(doc(db, "quizRooms", roomCode, "questions", id));
  };

  // SCOREBOARD PAGE
  const goScoreboard = () => {
    navigate(`/scoreboard/${roomCode}`);
  };

  // DRAG & DROP ORDER
  const handleDragEnd = async (result) => {
    if (!result.destination || !roomCode) return;

    const reordered = Array.from(questions);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    setQuestions(reordered);

    // uložíme jednoduché pořadí 0,1,2,...
    const updates = reordered.map((q, index) =>
      updateDoc(
        doc(db, "quizRooms", roomCode, "questions", q.id),
        { order: index }
      )
    );

    await Promise.all(updates);
  };

  // TEAM MODE TOGGLE
  const toggleTeamMode = async () => {
    if (!roomCode) return;
    const newVal = !room?.teamMode;

    await updateDoc(doc(db, "quizRooms", roomCode), {
      teamMode: newVal,
      teamSettings: {
        ...(room?.teamSettings || {}),
        teamSize: teamSize,
      },
    });
  };

  // RANDOM TEAMS
  const generateRandomTeams = async () => {
    if (!players.length || !roomCode) return;
    if (!window.confirm("Vytvořit nové náhodné týmy? Staré budou přepsány.")) {
      return;
    }

    setLoading(true);

    // 1) smazat staré týmy
    const tSnap = await getDocs(
      collection(db, "quizRooms", roomCode, "teams")
    );
    const deletePromises = tSnap.docs.map((d) =>
      deleteDoc(d.ref)
    );
    await Promise.all(deletePromises);

    // 2) resetovat teamId u hráčů
    const resetPromises = players.map((p) =>
      updateDoc(
        doc(db, "quizRooms", roomCode, "players", p.id),
        { teamId: null }
      )
    );
    await Promise.all(resetPromises);

    // 3) vytvořit nové týmy
    const { teams: newTeams, playerTeamMap } = createRandomTeams(
      players,
      Number(teamSize) || 4
    );

    // 4) uložit týmy
    const createTeamPromises = newTeams.map((t) =>
      setDoc(
        doc(db, "quizRooms", roomCode, "teams", t.id),
        t
      )
    );

    await Promise.all(createTeamPromises);

    // 5) nastavit hráčům teamId
    const setTeamPromises = Object.entries(playerTeamMap).map(
      ([pid, teamId]) =>
        updateDoc(
          doc(db, "quizRooms", roomCode, "players", pid),
          { teamId }
        )
    );

    await Promise.all(setTeamPromises);

    // 6) zapnout team mode
    await updateDoc(doc(db, "quizRooms", roomCode), {
      teamMode: true,
      teamSettings: {
        ...(room?.teamSettings || {}),
        teamSize: Number(teamSize) || 4,
      },
    });

    setLoading(false);
  };

  // hráči v týmu
  const getPlayersInTeam = (teamId) =>
    players.filter((p) => p.teamId === teamId);

  // RENDER
  return (
    <NeonLayout>
      <div className="neon-card" style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
            gap: 12,
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

        {/* ROOM STATUS + ACTIONS */}
        {room && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 14, opacity: 0.7 }}>
              Stav: <b>{room.status}</b> • Hráčů:{" "}
              <b>{players.length}</b>{" "}
              • Týmový mód:{" "}
              <b>{room.teamMode ? "zapnutý" : "vypnutý"}</b>
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
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
                ⏹ Stop otázky + vyhodnotit
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
                ⏳ Probíhá vyhodnocení / práce s týmy…
              </p>
            )}
          </div>
        )}

        {/* TEAM MODE SECTION */}
        <div
          style={{
            marginBottom: 24,
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.5)",
            background: "rgba(15,23,42,0.85)",
          }}
        >
          <h2 className="section-title" style={{ marginBottom: 8 }}>
            👥 Týmy
          </h2>
          <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>
            Týmový mód spojuje hráče do skupin (ideálně 3–5 v týmu) a body
            se sčítají i týmům. Lidi se můžou náhodně rozlosovat, aby se
            propojili.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={!!room?.teamMode}
                onChange={toggleTeamMode}
              />
              Zapnout týmový mód
            </label>

            <label style={{ fontSize: 13 }}>
              Velikost týmu:{" "}
              <input
                type="number"
                min={2}
                max={8}
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
                style={{
                  width: 50,
                  marginLeft: 4,
                  padding: 2,
                  borderRadius: 6,
                  border: "1px solid rgba(148,163,184,0.7)",
                  background: "rgba(15,23,42,0.9)",
                  color: "white",
                  fontSize: 12,
                }}
              />
            </label>

            <button
              className="neon-btn"
              style={{ padding: "4px 10px", fontSize: 13 }}
              disabled={loading || players.length < 4}
              onClick={generateRandomTeams}
            >
              🎲 Náhodně rozlosovat hráče
            </button>
          </div>

          {/* TEAMS LIST */}
          {teams.length > 0 ? (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {teams
                .slice()
                .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                .map((t) => {
                  const tPlayers = getPlayersInTeam(t.id);
                  return (
                    <div
                      key={t.id}
                      style={{
                        padding: 8,
                        borderRadius: 10,
                        border:
                          "1px solid rgba(148,163,184,0.6)",
                        minWidth: 180,
                        background: "rgba(15,23,42,0.95)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontWeight: 600,
                            fontSize: 14,
                          }}
                        >
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "999px",
                              background: t.color,
                            }}
                          />
                          {t.name}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            opacity: 0.8,
                          }}
                        >
                          {t.score ?? 0} b.
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          opacity: 0.8,
                        }}
                      >
                        Hráči:{" "}
                        {tPlayers.length
                          ? tPlayers
                              .map((p) => p.name)
                              .join(", ")
                          : "žádní"}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>
              Zatím žádné týmy. Vytvoř je náhodným losováním nebo můžeš
              později doplnit manuální logiku.
            </p>
          )}
        </div>

        {/* QUESTIONS LIST */}
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
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
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
                            {TYPE_ICONS[q.type] ?? "❓"} {q.title}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              opacity: 0.7,
                              marginTop: 2,
                            }}
                          >
                            Typ: {TYPE_LABELS[q.type] ?? q.type} • ID:{" "}
                            {q.id}
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

        {/* PLAYERS */}
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
                <div style={{ fontSize: 14, fontWeight: 600 }}>
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
                  {p.teamId && (
                    <span style={{ marginLeft: 8 }}>
                      • tým:{" "}
                      {teams.find((t) => t.id === p.teamId)?.name ||
                        p.teamId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </NeonLayout>
  );
}





