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

  // 🌟 FÁZE 7: výsledek kola
  const [lastQuestionId, setLastQuestionId] = useState(null);
  const [result, setResult] = useState(null);

  // 🌟 FÁZE 8: scoreboard
  const [players, setPlayers] = useState([]);
  const [showScoreboard, setShowScoreboard] = useState(false);

  // === 🔥 1) posloucháme na změnu currentQuestionId ===
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

  // === 🔥 2) načteme aktuální otázku ===
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

  // === 🔥 3) když currentQuestionId zmizí → zobrazit výsledek ===
  useEffect(() => {
    if (currentQuestionId === null && lastQuestionId) {
      showResult();
    }
  }, [currentQuestionId]);

  // === 🌟 Funkce pro zobrazení výsledku kola ===
  const showResult = async () => {
    if (!lastQuestionId) return;

    // 1) otázka
    const qRef = doc(db, "quizRooms", roomCode, "questions", lastQuestionId);
    const qSnap = await getDoc(qRef);
    const qData = qSnap.data();

    // 2) hráčova odpověď
    const ansRef = doc(
      db,
      "quizRooms",
      roomCode,
      "answers",
      `${playerId}_${lastQuestionId}`
    );
    const ansSnap = await getDoc(ansRef);
    const ansData = ansSnap.data();

    let isCorrect = false;

    if (!ansData) {
      isCorrect = false;
    } else {
      isCorrect = ansData.answer === qData.correctAnswer;
    }

    // Nastavit výsledek
    setResult({
      isCorrect,
      correctAnswer: qData.correctAnswer,
    });

    // 4s → scoreboard
    setTimeout(() => {
      setResult(null);
      loadScoreboard();
      setShowScoreboard(true);

      // 5s → zpět do čekání
      setTimeout(() => {
        setShowScoreboard(false);
        setQuestion(null);
      }, 5000);

    }, 4000);
  };

  // === 🌟 Realtime scoreboard ===
  const loadScoreboard = () => {
    const playersRef = collection(db, "quizRooms", roomCode, "players");

    return onSnapshot(playersRef, (snap) => {
      const playersList = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      // seřadit podle score (desc)
      playersList.sort((a, b) => (b.score || 0) - (a.score || 0));

      setPlayers(playersList);
    });
  };

  // === 🔥 4) odeslání odpovědi ===
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

  // === 🌟 UI: Výsledek kola ===
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

        <p style={{ marginTop: 40, opacity: 0.7 }}>
          Čekej na žebříček…
        </p>
      </div>
    );
  }

  // === 🌟 UI: Scoreboard ===
  if (showScoreboard) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1 style={{ fontSize: 32, marginBottom: 20 }}>📊 Žebříček</h1>

        <ul style={{ listStyle: "none", padding: 0 }}>
          {players.map((p, index) => (
            <li
              key={p.id}
              style={{
                background: "rgba(255,255,255,0.1)",
                padding: "10px 20px",
                borderRadius: 12,
                marginBottom: 10,
                textAlign: "left",
                fontSize: 20,
              }}
            >
              <strong>{index + 1}. {p.name}</strong>
              <span style={{ float: "right", fontWeight: 700 }}>
                {p.score ?? 0} b.
              </span>
            </li>
          ))}
        </ul>

        <p style={{ marginTop: 20, opacity: 0.7 }}>
          Další otázka začne za chvíli…
        </p>
      </div>
    );
  }

  // === 🌟 UI: Hlavní herní obrazovka ===
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


