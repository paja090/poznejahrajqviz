import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../firebaseConfig";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  query,
  orderBy,
} from "firebase/firestore";

export default function AdminDashboard() {
  const { roomCode } = useParams();

  const [questions, setQuestions] = useState([]);
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [status, setStatus] = useState("waiting");
  const [players, setPlayers] = useState([]);
  const [answersCount, setAnswersCount] = useState(0);
  const [answeredPlayerIds, setAnsweredPlayerIds] = useState([]);

  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);

 {/* Otázky */}
<div style={styles.section}>
  <h2 style={styles.header}>Otázky</h2>

  <Link
    to={`/host/${roomCode}/select-questions`}
    style={{
      display: "inline-block",
      marginBottom: 10,
      padding: "8px 12px",
      background: "rgba(148,163,184,0.2)",
      color: "white",
      borderRadius: 8,
      fontSize: 14,
      textDecoration: "none"
    }}
  >
    📚 Vybrat otázky z databáze
  </Link>

  {questions.map((q, index) => {
    const isActive = currentQuestionId === q.id;

    return (
      <div
        key={q.id}
        style={{
          ...styles.questionBox,
          border: isActive
            ? "1px solid rgba(16, 185, 129, 0.8)"
            : "1px solid transparent",
        }}
      >
        <strong>
          {index + 1}. {q.title}
        </strong>

        {/* … původní obsah otázky */}
      </div>
    );
  })}
</div>

  // počet odpovědí
  useEffect(() => {
    if (!currentQuestionId) {
      setAnswersCount(0);
      setAnsweredPlayerIds([]);
      return;
    }

    const ansRef = collection(db, "quizRooms", roomCode, "answers");

    return onSnapshot(ansRef, (snap) => {
      const filtered = snap.docs.filter(
        (d) => d.data().questionId === currentQuestionId
      );
      setAnswersCount(filtered.length);
      setAnsweredPlayerIds(filtered.map((d) => d.data().playerId));
    });
  }, [roomCode, currentQuestionId]);

  const unansweredPlayers = players.filter(
    (p) => !answeredPlayerIds.includes(p.id)
  );

  // spustit konkrétní otázku
  const startQuestion = async (id) => {
    await setDoc(
      doc(db, "quizRooms", roomCode),
      { currentQuestionId: id, status: "running" },
      { merge: true }
    );
  };

  // start hry + odpočet
  const startGameWithCountdown = () => {
    if (!questions.length) {
      alert("Nejsou připravené žádné otázky.");
      return;
    }

    setIsCountingDown(true);
    setCountdownValue(3);

    let value = 3;
    const interval = setInterval(() => {
      value -= 1;
      if (value <= 0) {
        clearInterval(interval);
        setIsCountingDown(false);
        startQuestion(questions[0].id);
      } else {
        setCountdownValue(value);
      }
    }, 1000);
  };

  // pauza / pokračovat
  const togglePause = async () => {
    const newStatus = status === "paused" ? "running" : "paused";
    await setDoc(
      doc(db, "quizRooms", roomCode),
      { status: newStatus },
      { merge: true }
    );
  };

  // ukončit hru
  const endGame = async () => {
    await setDoc(
      doc(db, "quizRooms", roomCode),
      { status: "finished", currentQuestionId: null },
      { merge: true }
    );
    alert("Hra ukončena.");
  };

  // další otázka
  const startNextQuestion = () => {
    if (!questions.length) return;

    if (!currentQuestionId) {
      startQuestion(questions[0].id);
      return;
    }

    const idx = questions.findIndex((q) => q.id === currentQuestionId);
    const nextIndex = idx + 1;

    if (nextIndex < questions.length) {
      startQuestion(questions[nextIndex].id);
    } else {
      alert("Žádné další otázky.");
    }
  };

  const statusLabel = {
    waiting: "Čeká se na start",
    running: "Hra běží",
    paused: "Hra pozastavena",
    finished: "Hra ukončena",
  }[status] || status;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Moderátor – Místnost {roomCode}</h1>

        <p style={styles.subHeader}>
          Odtud řídíš hru: start, pauza, další otázky i žebříček.
        </p>

        <Link
          to={`/host/${roomCode}/questions`}
          style={styles.linkQuestions}
        >
          ➕ Správa a přidávání otázek
        </Link>

        {/* Stav hry */}
        <div style={styles.section}>
          <h2 style={styles.header}>Stav hry</h2>
          <p style={styles.statusPill}>{statusLabel}</p>

          {isCountingDown && (
            <div style={styles.countdownBox}>
              <div style={styles.countdownNumber}>{countdownValue}</div>
              <p style={styles.sub}>Připravte se… hra se spustí!</p>
            </div>
          )}

          {!isCountingDown && status !== "finished" && (
            <div style={styles.btnCol}>
              <button
                style={styles.btnPrimary}
                onClick={startGameWithCountdown}
              >
                🚀 Start hry (3…2…1)
              </button>

              <button style={styles.btnNext} onClick={startNextQuestion}>
                ⏭ Další otázka
              </button>

              <button style={styles.btnPause} onClick={togglePause}>
                {status === "paused" ? "▶ Pokračovat" : "⏸ Pozastavit hru"}
              </button>

              <button style={styles.btnEnd} onClick={endGame}>
                🛑 Ukončit hru
              </button>

              <Link to={`/scoreboard/${roomCode}`} style={styles.btnScore}>
                📊 Zobrazit žebříček
              </Link>
            </div>
          )}

          {status === "finished" && (
            <p style={styles.sub}>
              Hra je ukončena. Můžeš vytvořit novou místnost pro další kolo.
            </p>
          )}
        </div>

        {/* Hráči */}
        <div style={styles.section}>
          <h2 style={styles.header}>Hráči ({players.length})</h2>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {players.map((p) => (
              <li key={p.id} style={styles.player}>
                {p.name} – {p.score ?? 0} b.
              </li>
            ))}
          </ul>
        </div>

        {/* Otázky */}
        <div style={styles.section}>
          <h2 style={styles.header}>Otázky</h2>

          {questions.map((q, index) => {
            const isActive = currentQuestionId === q.id;
            return (
              <div
                key={q.id}
                style={{
                  ...styles.questionBox,
                  border: isActive
                    ? "1px solid rgba(16, 185, 129, 0.8)"
                    : "1px solid transparent",
                }}
              >
                <strong>
                  {index + 1}. {q.title}
                </strong>

                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                  Typ: {q.type === "abc"
                    ? "ABC"
                    : q.type === "open"
                    ? "Otevřená"
                    : "Rychlostní"}
                </div>

                {q.type === "abc" && q.options && (
                  <div style={styles.smallOptions}>
                    <div>A: {q.options[0]}</div>
                    <div>B: {q.options[1]}</div>
                    <div>C: {q.options[2]}</div>
                  </div>
                )}

                {q.type === "open" && (
                  <div style={styles.smallOptions}>
                    Správná odpověď: {q.correctAnswer}
                  </div>
                )}

                {q.type === "speed" && (
                  <div style={styles.smallOptions}>
                    ⚡ Bod získá nejrychlejší odpověď.
                  </div>
                )}

                {isActive && (
                  <>
                    <p style={{ color: "#00e5a8", marginTop: 8 }}>
                      ▶ Aktuální otázka – odpovědělo: {answersCount}/
                      {players.length}
                    </p>

                    {unansweredPlayers.length > 0 && (
                      <div style={styles.unansweredBox}>
                        <div
                          style={{ fontWeight: 600, marginBottom: 4 }}
                        >
                          Neodpověděli:
                        </div>
                        <div style={styles.unansweredList}>
                          {unansweredPlayers
                            .map((p) => p.name)
                            .join(", ")}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div style={styles.btnRow}>
                  <button
                    style={styles.btnStartQ}
                    onClick={() => startQuestion(q.id)}
                  >
                    ▶ Spustit tuto otázku
                  </button>
                </div>
              </div>
            );
          })}

          {questions.length === 0 && (
            <p style={{ fontSize: 13, opacity: 0.7 }}>
              Zatím žádné otázky – přidej je v sekci „Otázky“.
            </p>
          )}
        </div>

        <div style={styles.footerNote}>
          Tip: Pro podrobné vyhodnocení odpovědí (správně/špatně) použij
          obrazovku „Otázky“, kde je logika vyhodnocování.
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#020617",
    color: "white",
    padding: 16,
  },
  container: {
    maxWidth: 700,
    margin: "0 auto",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    background: "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
    WebkitBackgroundClip: "text",
    color: "transparent",
    textAlign: "center",
    marginBottom: 4,
  },
  subHeader: {
    textAlign: "center",
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 10,
  },
  linkQuestions: {
    display: "inline-block",
    fontSize: 13,
    marginBottom: 14,
    color: "#a5b4fc",
  },
  section: {
    marginBottom: 18,
    background: "rgba(15,23,42,0.92)",
    padding: 14,
    borderRadius: 14,
    boxShadow: "0 0 18px rgba(15,23,42,0.9)",
    border: "1px solid rgba(148,163,184,0.3)",
  },
  header: {
    fontSize: 17,
    marginBottom: 8,
  },
  statusPill: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 999,
    background: "rgba(148,163,184,0.18)",
    fontSize: 13,
    marginBottom: 8,
  },
  countdownBox: {
    marginTop: 10,
    textAlign: "center",
  },
  countdownNumber: {
    fontSize: 40,
    fontWeight: 800,
    textShadow: "0 0 20px rgba(236,72,153,0.9)",
  },
  sub: {
    marginTop: 6,
    opacity: 0.7,
    fontSize: 13,
  },
  btnCol: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 10,
  },
  btnPrimary: {
    width: "100%",
    padding: 10,
    background: "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
    borderRadius: 999,
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
    color: "#071022",
    fontSize: 15,
  },
  btnNext: {
    width: "100%",
    padding: 9,
    background: "linear-gradient(45deg,#22c55e,#16a34a)",
    borderRadius: 999,
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    color: "#071022",
    fontSize: 14,
  },
  btnPause: {
    width: "100%",
    padding: 9,
    background: "linear-gradient(45deg,#facc15,#eab308)",
    borderRadius: 999,
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    color: "#071022",
    fontSize: 14,
  },
  btnEnd: {
    width: "100%",
    padding: 9,
    background: "linear-gradient(45deg,#ef4444,#b91c1c)",
    borderRadius: 999,
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    color: "#f9fafb",
    fontSize: 14,
  },
  btnScore: {
    width: "100%",
    display: "block",
    marginTop: 4,
    textAlign: "center",
    padding: 9,
    background: "rgba(148,163,184,0.25)",
    borderRadius: 999,
    fontWeight: 500,
    fontSize: 14,
    color: "white",
    textDecoration: "none",
  },
  player: {
    marginBottom: 4,
    fontSize: 14,
  },
  questionBox: {
    background: "rgba(15,23,42,0.95)",
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  smallOptions: {
    fontSize: 13,
    opacity: 0.8,
    marginTop: 4,
  },
  unansweredBox: {
    marginTop: 6,
    padding: 6,
    borderRadius: 10,
    background: "rgba(239,68,68,0.12)",
    fontSize: 13,
  },
  unansweredList: {
    opacity: 0.9,
  },
  btnRow: {
    display: "flex",
    gap: 8,
    marginTop: 8,
  },
  btnStartQ: {
    flex: 1,
    padding: 8,
    background: "linear-gradient(45deg,#38bdf8,#6366f1)",
    borderRadius: 999,
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    color: "#071022",
    fontSize: 14,
  },
  footerNote: {
    marginTop: 10,
    fontSize: 12,
    opacity: 0.6,
    textAlign: "center",
  },
};

