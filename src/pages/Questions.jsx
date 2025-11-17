import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
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
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function Questions() {
  const { roomCode } = useParams();

  const [questionType, setQuestionType] = useState("abc");

  const [title, setTitle] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [correct, setCorrect] = useState("0"); // pro ABC
  const [openCorrect, setOpenCorrect] = useState(""); // pro open

  const [questions, setQuestions] = useState([]);

  // === realtime seznam otázek ===
  useEffect(() => {
    const qCol = query(
      collection(db, "quizRooms", roomCode, "questions"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(qCol, (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [roomCode]);

  // Přidání otázky
  const addQuestion = async () => {
    if (!title.trim()) return;

    const base = {
      title: title.trim(),
      type: questionType,
      createdAt: serverTimestamp(),
    };

    let payload;

    if (questionType === "abc") {
      if (!optionA || !optionB || !optionC) {
        alert("Vyplň všechny tři možnosti.");
        return;
      }
      payload = {
        ...base,
        options: [optionA, optionB, optionC],
        correctAnswer: Number(correct),
      };
    } else if (questionType === "open") {
      if (!openCorrect.trim()) {
        alert("Zadej správnou odpověď pro otevřenou otázku.");
        return;
      }
      payload = {
        ...base,
        options: [],
        correctAnswer: openCorrect.trim(),
      };
    } else {
      // speed
      payload = {
        ...base,
        options: [],
        correctAnswer: "",
      };
    }

    await addDoc(collection(db, "quizRooms", roomCode, "questions"), payload);

    setTitle("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setCorrect("0");
    setOpenCorrect("");
  };

  // Spustit otázku
  const startQuestion = async (questionId) => {
    await setDoc(
      doc(db, "quizRooms", roomCode),
      { currentQuestionId: questionId, status: "running" },
      { merge: true }
    );
    alert("Otázka spuštěna!");
  };

  // Vyhodnotit otázku (abc / open / speed)
  const evaluateQuestion = async (questionId) => {
    // otázka
    const qRef = doc(db, "quizRooms", roomCode, "questions", questionId);
    const qSnap = await getDoc(qRef);
    if (!qSnap.exists()) {
      alert("Otázka nenalezena.");
      return;
    }
    const question = qSnap.data();

    const ansRef = collection(db, "quizRooms", roomCode, "answers");
    const ansSnap = await getDocs(ansRef);

    const allAnswers = ansSnap.docs
      .map((d) => d.data())
      .filter((a) => a.questionId === questionId);

    if (allAnswers.length === 0) {
      alert("Na tuto otázku nikdo neodpověděl.");
    } else if (question.type === "speed") {
      // rychlostní – bod pro nejrychlejšího
      const withTime = allAnswers.filter((a) => a.timeSubmitted);
      if (withTime.length) {
        withTime.sort(
          (a, b) =>
            a.timeSubmitted.toMillis() - b.timeSubmitted.toMillis()
        );
        const fastest = withTime[0];
        const playerRef = doc(
          db,
          "quizRooms",
          roomCode,
          "players",
          fastest.playerId
        );
        await updateDoc(playerRef, {
          score: increment(1),
        });
      }
    } else {
      // abc / open
      for (const ans of allAnswers) {
        let isCorrect = false;
        if (question.type === "abc") {
          isCorrect = ans.answer === question.correctAnswer;
        } else if (question.type === "open") {
          if (
            typeof ans.answer === "string" &&
            typeof question.correctAnswer === "string"
          ) {
            isCorrect =
              ans.answer.trim().toLowerCase() ===
              question.correctAnswer.trim().toLowerCase();
          }
        }

        if (isCorrect) {
          const playerRef = doc(
            db,
            "quizRooms",
            roomCode,
            "players",
            ans.playerId
          );
          await updateDoc(playerRef, { score: increment(1) });
        }
      }
    }

    // ukončit otázku
    await setDoc(
      doc(db, "quizRooms", roomCode),
      { currentQuestionId: null },
      { merge: true }
    );

    alert("Otázka vyhodnocena!");
  };

  const typeLabel = (t) =>
    t === "abc" ? "ABC" : t === "open" ? "Otevřená" : "Rychlostní";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 6,
            background:
              "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Otázky – místnost {roomCode}
        </h1>

        <p style={{ opacity: 0.7, fontSize: 13, marginBottom: 14 }}>
          Přidávej otázky a z této stránky můžeš také spouštět a
          vyhodnocovat jednotlivá kola.
        </p>

        <Link
          to={`/host/${roomCode}/dashboard`}
          style={{
            display: "inline-block",
            marginBottom: 18,
            fontSize: 13,
            color: "#a5b4fc",
          }}
        >
          ← Zpět na moderátorský dashboard
        </Link>

        {/* Přidání otázky */}
        <div
          style={{
            background: "rgba(15,23,42,0.95)",
            padding: 16,
            borderRadius: 16,
            marginBottom: 24,
            border: "1px solid rgba(148,163,184,0.4)",
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 10 }}>
            ➕ Přidat otázku
          </h2>

          <label style={labelStyle}>Typ otázky</label>
          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
            style={{
              ...inputStyle,
              background: "rgba(15,23,42,0.9)",
            }}
          >
            <option value="abc">ABC (3 možnosti)</option>
            <option value="open">Otevřená odpověď</option>
            <option value="speed">Rychlostní (kdo odpoví první)</option>
          </select>

          <label style={labelStyle}>Text otázky</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
            placeholder="Zadej text otázky…"
          />

          {questionType === "abc" && (
            <>
              <label style={labelStyle}>Možnost A</label>
              <input
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                style={inputStyle}
              />

              <label style={labelStyle}>Možnost B</label>
              <input
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                style={inputStyle}
              />

              <label style={labelStyle}>Možnost C</label>
              <input
                value={optionC}
                onChange={(e) => setOptionC(e.target.value)}
                style={inputStyle}
              />

              <label style={labelStyle}>Správná odpověď</label>
              <select
                value={correct}
                onChange={(e) => setCorrect(e.target.value)}
                style={{
                  ...inputStyle,
                  background: "rgba(15,23,42,0.9)",
                }}
              >
                <option value="0">A</option>
                <option value="1">B</option>
                <option value="2">C</option>
              </select>
            </>
          )}

          {questionType === "open" && (
            <>
              <label style={labelStyle}>Správná odpověď (text)</label>
              <input
                value={openCorrect}
                onChange={(e) => setOpenCorrect(e.target.value)}
                style={inputStyle}
                placeholder="Správná odpověď pro automatické vyhodnocení"
              />
            </>
          )}

          {questionType === "speed" && (
            <p
              style={{
                marginTop: 10,
                fontSize: 12,
                opacity: 0.7,
              }}
            >
              Rychlostní otázka – bod získá hráč, který odpoví jako
              první. Text odpovědi se nevyhodnocuje.
            </p>
          )}

          <button
            onClick={addQuestion}
            style={{
              marginTop: 16,
              padding: "12px 18px",
              borderRadius: 999,
              border: "none",
              fontWeight: 700,
              cursor: "pointer",
              background:
                "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
              color: "#020617",
              width: "100%",
              boxShadow: "0 0 18px rgba(236,72,153,0.7)",
            }}
          >
            ➕ Uložit otázku
          </button>
        </div>

        {/* Seznam otázek */}
        <div
          style={{
            background: "rgba(15,23,42,0.95)",
            padding: 16,
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.4)",
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 10 }}>
            Seznam otázek ({questions.length})
          </h2>

          {questions.map((q, index) => (
            <div
              key={q.id}
              style={{
                marginBottom: 14,
                padding: 10,
                borderRadius: 14,
                background: "rgba(15,23,42,0.9)",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  opacity: 0.75,
                  marginBottom: 4,
                }}
              >
                #{index + 1} • {typeLabel(q.type)}
              </div>
              <strong style={{ fontSize: 15 }}>{q.title}</strong>

              {q.type === "abc" && q.options && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    opacity: 0.9,
                  }}
                >
                  <div>A: {q.options[0]}</div>
                  <div>B: {q.options[1]}</div>
                  <div>C: {q.options[2]}</div>
                  <div style={{ color: "#00e5a8", marginTop: 4 }}>
                    ✔ Správná: {["A", "B", "C"][q.correctAnswer]}
                  </div>
                </div>
              )}

              {q.type === "open" && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    opacity: 0.9,
                    color: "#22c55e",
                  }}
                >
                  ✔ Správná odpověď: {q.correctAnswer}
                </div>
              )}

              {q.type === "speed" && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    opacity: 0.9,
                    color: "#38bdf8",
                  }}
                >
                  ⚡ Rychlostní otázka – bod pro nejrychlejšího
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <button
                  onClick={() => startQuestion(q.id)}
                  style={smallBtnPrimary}
                >
                  ▶ Spustit otázku
                </button>

                <button
                  onClick={() => evaluateQuestion(q.id)}
                  style={smallBtnSecondary}
                >
                  ✔ Vyhodnotit otázku
                </button>
              </div>
            </div>
          ))}

          {questions.length === 0 && (
            <p style={{ opacity: 0.7, fontSize: 13 }}>
              Zatím žádné otázky – přidej první nahoře.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginTop: 10,
  marginBottom: 4,
  fontSize: 13,
  opacity: 0.85,
};

const inputStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.6)",
  background: "rgba(15,23,42,0.8)",
  color: "white",
  fontSize: 14,
  outline: "none",
};

const smallBtnPrimary = {
  padding: "8px 14px",
  borderRadius: 999,
  border: "none",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  background: "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
  color: "#020617",
};

const smallBtnSecondary = {
  padding: "8px 14px",
  borderRadius: 999,
  border: "none",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  background: "linear-gradient(45deg,#22c55e,#16a34a)",
  color: "#020617",
};





