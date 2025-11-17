import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function Game() {
  const { roomCode, playerId } = useParams();

  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answered, setAnswered] = useState(false);

  // 1️⃣ posloucháme na změnu currentQuestionId
  useEffect(() => {
    const roomRef = doc(db, "quizRooms", roomCode);

    const unsub = onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      if (!data) return;

      setCurrentQuestionId(data.currentQuestionId);

      // reset uzamknutí tlačítek při nové otázce
      setAnswered(false);
    });

    return () => unsub();
  }, [roomCode]);

  // 2️⃣ načteme samotnou otázku, když se změní ID
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

  // 3️⃣ odeslání odpovědi
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

  return (
    <div style={{ padding: 40 }}>
      <h1>Hra – místnost {roomCode}</h1>

      {!currentQuestionId && <p>Čekáme na další otázku…</p>}

      {question && (
        <>
          <h2 style={{ marginTop: 20 }}>{question.title}</h2>

          {question.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => sendAnswer(idx)}
              style={{
                display: "block",
                marginTop: 15,
                padding: "15px 20px",
                width: 300,
                background: answered
                  ? "gray"
                  : "linear-gradient(45deg,#8b5cf6,#ec4899,#00e5a8)",
                color: "#071022",
                borderRadius: 12,
                fontSize: 18,
                fontWeight: 600,
              }}
              disabled={answered}
            >
              {["A", "B", "C"][idx]} – {opt}
            </button>
          ))}

          {answered && (
            <p style={{ marginTop: 20, color: "lime" }}>
              Odpověď odeslána! ✔
            </p>
          )}
        </>
      )}
    </div>
  );
}
