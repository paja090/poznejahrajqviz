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

  // 🌟 pro FÁZI 7:
  const [lastQuestionId, setLastQuestionId] = useState(null); 
  const [result, setResult] = useState(null); // true/false + správná odpověď

  // 1️⃣ posloucháme na změnu currentQuestionId
  useEffect(() => {
    const roomRef = doc(db, "quizRooms", roomCode);

    const unsub = onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      if (!data) return;

      setCurrentQuestionId(data.currentQuestionId);

      // Uložíme poslední otázku, když nějaká existuje
      if (data.currentQuestionId) {
        setLastQuestionId(data.currentQuestionId);
      }

      // reset uzamknutí tlačítek při nové otázce
      setAnswered(false);
      setResult(null); // reset výsledku při nové otázce
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

  // 🌟 3️⃣ Když otázka skončí (currentQuestionId = null) → zobrazíme výsledek
  useEffect(() => {
    if (currentQuestionId === null && lastQuestionId) {
      showResult();
    }
  }, [currentQuestionId]);

  // 🌟 Funkce pro zobrazení výsledku kol
  const showResult = async () => {
    // Pokud ještě nemáme uloženou ID poslední otázky, nic nedělat
    if (!lastQuestionId) return;

    // 1) načíst poslední otázku
    const qRef = doc(db, "quizRooms", roomCode, "questions", lastQuestionId);
    const qSnap = await getDoc(qRef);
    const qData = qSnap.data();

    // 2) načíst odpověď hráče
    const ansRef = doc(
      db,
      "quizRooms",
      roomCode,
      "answers",
      `${playerId}_${lastQuestionId}`
    );
    const ansSnap = await getDoc(ansRef);
    const ansData = ansSnap.data();

    if (!ansData) {
      // hráč vůbec neodpověděl
      setResult({
        isCorrect: false,
        correctAnswer: qData.correctAnswer,
      });
    } else {
      const isCorrect = ansData.answer === qData.correctAnswer;

      setResult({
        isCorrect,
        correctAnswer: qData.correctAnswer,
      });
    }

    // 3) výsledek zobrazíme 4 sekundy → pak zpět čekání
    setTimeout(() => {
      setResult(null); // skryj výsledek
      setQuestion(null); // smaž starou otázku
    }, 4000);
  };

  // 4️⃣ odeslání odpovědi
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

  // 🌟 UI pro výsledek po kole
  if (result) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        {result.isCorrect ? (
          <h1 style={{ color: "lime", fontSize: 40 }}>✔ Správně!</h1>
        ) : (
          <h1 style={{ color: "red", fontSize: 40 }}>✘ Špatně!</h1>
        )}

        <p style={{ marginTop: 20 }}>
          Správná odpověď byla:{" "}
          <strong style={{ fontSize: 24 }}>
            {["A", "B", "C"][result.correctAnswer]}
          </strong>
        </p>

        <p style={{ marginTop: 40, opacity: 0.7 }}>Čekej na další otázku…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Hra – místnost {roomCode}</h1>

      {!currentQuestionId && !question && (
        <p>Čekáme na další otázku…</p>
      )}

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

