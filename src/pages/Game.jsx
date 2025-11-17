import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  collection
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

  // === Poslech místnosti ===
  useEffect(() => {
    const roomRef = doc(db, "quizRooms", roomCode);

    const unsub = onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      if (!data) return;

      setCurrentQuestionId(data.currentQuestionId);

      if (data.currentQuestionId) {
        setLastQuestionId(data.currentQuestionId);
      }

      setAnswered(false);
      setResult(null);
    });

    return () => unsub();
  }, [roomCode]);

  // === Načtení otázky ===
  useEffect(() => {
    if (!currentQuestionId) return;

    const qRef = doc(
      db,
      "quizRooms",
      roomCode,
      "questions",
      currentQuestionId
    );

    getDoc(qRef).then((snap) => {
      if (snap.exists()) {
        setQuestion(snap.data());
      }
    });
  }, [currentQuestionId, roomCode]);

  // === Konec otázky → výsledek ===
  useEffect(() => {
    if (currentQuestionId === null && lastQuestionId) {
      showResult();
    }
  }, [currentQuestionId]);

  // === Zobrazení výsledku ===
  const showResult = async () => {
    if (!lastQuestionId) return;

    const qRef = doc(db, "quizRooms", roomCode, "questions", lastQuestionId);
    const qSnap = await getDoc(qRef);
    const qData = qSnap.data();

    const ansRef = doc(
      db,
      "quizRooms",
      roomCode,
      "answers",
      `${playerId}_${lastQuestionId}`
    );
    const ansSnap = await getDoc(ansRef);
    const ansData = ansSnap.data();

    const isCorrect = ansData?.answer === qData.correctAnswer;

    setResult({
      isCorrect,
      correctAnswer: qData.correctAnswer,
    });

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

  // === Scoreboard ===
  const loadScoreboard = () => {
    const playersRef = collection(db, "quizRooms", roomCode, "players");

    return onSnapshot(playersRef, (snap) => {
      const playersList = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      playersList.sort((a, b) => (b.score || 0) - (a.score || 0));

      setPlayers(playersList);
    });
  };

  // === Odeslání odpovědi ===
  const sendAnswer = async (index) => {
    if (answered) return;

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
        answer: index,
        timeSubmitted: serverTimestamp(),
      }
    );
  };

  // === UI: Výsledek ===
  if (result) {
    return (
      <div style={styles.container}>
        <div style={styles.resultBox}>
          {result.isCorrect ? (
            <h1 style={styles.correct}>✔ Správně!</h1>
          ) : (
            <h1 style={styles.wrong}>✘ Špatně!</h1>
          )}

          <p style={styles.correctAnswer}>
            Správná odpověď:{" "}
            <span style={{ fontSize: 30 }}>
              {["A", "B", "C"][result.correctAnswer]}
            </span>
          </p>

          <p style={styles.sub}>Čekej na žebříček…</p>
        </div>
      </div>
    );
  }

  // === UI: Scoreboard ===
  if (showScoreboard) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>📊 Žebříček</h1>

        <div style={styles.scoreboardBox}>
          {players.map((p, index) => (
            <div key={p.id} style={styles.scoreRow}>
              <span>{index + 1}. {p.name}</span>
              <strong>{p.score ?? 0} b.</strong>
            </div>
          ))}
        </div>

        <p style={styles.sub}>Další otázka začne za chvíli…</p>
      </div>
    );
  }

  // === UI: Hra ===
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Místnost {roomCode}</h1>

      {!currentQuestionId && !question && (
        <p style={styles.sub}>Čekáme na další otázku…</p>
      )}

      {question && (
        <>
          <h2 style={styles.question}>{question.title}</h2>

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

          {answered && (
            <p style={styles.sent}>Odpověď odeslána! ✔</p>
          )}
        </>
      )}
    </div>
  );
}

// === Styling ===
const styles = {
  container: {
    padding: "20px",
    maxWidth: 400,
    margin: "0 auto",
    textAlign: "center",
    fontFamily: "Inter, sans-serif",
    color: "white",
  },

  title: {
    fontSize: 26,
    marginBottom: 20,
    fontWeight: 700,
    background: "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
    WebkitBackgroundClip: "text",
    color: "transparent",
  },

  question: {
    fontSize: 22,
    marginBottom: 20,
  },

  answerBtn: {
    background: "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
    boxShadow: "0 0 15px rgba(236,72,153,0.5)",
    borderRadius: 14,
    padding: "14px 20px",
    marginBottom: 12,
    width: "100%",
    color: "#071022",
    fontSize: 18,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
  },

  sent: {
    color: "lime",
    marginTop: 10,
    fontSize: 18,
  },

  resultBox: {
    marginTop: 60,
  },

  correct: {
    fontSize: 40,
    color: "lime",
    textShadow: "0 0 20px lime",
  },

  wrong: {
    fontSize: 40,
    color: "red",
    textShadow: "0 0 20px red",
  },

  correctAnswer: {
    marginTop: 20,
    fontSize: 22,
  },

  sub: {
    marginTop: 25,
    opacity: 0.7,
  },

  scoreboardBox: {
    marginTop: 20,
    padding: 10,
  },

  scoreRow: {
    background: "rgba(255,255,255,0.08)",
    padding: "10px 14px",
    borderRadius: 12,
    marginBottom: 10,
    fontSize: 18,
    display: "flex",
    justifyContent: "space-between",
  },
};



