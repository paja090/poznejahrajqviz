// pages/AdminDashboard.jsx (revamped dashboard)
import { useEffect, useMemo, useState } from "react";
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
  addDoc,
  where,
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

const DIFFICULTY_LABELS = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const STATUS_COLORS = {
  running: "#22c55e",
  paused: "#facc15",
  waiting: "#64748b",
  idle: "#94a3b8",
};

export default function AdminDashboard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [teamSize, setTeamSize] = useState(4);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    difficulty: "all",
    category: "all",
  });
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [autoPlayDelay, setAutoPlayDelay] = useState(4000);
  const [pauseDuration, setPauseDuration] = useState(3000);

  // -------------------------------
  // LOAD ROOM
  // -------------------------------
  useEffect(() => {
    const roomRef = doc(db, "quizRooms", roomCode);
    return onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoom({ id: roomCode, ...data });
        if (data.teamSettings?.teamSize) {
          setTeamSize(data.teamSettings.teamSize);
        }
        if (data.settings?.autoPlayDelay) {
          setAutoPlayDelay(data.settings.autoPlayDelay);
        }
        if (data.settings?.pauseDuration) {
          setPauseDuration(data.settings.pauseDuration);
        }
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

  // -------------------------------
  // LOAD TEAMS
  // -------------------------------
  useEffect(() => {
    const tRef = collection(db, "quizRooms", roomCode, "teams");
    return onSnapshot(tRef, (snap) => {
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [roomCode]);

  // -------------------------------
  // LOAD ANSWERS (pro live statistiky)
  // -------------------------------
  useEffect(() => {
    const aRef = collection(db, "quizRooms", roomCode, "answers");
    return onSnapshot(aRef, (snap) => {
      setAnswers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [roomCode]);

  const questionMap = useMemo(() => {
    const map = new Map();
    questions.forEach((q) => map.set(q.id, q));
    return map;
  }, [questions]);

  const activeQuestion = useMemo(() => {
    if (!room?.currentQuestionId) return null;
    return questionMap.get(room.currentQuestionId) || null;
  }, [questionMap, room?.currentQuestionId]);

  const currentQuestionIndex = useMemo(() => {
    if (!room?.currentQuestionId) return -1;
    return questions.findIndex((q) => q.id === room.currentQuestionId);
  }, [questions, room?.currentQuestionId]);

  const activeAnswers = useMemo(() => {
    if (!room?.currentQuestionId) return [];
    return answers.filter((ans) => ans.questionId === room.currentQuestionId);
  }, [answers, room?.currentQuestionId]);

  const correctAnswersCount = useMemo(() => {
    if (!activeQuestion) return 0;
    return activeAnswers.filter((ans) =>
      evaluateAnswer(activeQuestion, ans.answer)
    ).length;
  }, [activeAnswers, activeQuestion]);

  const uniqueResponderCount = useMemo(() => {
    const set = new Set(activeAnswers.map((ans) => ans.playerId));
    return set.size;
  }, [activeAnswers]);

  const previousQuestion = useMemo(() => {
    if (currentQuestionIndex > 0) {
      return questions[currentQuestionIndex - 1];
    }
    return null;
  }, [questions, currentQuestionIndex]);

  const previousAnswers = useMemo(() => {
    if (!previousQuestion) return [];
    return answers.filter((ans) => ans.questionId === previousQuestion.id);
  }, [answers, previousQuestion]);

  const categories = useMemo(() => {
    const set = new Set();
    questions.forEach((q) => {
      if (q.category) set.add(q.category);
    });
    return Array.from(set);
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (
        filters.search &&
        !q.title?.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      if (filters.type !== "all" && q.type !== filters.type) return false;
      if (
        filters.difficulty !== "all" &&
        q.difficulty &&
        q.difficulty !== filters.difficulty
      ) {
        return false;
      }
      if (
        filters.category !== "all" &&
        q.category &&
        q.category !== filters.category
      ) {
        return false;
      }
      return true;
    });
  }, [filters, questions]);

  const timelineData = useMemo(() => {
    return questions.map((q, index) => {
      let state = "upcoming";
      if (room?.currentQuestionId === q.id) state = "current";
      else if (currentQuestionIndex > -1 && index < currentQuestionIndex)
        state = "done";
      return { id: q.id, title: q.title, state, index };
    });
  }, [questions, room?.currentQuestionId, currentQuestionIndex]);

  const playerStats = useMemo(() => {
    const statsMap = new Map();

    answers.forEach((ans) => {
      const question = questionMap.get(ans.questionId);
      if (!statsMap.has(ans.playerId)) {
        statsMap.set(ans.playerId, {
          total: 0,
          correct: 0,
          streak: 0,
          bestStreak: 0,
          totalTime: 0,
          timeCount: 0,
          fastest: Infinity,
        });
      }
      const stat = statsMap.get(ans.playerId);
      stat.total += 1;
      const isCorrect = evaluateAnswer(question, ans.answer);
      if (isCorrect) {
        stat.correct += 1;
        stat.streak += 1;
        stat.bestStreak = Math.max(stat.bestStreak, stat.streak);
      } else {
        stat.streak = 0;
      }
      const time = Number(ans.timeSubmitted);
      if (!Number.isNaN(time)) {
        stat.totalTime += time;
        stat.timeCount += 1;
        stat.fastest = Math.min(stat.fastest, time);
      }
    });

    return players.map((player) => {
      const stat = statsMap.get(player.id) || {
        total: 0,
        correct: 0,
        bestStreak: 0,
        timeCount: 0,
        totalTime: 0,
        fastest: Infinity,
      };
      return {
        ...player,
        accuracy:
          stat.total === 0 ? 0 : Math.round((stat.correct / stat.total) * 100),
        correctAnswers: stat.correct,
        longestStreak: stat.bestStreak || 0,
        averageTime:
          stat.timeCount === 0
            ? null
            : Math.round(stat.totalTime / stat.timeCount),
        fastestReaction: stat.fastest === Infinity ? null : stat.fastest,
      };
    });
  }, [answers, players, questionMap]);

  const topSpeedsters = useMemo(() => {
    return [...playerStats]
      .filter((p) => typeof p.fastestReaction === "number")
      .sort((a, b) => a.fastestReaction - b.fastestReaction)
      .slice(0, 3);
  }, [playerStats]);

  // =============================================================
  // HELPERS
  // =============================================================
  const startQuestion = async (id) => {
    if (loading) return;
    await updateDoc(doc(db, "quizRooms", roomCode), {
      currentQuestionId: id,
      status: "running",
    });
  };

  const startNextQuestion = async () => {
    if (!questions.length) return;
    const currentIndex = questions.findIndex((q) => q.id === room?.currentQuestionId);
    const nextQuestion =
      currentIndex === -1
        ? questions[0]
        : questions[currentIndex + 1] || null;
    if (nextQuestion) {
      await startQuestion(nextQuestion.id);
    }
  };

  const pauseQuestion = async () => {
    if (!room?.currentQuestionId) return;
    await updateDoc(doc(db, "quizRooms", roomCode), { status: "paused" });
  };

  const resumeQuestion = async () => {
    if (!room?.currentQuestionId) return;
    await startQuestion(room.currentQuestionId);
  };

  const resetAnswers = async (questionId = room?.currentQuestionId) => {
    if (!questionId) return;
    const answersRef = query(
      collection(db, "quizRooms", roomCode, "answers"),
      where("questionId", "==", questionId)
    );
    const snap = await getDocs(answersRef);
    const deletions = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletions);
  };

  const restartQuestion = async () => {
    if (!room?.currentQuestionId) return;
    await resetAnswers(room.currentQuestionId);
    await startQuestion(room.currentQuestionId);
  };

  const skipQuestion = async () => {
    if (!questions.length) return;
    await resetAnswers(room?.currentQuestionId);
    await startNextQuestion();
  };

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

    const ansSnap = await getDocs(
      collection(db, "quizRooms", roomCode, "answers")
    );
    const allAnswers = ansSnap.docs
      .map((d) => d.data())
      .filter((a) => a.questionId === questionId);

    const teamMode = !!room?.teamMode;
    const teamScoreDelta = {};

    if (question.type === "speed") {
      const sorted = [...allAnswers].sort(
        (a, b) => Number(a.timeSubmitted) - Number(b.timeSubmitted)
      );

      const scoring = evaluateSpeedScoring(sorted, room.settings || {});

      for (const pid in scoring) {
        const pts = scoring[pid];

        await updateDoc(doc(db, "quizRooms", roomCode, "players", pid), {
          score: increment(pts),
        });

        if (teamMode) {
          const player = players.find((p) => p.id === pid);
          if (player?.teamId) {
            teamScoreDelta[player.teamId] =
              (teamScoreDelta[player.teamId] || 0) + pts;
          }
        }
      }
    } else {
      for (const ans of allAnswers) {
        const isCorrect = evaluateAnswer(question, ans.answer);

        if (isCorrect) {
          await updateDoc(
            doc(db, "quizRooms", roomCode, "players", ans.playerId),
            { score: increment(1) }
          );

          if (teamMode) {
            const player = players.find((p) => p.id === ans.playerId);
            if (player?.teamId) {
              teamScoreDelta[player.teamId] =
                (teamScoreDelta[player.teamId] || 0) + 1;
            }
          }
        }
      }
    }

    if (teamMode) {
      const promises = Object.entries(teamScoreDelta).map(([teamId, pts]) =>
        updateDoc(doc(db, "quizRooms", roomCode, "teams", teamId), {
          score: increment(pts),
        })
      );
      await Promise.all(promises);
    }

    await updateDoc(doc(db, "quizRooms", roomCode), {
      currentQuestionId: null,
      status: "waiting",
      lastQuestionId: questionId,
    });

    setLoading(false);
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm("Opravdu smazat tuto otázku?")) return;
    await deleteDoc(doc(db, "quizRooms", roomCode, "questions", id));
    setSelectedQuestions((prev) => prev.filter((qId) => qId !== id));
  };

  const duplicateQuestion = async (question) => {
    const { id, ...rest } = question;
    const baseRef = collection(db, "quizRooms", roomCode, "questions");
    await addDoc(baseRef, {
      ...rest,
      title: `${question.title} (kopie)`,
      order: questions.length,
      createdAt: Date.now(),
    });
  };

  const goScoreboard = () => {
    navigate(`/scoreboard/${roomCode}`);
  };

  const openProjector = () => {
    const url = `${window.location.origin}/projector/${roomCode}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const reordered = Array.from(questions);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    setQuestions(reordered);

    const updates = reordered.map((q, index) =>
      updateDoc(doc(db, "quizRooms", roomCode, "questions", q.id), {
        order: index,
      })
    );

    await Promise.all(updates);
  };

  const toggleTeamMode = async () => {
    const newVal = !room?.teamMode;
    setLoading(true);

    try {
      if (!newVal) {
        const tRef = collection(db, "quizRooms", roomCode, "teams");
        const tSnap = await getDocs(tRef);
        await Promise.all(tSnap.docs.map((d) => deleteDoc(d.ref)));

        await Promise.all(
          players.map((p) =>
            updateDoc(doc(db, "quizRooms", roomCode, "players", p.id), {
              teamId: null,
            })
          )
        );
      }

      await updateDoc(doc(db, "quizRooms", roomCode), {
        teamMode: newVal,
        teamSettings: {
          ...(room?.teamSettings || {}),
          teamSize: Number(teamSize) || 4,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleLobbyLock = async () => {
    await updateDoc(doc(db, "quizRooms", roomCode), {
      lobbyLocked: !room?.lobbyLocked,
    });
  };

  const toggleAutoPlay = async () => {
    await updateDoc(doc(db, "quizRooms", roomCode), {
      autoPlayEnabled: !room?.autoPlayEnabled,
      settings: {
        ...(room?.settings || {}),
        autoPlayDelay,
      },
    });
  };

  useEffect(() => {
    if (!room?.autoPlayEnabled) return;
    if (room.status !== "waiting") return;
    const delay = room?.settings?.autoPlayDelay || autoPlayDelay || 4000;
    const timer = setTimeout(() => {
      startNextQuestion();
    }, delay);
    return () => clearTimeout(timer);
  }, [room?.autoPlayEnabled, room?.status, questions, autoPlayDelay]);

  const generateRandomTeams = async () => {
    if (!players.length) return;
    if (!window.confirm("Vytvořit nové náhodné týmy? Staré budou přepsány.")) {
      return;
    }

    setLoading(true);

    const tSnap = await getDocs(collection(db, "quizRooms", roomCode, "teams"));
    const deletePromises = tSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    const resetPromises = players.map((p) =>
      updateDoc(doc(db, "quizRooms", roomCode, "players", p.id), {
        teamId: null,
      })
    );
    await Promise.all(resetPromises);

    const { teams: newTeams, playerTeamMap } = createRandomTeams(
      players,
      Number(teamSize) || 4
    );

    const createTeamPromises = newTeams.map((t) =>
      setDoc(doc(db, "quizRooms", roomCode, "teams", t.id), t)
    );

    await Promise.all(createTeamPromises);

    const setTeamPromises = Object.entries(playerTeamMap).map(
      ([pid, teamId]) =>
        updateDoc(doc(db, "quizRooms", roomCode, "players", pid), {
          teamId,
        })
    );

    await Promise.all(setTeamPromises);

    await updateDoc(doc(db, "quizRooms", roomCode), {
      teamMode: true,
      teamSettings: {
        ...(room?.teamSettings || {}),
        teamSize: Number(teamSize) || 4,
      },
    });

    setLoading(false);
  };

  const getPlayersInTeam = (teamId) => players.filter((p) => p.teamId === teamId);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleQuestionSelection = (id) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedQuestions([]);

  const bulkDelete = async () => {
    if (!selectedQuestions.length) return;
    if (!window.confirm(`Smazat ${selectedQuestions.length} otázek?`)) return;
    await Promise.all(
      selectedQuestions.map((id) =>
        deleteDoc(doc(db, "quizRooms", roomCode, "questions", id))
      )
    );
    clearSelection();
  };

  const bulkToggleVisibility = async (hidden) => {
    if (!selectedQuestions.length) return;
    await Promise.all(
      selectedQuestions.map((id) =>
        updateDoc(doc(db, "quizRooms", roomCode, "questions", id), {
          isHidden: hidden,
        })
      )
    );
    clearSelection();
  };

  const openEditor = (question) => {
    setEditingQuestionId(question.id);
    setEditDraft({
      title: question.title || "",
      category: question.category || "",
      difficulty: question.difficulty || "easy",
      type: question.type || "abc",
    });
  };

  const saveQuestion = async () => {
    if (!editingQuestionId) return;
    await updateDoc(
      doc(db, "quizRooms", roomCode, "questions", editingQuestionId),
      editDraft
    );
    setEditingQuestionId(null);
  };

  const cancelEdit = () => {
    setEditingQuestionId(null);
    setEditDraft({});
  };

  const updateAutomationSettings = async () => {
    await updateDoc(doc(db, "quizRooms", roomCode), {
      settings: {
        ...(room?.settings || {}),
        autoPlayDelay,
        pauseDuration,
      },
    });
  };

  const lastQuestionReport = useMemo(() => {
    if (!previousQuestion) return null;
    const answersCount = previousAnswers.length;
    const correctCount = previousAnswers.filter((ans) =>
      evaluateAnswer(previousQuestion, ans.answer)
    ).length;
    const distribution = {};
    previousAnswers.forEach((ans) => {
      const label = Array.isArray(ans.answer)
        ? ans.answer.join(", ")
        : ans.answer ?? "—";
      distribution[label] = (distribution[label] || 0) + 1;
    });
    const topDistribution = Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return {
      question: previousQuestion,
      answersCount,
      correctCount,
      topDistribution,
    };
  }, [previousAnswers, previousQuestion]);

  const stateColor = STATUS_COLORS[room?.status] || STATUS_COLORS.idle;

  // =============================================================
  // RENDER
  // =============================================================
  return (
    <NeonLayout maxWidth={1400}>
      <div className="admin-dashboard">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Room • {roomCode}</p>
            <h1>🎛 Moderátorský panel</h1>
            <p className="subtext">
              Stav: <span style={{ color: stateColor }}>{room?.status}</span> •
              Hráčů: {players.length} • Týmový mód:{" "}
              {room?.teamMode ? "zapnutý" : "vypnutý"}
            </p>
          </div>
          <div className="header-actions">
            <Link to={`/`} className="ghost-btn">
              Domů
            </Link>
            <Link
              to={`/host/${roomCode}/questions`}
              className="ghost-btn"
            >
              ➕ Přidat manuálně
            </Link>
            <Link
              to={`/host/${roomCode}/select-questions`}
              className="ghost-btn"
            >
              📚 Import banky
            </Link>
            <button className="ghost-btn" onClick={openProjector}>
              🎥 Projektor otázek
            </button>
            <button className="ghost-btn" onClick={goScoreboard}>
              📊 Scoreboard
            </button>
          </div>
        </header>

        <section className="quick-actions-panel">
          <button className="action" onClick={startNextQuestion}>
            ▶ Start další otázky
          </button>
          <button className="action" onClick={pauseQuestion}>
            ⏸ Pauznout
          </button>
          <button className="action" onClick={resumeQuestion}>
            ▶ Pokračovat
          </button>
          <button className="action" onClick={stopQuestion} disabled={loading}>
            ⏹ Stop + vyhodnotit
          </button>
          <button className="action" onClick={resetAnswers}>
            ♻️ Reset odpovědí
          </button>
          <button className="action" onClick={restartQuestion}>
            🔄 Restart otázky
          </button>
          <button className="action" onClick={skipQuestion}>
            ⏭ Přeskočit otázku
          </button>
          <button
            className={`action ${room?.autoPlayEnabled ? "active" : ""}`}
            onClick={toggleAutoPlay}
          >
            ⚡ Auto-play {room?.autoPlayEnabled ? "ON" : "OFF"}
          </button>
          <button
            className={`action ${room?.lobbyLocked ? "active" : ""}`}
            onClick={toggleLobbyLock}
          >
            🔒 Lobby {room?.lobbyLocked ? "zamčeno" : "otevřeno"}
          </button>
        </section>

        <section className="automation-panel">
          <div>
            <h3>Automatizace</h3>
            <p className="subtext">
              Auto-start další otázky po pauze a automatická pauza mezi koly.
            </p>
          </div>
          <div className="automation-fields">
            <label>
              Auto-play delay (ms)
              <input
                type="number"
                min={1000}
                value={autoPlayDelay}
                onChange={(e) => setAutoPlayDelay(Number(e.target.value))}
              />
            </label>
            <label>
              Pauza mezi koly (ms)
              <input
                type="number"
                min={0}
                value={pauseDuration}
                onChange={(e) => setPauseDuration(Number(e.target.value))}
              />
            </label>
            <button className="ghost-btn" onClick={updateAutomationSettings}>
              💾 Uložit nastavení
            </button>
          </div>
        </section>

        <div className="dashboard-grid">
          {/* LEFT: QUESTIONS */}
          <section className="panel questions-panel">
            <div className="panel-header">
              <div>
                <h2>Otázky ({questions.length})</h2>
                <p className="subtext">
                  Drag & drop pořadí, filtry a hromadné akce.
                </p>
              </div>
              <div className="filters">
                <input
                  type="text"
                  placeholder="Hledat"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange("type", e.target.value)}
                >
                  <option value="all">Typ</option>
                  {Object.keys(TYPE_LABELS).map((key) => (
                    <option key={key} value={key}>
                      {TYPE_LABELS[key]}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.difficulty}
                  onChange={(e) =>
                    handleFilterChange("difficulty", e.target.value)
                  }
                >
                  <option value="all">Obtížnost</option>
                  {Object.keys(DIFFICULTY_LABELS).map((key) => (
                    <option key={key} value={key}>
                      {DIFFICULTY_LABELS[key]}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.category}
                  onChange={(e) =>
                    handleFilterChange("category", e.target.value)
                  }
                >
                  <option value="all">Kategorie</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedQuestions.length > 0 && (
              <div className="mass-actions">
                <span>{selectedQuestions.length} vybraných</span>
                <button onClick={bulkDelete}>🗑 Smazat</button>
                <button onClick={() => bulkToggleVisibility(true)}>
                  🙈 Skrýt
                </button>
                <button onClick={() => bulkToggleVisibility(false)}>
                  👀 Zobrazit
                </button>
                <button onClick={clearSelection}>Zrušit výběr</button>
              </div>
            )}

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="questions">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    {filteredQuestions.map((q, index) => (
                      <Draggable key={q.id} draggableId={q.id} index={index}>
                        {(dragProvided) => (
                          <div
                            className={`question-card ${
                              room?.currentQuestionId === q.id ? "current" : ""
                            } ${q.isHidden ? "muted" : ""}`}
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                          >
                            <div className="question-main">
                              <div className="drag-handle" {...dragProvided.dragHandleProps}>
                                ☰
                              </div>
                              <input
                                type="checkbox"
                                checked={selectedQuestions.includes(q.id)}
                                onChange={() => toggleQuestionSelection(q.id)}
                              />
                              <div className="question-content">
                                <div className="question-title">
                                  <span className="badge">{TYPE_ICONS[q.type]}</span>
                                  {editingQuestionId === q.id ? (
                                    <input
                                      type="text"
                                      value={editDraft.title}
                                      onChange={(e) =>
                                        setEditDraft((prev) => ({
                                          ...prev,
                                          title: e.target.value,
                                        }))
                                      }
                                    />
                                  ) : (
                                    <strong>{q.title}</strong>
                                  )}
                                </div>
                                <div className="question-meta">
                                  Typ: {TYPE_LABELS[q.type]} • Kategorie: {q.category || "—"}
                                  {q.difficulty && ` • ${DIFFICULTY_LABELS[q.difficulty] || q.difficulty}`}
                                </div>
                                {editingQuestionId === q.id && (
                                  <div className="inline-editor">
                                    <input
                                      type="text"
                                      value={editDraft.category}
                                      placeholder="Kategorie"
                                      onChange={(e) =>
                                        setEditDraft((prev) => ({
                                          ...prev,
                                          category: e.target.value,
                                        }))
                                      }
                                    />
                                    <select
                                      value={editDraft.difficulty}
                                      onChange={(e) =>
                                        setEditDraft((prev) => ({
                                          ...prev,
                                          difficulty: e.target.value,
                                        }))
                                      }
                                    >
                                      {Object.keys(DIFFICULTY_LABELS).map((key) => (
                                        <option key={key} value={key}>
                                          {DIFFICULTY_LABELS[key]}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      value={editDraft.type}
                                      onChange={(e) =>
                                        setEditDraft((prev) => ({
                                          ...prev,
                                          type: e.target.value,
                                        }))
                                      }
                                    >
                                      {Object.keys(TYPE_LABELS).map((key) => (
                                        <option key={key} value={key}>
                                          {TYPE_LABELS[key]}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="question-actions">
                              {editingQuestionId === q.id ? (
                                <>
                                  <button onClick={saveQuestion}>💾 Uložit</button>
                                  <button onClick={cancelEdit}>Zrušit</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startQuestion(q.id)}>
                                    ▶ Start
                                  </button>
                                  <button onClick={() => duplicateQuestion(q)}>
                                    📄 Duplikovat
                                  </button>
                                  <button onClick={() => openEditor(q)}>✏️ Edit</button>
                                  <button onClick={() => deleteQuestion(q.id)}>
                                    ❌
                                  </button>
                                </>
                              )}
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
          </section>

          {/* CENTER: LIVE CONTROL */}
          <section className="panel live-panel">
            <div className="panel-header">
              <div>
                <h2>Live řízení</h2>
                <p className="subtext">
                  Realtime náhled aktuální otázky, odpovědí a timeline.
                </p>
              </div>
              <div className="status-pill" style={{ background: stateColor }}>
                {room?.status || "—"}
              </div>
            </div>

            {activeQuestion ? (
              <div className="active-question">
                <h3>
                  {TYPE_ICONS[activeQuestion.type]} {activeQuestion.title}
                </h3>
                <p className="subtext">
                  Odpovědělo {uniqueResponderCount}/{players.length} hráčů •
                  Správně {correctAnswersCount}
                </p>
                <div className="live-stats">
                  <div>
                    <strong>{uniqueResponderCount}</strong>
                    <span>odpovědí</span>
                  </div>
                  <div>
                    <strong>{correctAnswersCount}</strong>
                    <span>správně</span>
                  </div>
                  <div>
                    <strong>{Math.max(uniqueResponderCount - correctAnswersCount, 0)}</strong>
                    <span>špatně</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="subtext">
                Žádná aktivní otázka – vyber jednu vlevo nebo spusť další v pořadí.
              </p>
            )}

            <div className="timeline">
              {timelineData.map((item) => (
                <div
                  key={item.id}
                  className={`timeline-item ${item.state}`}
                  onClick={() => startQuestion(item.id)}
                >
                  <span>{item.index + 1}</span>
                  <p>{item.title}</p>
                </div>
              ))}
            </div>

            <div className="report">
              <h3>Report poslední otázky</h3>
              {lastQuestionReport ? (
                <>
                  <p>
                    {lastQuestionReport.question.title} • odpovědí:
                    {" "}
                    {lastQuestionReport.answersCount} • správně:
                    {" "}
                    {lastQuestionReport.correctCount}
                  </p>
                  <ul>
                    {lastQuestionReport.topDistribution.map(([label, count]) => (
                      <li key={label}>
                        {label}: {count}×
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="subtext">Ještě není dostupný report.</p>
              )}
            </div>

            <div className="notifications">
              <h3>Live feed</h3>
              <ul>
                {activeAnswers
                  .slice()
                  .sort((a, b) => Number(b.timeSubmitted) - Number(a.timeSubmitted))
                  .slice(0, 6)
                  .map((ans) => {
                    const player = players.find((p) => p.id === ans.playerId);
                    const isCorrect = evaluateAnswer(activeQuestion, ans.answer);
                    return (
                      <li key={ans.id}>
                        <strong>{player?.name || ans.playerId}</strong> →
                        {" "}
                        {isCorrect ? "✅ správně" : "❌ špatně"}
                      </li>
                    );
                  })}
                {activeAnswers.length === 0 && (
                  <li className="subtext">Zatím žádné reakce.</li>
                )}
              </ul>
            </div>
          </section>

          {/* RIGHT: TEAMS & SETTINGS */}
          <section className="panel teams-panel">
            <div className="panel-header">
              <div>
                <h2>Týmy</h2>
                <p className="subtext">Správa týmů, velikost a přehled skóre.</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={!!room?.teamMode}
                  onChange={toggleTeamMode}
                />
                <span>Týmový mód</span>
              </label>
            </div>

            <div className="team-controls">
              <label>
                Velikost týmu
                <input
                  type="number"
                  min={2}
                  max={8}
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                />
              </label>
              <button
                className="ghost-btn"
                disabled={loading || players.length < 4}
                onClick={generateRandomTeams}
              >
                🎲 Náhodně rozlosovat
              </button>
            </div>

            <div className="team-list">
              {teams.map((team) => {
                const members = getPlayersInTeam(team.id);
                const accuracy = (() => {
                  const answersForTeam = answers.filter((ans) =>
                    members.some((m) => m.id === ans.playerId)
                  );
                  if (!answersForTeam.length) return 0;
                  const correct = answersForTeam.filter((ans) =>
                    evaluateAnswer(questionMap.get(ans.questionId), ans.answer)
                  ).length;
                  return Math.round((correct / answersForTeam.length) * 100);
                })();
                return (
                  <div key={team.id} className="team-card">
                    <div className="team-header">
                      <div>
                        <h4>
                          <span
                            className="team-color"
                            style={{ background: team.color || "#38bdf8" }}
                          />
                          {team.name || team.id}
                        </h4>
                        <p className="subtext">Skóre: {team.score ?? 0}</p>
                      </div>
                      <span className="badge">{accuracy}%</span>
                    </div>
                    <ul>
                      {members.map((member) => (
                        <li key={member.id}>
                          {member.name} ({member.score ?? 0})
                        </li>
                      ))}
                      {members.length === 0 && (
                        <li className="subtext">Bez členů</li>
                      )}
                    </ul>
                  </div>
                );
              })}
              {teams.length === 0 && (
                <p className="subtext">Zatím nejsou vytvořeny žádné týmy.</p>
              )}
            </div>

            <div className="top-speedsters">
              <h3>TOP 3 nejrychlejší</h3>
              <ol>
                {topSpeedsters.map((player) => (
                  <li key={player.id}>
                    {player.name} – {player.fastestReaction} ms
                  </li>
                ))}
                {topSpeedsters.length === 0 && (
                  <li className="subtext">Zatím žádná data.</li>
                )}
              </ol>
            </div>
          </section>
        </div>

        <section className="panel player-stats">
          <div className="panel-header">
            <div>
              <h2>Statistiky hráčů</h2>
              <p className="subtext">
                Accuracy, reakční časy, série správných odpovědí.
              </p>
            </div>
          </div>
          <div className="player-table">
            <div className="player-row head">
              <span>Hráč</span>
              <span>Skóre</span>
              <span>Accuracy</span>
              <span>Průměrný čas</span>
              <span>Nejrychlejší</span>
              <span>Streak</span>
            </div>
            {playerStats.map((player) => (
              <div key={player.id} className="player-row">
                <span>{player.name}</span>
                <span>{player.score ?? 0}</span>
                <span>{player.accuracy}%</span>
                <span>{player.averageTime ? `${player.averageTime} ms` : "—"}</span>
                <span>
                  {player.fastestReaction ? `${player.fastestReaction} ms` : "—"}
                </span>
                <span>{player.longestStreak}</span>
              </div>
            ))}
            {playerStats.length === 0 && (
              <p className="subtext">Žádní připojení hráči.</p>
            )}
          </div>
        </section>
      </div>
    </NeonLayout>
  );
}
