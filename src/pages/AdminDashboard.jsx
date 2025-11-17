import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  query,
  orderBy
} from "firebase/firestore";

export default function AdminDashboard() {
  const { roomCode } = useParams();

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [players, setPlayers] = useState([]);
  const [answersCount, setAnswersCount] = useState(0);

  // === Načíst otázky ===
  useEffect(() => {
    const q = query(
      collection(db, "quizRooms", roomCode, "questions"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [roomCode]);

  // === Aktuální otázka ===
  useEffect(() => {
    const roomRef = doc(db, "quizRooms", roomCode);
    return onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      setCurrentQuestion(data?.currentQuestionId || null);
    });
  }, [roomCode]);

  // === Načíst hráče ===
  useEffect(() => {
    const pRef = collection(db, "quizRooms", roomCode, "players");
    return onSnapshot(pRef, (snap) => {
      setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [roomCode]);

  // === Počet odpovědí na aktuální otázku ===
  useEffect(() => {
    if (!currentQuestion) return;

    const ansRef = collection(db, "quizRooms", roomCode, "answers");

    return onSnapshot(ansRef, (snap) => {
      const filtered = snap.docs.filter(
        (d) => d.data().questionId === currentQuestion
      );
      setAnswersCount(filtered.length);
    });
  }, [roomCode, currentQuestion]);

  // === Spustit otázku ===
  const startQuestion = async (id) => {
    await setDoc(
      doc(db, "quizRooms", roomCode),
      { currentQuestionId: id },
      { merge: true }
    );
  };

  // === Vyhodnotit otázku ===
  const evaluateQuestion = async (qId) => {
    const qRef = doc(db, "quizRooms", roomCode, "questions", qId);
    const qSnap = await getDoc(qRef);
    const question = qSnap.data();
    const correct = question.correctAnswer;

    const ansRef = collection(db, "quizRooms", roomCode, "answers");
    const ansSnap = await onSnapshot(ansRef, () => {});

    const all = ansSnap.docs.map((d) => d.data());

    for (let a of all) {
      if (a.questionId !== qId) continue;

      const pRef = doc(db, "quizRooms", roomCode, "players", a.playerId);

      await updateDoc(pRef, {
        score: (a.answer === correct)
          ? (a.score || 0) + 1
          : (a.score || 0),
      });
    }

    await updateDoc(doc(db, "quizRooms", roomCode), {
      currentQuestionId: null
    });
  };

  // === Automaticky spustit další otázku ===
  const startNext = () => {
    if (!questions.length) return;

    const idx = questions.findIndex((x) => x.id === currentQuestion);
    const nextIndex = idx + 1;

    if (nextIndex < questions.length) {
      startQuestion(questions[nextIndex].id);
    } else {
      alert("Žádné další otázky.");
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Moderátor – Místnost {roomCode}</h1>

      <div style={styles.section}>
        <h2 style={styles.header}>Hráči ({players.length})</h2>

        <ul>
          {players.map((p) => (
            <li key={p.id} style={styles.player}>
              {p.name} – {p.score ?? 0} b.
            </li>
          ))}
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.header}>Otázky</h2>

        {questions.map((q, index) => (
          <div key={q.id} style={styles.questionBox}>
            <strong>{index + 1}. {q.title}</strong>

            {currentQuestion === q.id ? (
              <p style={{ color: "#00e5a8" }}>
                ▶ Probíhá – odpovědělo: {answersCount}/{players.length}
              </p>
            ) : null}

            <div style={styles.btnRow}>
              <button
                style={styles.btnStart}
                onClick={() => startQuestion(q.id)}
              >
                ▶ Spustit
              </button>

              <button
                style={styles.btnEval}
                onClick={() => evaluateQuestion(q.id)}
              >
                ✔ Vyhodnotit
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.section}>
        <h2 style={styles.header}>Ovládání hry</h2>

        <button style={styles.btnNext} onClick={startNext}>
          ⏭ Další otázka
        </button>

        <Link to={`/scoreboard/${roomCode}`} style={styles.btnScore}>
          📊 Zobrazit žebříček
        </Link>
      </div>
    </div>
  );
}

// === STYLY ===
const styles = {
  container: {
    padding: 20,
    maxWidth: 600,
    margin: "0 auto",
    color: "white",
    fontFamily: "Inter, sans-serif",
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    background: "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
    WebkitBackgroundClip: "text",
    color: "transparent",
    textAlign: "center",
    marginBottom: 20,
  },
  section: {
    marginBottom: 30,
    background: "rgba(255,255,255,0.05)",
    padding: 15,
    borderRadius: 12,
  },
  header: {
    fontSize: 20,
    marginBottom: 10,
  },
  questionBox: {
    background: "rgba(255,255,255,0.08)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  btnRow: {
    display: "flex",
    gap: 10,
    marginTop: 10,
  },
  player: {
    marginBottom: 5,
  },
  btnStart: {
    flex: 1,
    padding: 10,
    background: "linear-gradient(45deg,#22c55e,#16a34a)",
    borderRadius: 10,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    color: "#071022",
  },
  btnEval: {
    flex: 1,
    padding: 10,
    background: "linear-gradient(45deg,#ec4899,#8b5cf6)",
    borderRadius: 10,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    color: "#071022",
  },
  btnNext: {
    width: "100%",
    padding: 12,
    background: "linear-gradient(45deg,#a855f7,#00e5a8)",
    borderRadius: 12,
    border: "none",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
    color: "#071022",
    marginBottom: 12,
  },
  btnScore: {
    display: "block",
    textAlign: "center",
    padding: 12,
    background: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    fontWeight: 600,
    color: "white",
    textDecoration: "none",
  }
};
