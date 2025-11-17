import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
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

  // Realtime získání otázek
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

  const addQuestion = async () => {
    if (!title || !optionA || !optionB || !optionC) return;

    const options = [optionA, optionB, optionC];

    await addDoc(collection(db, "quizRooms", roomCode, "questions"), {
      type: "abc",
      title,
      options,
      correctAnswer: Number(correct),
      createdAt: serverTimestamp()
    });

    setTitle("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setCorrect("0");
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Otázky pro místnost {roomCode}</h1>

      <h2 style={{ marginTop: 20 }}>Přidat ABC otázku</h2>

      <label>Název otázky:</label>
      <input
        style={{ display: "block", marginBottom: 10, width: "100%" }}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label>Možnost A:</label>
      <input
        style={{ display: "block", marginBottom: 10, width: "100%" }}
        value={optionA}
        onChange={(e) => setOptionA(e.target.value)}
      />

      <label>Možnost B:</label>
      <input
        style={{ display: "block", marginBottom: 10, width: "100%" }}
        value={optionB}
        onChange={(e) => setOptionB(e.target.value)}
      />

      <label>Možnost C:</label>
      <input
        style={{ display: "block", marginBottom: 10, width: "100%" }}
        value={optionC}
        onChange={(e) => setOptionC(e.target.value)}
      />

      <label>Správná odpověď:</label>
      <select
        value={correct}
        onChange={(e) => setCorrect(e.target.value)}
        style={{ display: "block", marginBottom: 20 }}
      >
        <option value="0">A</option>
        <option value="1">B</option>
        <option value="2">C</option>
      </select>

      <button onClick={addQuestion} style={{ padding: 10, width: 200 }}>
        ➕ Přidat otázku
      </button>

      <h2 style={{ marginTop: 40 }}>Seznam otázek</h2>

      <ul>
        {questions.map((q, index) => (
          <li key={q.id} style={{ marginBottom: 15 }}>
            <strong>{index + 1}. {q.title}</strong>
            <div>A: {q.options[0]}</div>
            <div>B: {q.options[1]}</div>
            <div>C: {q.options[2]}</div>
            <div style={{ color: "lime" }}>
              Správně: {["A", "B", "C"][q.correctAnswer]}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
