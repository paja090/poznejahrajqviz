import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
} from "firebase/firestore";

export default function Game() {
  const { roomCode, playerId } = useParams();

  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answered, setAnswered] = useState(false);

  const [lastQuestionId, setLastQuestionId] = useState(null);
  const [result, setResult] = useState(null);

  const [players, setPlayers] = useState([]);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [status, setStatus] = useState("waiting");
  const [openAnswer, setOpenAnswer] = useState("");

  // Poslech místnosti
  useEffect(() => {
    const roomRef = doc(db, "quizRooms", roomCode);

    const unsub = onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      if (!data) return;

      setStatus(data.status || "waiting");

      setCurrentQuestionId(data.currentQuestionId);

      if (data.currentQuestionId) {
        setLastQuestionId(data.currentQuestionId);
        setAnswered(false);
        setResult(null);
        setShowScoreboard(false);
        setOpenAnswer("");
      }
    });

    return () => unsub();
  }, [roomCode]);

  // Načtení otázky
  useEffect(() => {
    if (!currentQuestionId) {
      setQuestion(null);
      return;
    }

    const qRef = doc(
      db,
      "quizRooms",
      roomCode,
      "questions",
      currentQuestionId
    );

    getDoc(qRef).then((snap) => {
      if (snap.exists()) {
        setQuestion({ id: currentQuestionId, ...snap.data() });
      }
    });
  }, [currentQuestionId, roomCode]);

  // Konec otázky -> výsledek
  useEffect(() => {
    if (currentQuestionId === null && lastQuestionId) {
      showResult();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionId]);

  // Zobrazení výsledku
  const showResult = async () => {
    if (!lastQuestionId) return;

    const qRef = doc(db, "quizRooms", roomCode, "questions", lastQuestionId);
    const qSnap = await getDoc(qRef);
    if (!qSnap.exists()) return;
    const qData = { id: lastQuestionId, ...qSnap.data() };

    const ansRef = doc(
      db,
      "quizRooms",
      roomCode,
      "answers",
      `${playerId}_${lastQuestionId}`
    );
    const ansSnap = await getDoc(ansRef);
    const ansData = ansSnap.exists() ? ansSnap.data() : null;

    let res = {
      type: qData.type || "abc",
      correctAnswer: qData.correctAnswer,
      isCorrect: false,
      isWinner: false,
      answered: !!ansData,
    };

    if (!ansData) {
      // hráč neodpověděl
      setResult(res);
    } else if (qData.type === "abc") {
      res.isCorrect = ansData.answer === qData.correctAnswer;
      setResult(res);
    } else if (qData.type === "open") {
      if (
        typeof ansData.answer === "string" &&
        typeof qData.correctAnswer === "string"
      ) {
        res.isCorrect =
          ansData.answer.trim().toLowerCase() ===
          qData.correctAnswer.trim().toLowerCase();
      }
      setResult(res);
    } else if (qData.type === "speed") {
      const allAnsSnap = await getDocs(
        collection(db, "quizRooms", roomCode, "answers")
      );
      const allForQuestion = allAnsSnap.docs
        .map((d) => d.data())
        .filter(
          (a) =>
            a.questionId === lastQuestionId && a.timeSubmitted
        );

      if (allForQuestion.length) {
        allForQuestion.sort(
          (a, b) =>
            a.timeSubmitted.toMillis() - b.timeSubmitted.toMillis()
        );
        const fastest = allForQuestion[0];
        res.isWinner = fastest.playerId === playerId;
      }
      setResult(res);
    }

    setTimeout(() => {
      setResult(null);
      loadScoreboard();
      setShowScoreboard(true);

      setTimeout(() => {
        setShowScoreboard(false);
        setQuestion(null);
      }, 5000);
    }, 4000);
  };

  // Scoreboard
  const loadScoreboard = () => {
    const playersRef = collection(db, "quizRooms", roomCode, "players");

    return onSnapshot(playersRef, (snap) => {
      const playersList = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      playersList.sort((a, b) => (b.score || 0) - (a.score || 0));
      setPlayers(playersList);
    });
  };

  // Odeslání odpovědi
  const sendAnswer = async (value) => {
    if (answered || !currentQuestionId) return;

    setAnswered(true);

    await setDoc(
      doc(
        db,
        "quizRooms",
        roomCode,
        "answers",
        `${playerId}_${currentQuestionId}`
      ),
      {
        playerId,
        questionId: currentQuestionId,
        answer: value,
        type: question?.type || "abc",
        timeSubmitted: serverTimestamp(),
      }
    );
  };

  // UI: Výsledek
  if (result) {
    if (result.type === "speed") {
      return (
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.resultBox}>
              <h1
                style={
                  result.answered && result.isWinner
                    ? styles.correct
                    : styles.wrong
                }
              >
                {result.answered
                  ? result.isWinner
                    ? "⚡ Byl jsi nejrychlejší!"
                    : "Někdo byl o chlup rychlejší…"
                  : "Nestihl jsi odpovědět."}
              </h1>

              <p style={styles.sub}>Čekej na žebříček…</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.resultBox}>
            {result.answered ? (
              result.isCorrect ? (
                <h1 style={styles.correct}>✔ Správně!</h1>
              ) : (
                <h1 style={styles.wrong}>✘ Špatně!</h1>
              )
            ) : (
              <h1 style={styles.wrong}>⏱ Neodpověděl jsi včas</h1>
            )}

            {result.type === "abc" && (
              <p style={styles.correctAnswer}>
                Správná odpověď:{" "}
                <span style={{ fontSize: 30 }}>
                  {["A", "B", "C"][result.correctAnswer]}
                </span>
              </p>
            )}

            {result.type === "open" && (
              <p style={styles.correctAnswer}>
                Správná odpověď:{" "}
                <span style={{ fontSize: 20 }}>
                  {result.correctAnswer}
                </span>
              </p>
            )}

            <p style={styles.sub}>Čekej na žebříček…</p>
          </div>
        </div>
      </div>
    );
  }

  // UI: Scoreboard
  if (showScoreboard) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.title}>📊 Žebříček</h1>

          <div style={styles.scoreboardBox}>
            {players.map((p, index) => (
              <div key={p.id} style={styles.scoreRow}>
                <span>
                  {index + 1}. {p.name}
                </span>
                <strong>{p.score ?? 0} b.</strong>
              </div>
            ))}
          </div>

          <p style={styles.sub}>Další otázka začne za chvíli…</p>
        </div>
      </div>
    );
  }

  // UI: Hra
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Místnost {roomCode}</h1>

        {status === "paused" && (
          <div style={styles.pausedBox}>
            ⏸ Hra je dočasně pozastavena, počkej na moderátora.
          </div>
        )}

        {!currentQuestionId && !question && (
          <p style={styles.sub}>Čekáme na další otázku…</p>
        )}

        {question && (
          <>
            <h2 style={styles.question}>{question.title}</h2>

            {/* ABC */}
            {question.type === "abc" && question.options && (
              <>
                {question.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendAnswer(idx)}
                    disabled={answered}
                    style={{
                      ...styles.answerBtn,
                      opacity: answered ? 0.5 : 1,
                    }}
                  >
                    {["A", "B", "C"][idx]} – {opt}
                  </button>
                ))}
              </>
            )}

            {/* otevřená */}
            {question.type === "open" && (
              <>
                <input
                  style={styles.input}
                  value={openAnswer}
                  onChange={(e) => setOpenAnswer(e.target.value)}
                  placeholder="Napiš svou odpověď…"
                  disabled={answered}
                />
                <button
                  onClick={() => sendAnswer(openAnswer)}
                  disabled={answered || !openAnswer.trim()}
                  style={{
                    ...styles.answerBtn,
                    opacity:
                      answered || !openAnswer.trim() ? 0.6 : 1,
                    fontSize: 16,
                  }}
                >
                  ✔ Odeslat odpověď
                </button>
              </>
            )}

            {/* speed */}
            {question.type === "speed" && (
              <>
                <p style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>
                  ⚡ Rychlostní otázka – buď první, kdo odpoví.
                </p>
                <input
                  style={styles.input}
                  value={openAnswer}
                  onChange={(e) => setOpenAnswer(e.target.value)}
                  placeholder="Tvá odpověď…"
                  disabled={answered}
                />
                <button
                  onClick={() => sendAnswer(openAnswer || "answered")}
                  disabled={answered}
                  style={{
                    ...styles.answerBtn,
                    opacity: answered ? 0.6 : 1,
                    fontSize: 16,
                  }}
                >
                  ⚡ Odpovědět co nejrychleji
                </button>
              </>
            )}

            {answered && (
              <p style={styles.sent}>Odpověď odeslána! ✔</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#020617",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    textAlign: "center",
    fontFamily: "Inter, sans-serif",
    color: "white",
  },
  title: {
    fontSize: 26,
    marginBottom: 16,
    fontWeight: 700,
    background: "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
    WebkitBackgroundClip: "text",
    color: "transparent",
  },
  question: {
    fontSize: 22,
    marginBottom: 16,
  },
  answerBtn: {
    background: "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
    boxShadow: "0 0 15px rgba(236,72,153,0.5)",
    borderRadius: 14,
    padding: "14px 20px",
    marginBottom: 10,
    width: "100%",
    color: "#071022",
    fontSize: 18,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
  },
  input: {
    width: "100%",
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.6)",
    background: "rgba(15,23,42,0.8)",
    color: "white",
    fontSize: 14,
    marginBottom: 10,
    outline: "none",
  },
  sent: {
    color: "lime",
    marginTop: 10,
    fontSize: 16,
  },
  resultBox: {
    marginTop: 40,
  },
  correct: {
    fontSize: 34,
    color: "lime",
    textShadow: "0 0 20px lime",
  },
  wrong: {
    fontSize: 34,
    color: "red",
    textShadow: "0 0 20px red",
  },
  correctAnswer: {
    marginTop: 18,
    fontSize: 18,
  },
  sub: {
    marginTop: 20,
    opacity: 0.7,
    fontSize: 14,
  },
  scoreboardBox: {
    marginTop: 16,
    padding: 10,
  },
  scoreRow: {
    background: "rgba(255,255,255,0.08)",
    padding: "10px 14px",
    borderRadius: 12,
    marginBottom: 8,
    fontSize: 16,
    display: "flex",
    justifyContent: "space-between",
  },
  pausedBox: {
    padding: 8,
    borderRadius: 999,
    background: "rgba(148,163,184,0.2)",
    fontSize: 13,
    marginBottom: 10,
  },
};
