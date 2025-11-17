import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function Questions() {
  const { roomCode } = useParams();

  const [title, setTitle] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [correct, setCorrect] = useState("0");

  const [questions, setQuestions] = useState([]);

  // === 🔥 REALTIME načítání otázek ===
  useEffect(() => {
    const q = query(
      collection(db, "quizRooms", roomCode, "questions"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [roomCode]);

  // === ➕ Přidání otázky ===
  const addQuestion = async () => {
    if (!title || !optionA || !optionB || !optionC) return;

    const options = [optionA, optionB, optionC];

    await addDoc(collection(db, "quizRooms", roomCode, "questions"), {
      type: "abc",
      title,
      options,
      correctAnswer: Number(correct),
      createdAt: serverTimestamp(),
    });

    setTitle("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setCorrect("0");
  };

  // === ▶ Spustit otázku ===
  const startQuestion = async (questionId) => {
    await setDoc(
      doc(db, "quizRooms", roomCode),
      { currentQuestionId: questionId },
      { merge: true }
    );

    alert("Otázka spuštěna!");
  };

  // === ✔ Vyhodnotit otázku ===
  const evaluateQuestion = async (questionId) => {
    // 1) načíst otázku
    const qRef = doc(db, "quizRooms", roomCode, "questions", questionId);
    const qSnap = await getDoc(qRef);
    const question = qSnap.data();
    const correctAnswer = question.correctAnswer;

    // 2) načíst všechny odpovědi
    const answersRef = collection(db, "quizRooms", roomCode, "answers");
    const answersSnap = await getDocs(answersRef);

    // 3) projít odpovědi
    for (const a of answersSnap.docs) {
      const data = a.data();

      if (data.questionId !== questionId) continue;

      const playerRef = doc(
        db,
        "quizRooms",
        roomCode,
        "players",
        data.playerId
      );

      // Pokud je správně → přidat bod
      if (data.answer === correctAnswer) {
        await updateDoc(playerRef, {
          score: (data.score || 0) + 1,
        });
      }
    }

    // 5) Po vyhodnocení → ukončit aktuální otázku
    await setDoc(
      doc(db, "quizRooms", roomCode),
      { currentQuestionId: null },
      { merge: true }
    );

    alert("Otázka vyhodnocena!");
  };

  return (
    <div style={{ padding: 40, maxWidth: 600 }}>
      <h1>Otázky pro místnost {roomCode}</h1>

      <hr style={{ margin: "20px 0", opacity: 0.2 }} />

      <h2>Přidat ABC otázku</h2>

      <label>Text otázky:</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <label>Možnost A:</label>
      <input
        value={optionA}
        onChange={(e) => setOptionA(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <label>Možnost B:</label>
      <input
        value={optionB}
        onChange={(e) => setOptionB(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <label>Možnost C:</label>
      <input
        value={optionC}
        onChange={(e) => setOptionC(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <label>Správná odpověď:</label>
      <select
        value={correct}
        onChange={(e) => setCorrect(e.target.value)}
        style={{ marginBottom: 20 }}
      >
        <option value="0">A</option>
        <option value="1">B</option>
        <option value="2">C</option>
      </select>

      <button onClick={addQuestion} style={{ padding: 10, width: 200 }}>
        ➕ Přidat otázku
      </button>

      <hr style={{ margin: "30px 0", opacity: 0.2 }} />

      <h2>Seznam otázek</h2>

      <ul>
        {questions.map((q, index) => (
          <li key={q.id} style={{ marginBottom: 20 }}>
            <strong>
              {index + 1}. {q.title}
            </strong>

            <div>A: {q.options[0]}</div>
            <div>B: {q.options[1]}</div>
            <div>C: {q.options[2]}</div>

            <div style={{ color: "lime", marginTop: 5 }}>
              ✔ Správná odpověď: {["A", "B", "C"][q.correctAnswer]}
            </div>

            <button
              onClick={() => startQuestion(q.id)}
              style={{
                marginTop: 10,
                padding: "8px 14px",
                background: "linear-gradient(45deg,#8b5cf6,#ec4899,#00e5a8)",
                borderRadius: 10,
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                color: "#071022",
              }}
            >
              ▶ Spustit tuto otázku
            </button>

            <button
              onClick={() => evaluateQuestion(q.id)}
              style={{
                marginTop: 8,
                padding: "8px 14px",
                background: "linear-gradient(45deg,#00e5a8,#8b5cf6)",
                borderRadius: 10,
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                color: "#071022",
              }}
            >
              ✔ Vyhodnotit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}




