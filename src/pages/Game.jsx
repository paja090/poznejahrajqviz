// pages/Game.jsx
import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

import { evaluateAnswer, evaluateSpeedScoring } from "../utils/evaluateAnswer";

import NeonLayout from "../components/NeonLayout";
import { useRoom } from "../hooks/useRoom";
import { useCurrentQuestion } from "../hooks/useCurrentQuestion";
import { usePlayers } from "../hooks/usePlayers";

import { playSound, vibrate } from "../utils/soundManager";

// ---------------------------------------------------
// Game Component
// ---------------------------------------------------

export default function Game() {
  const { roomCode, playerId } = useParams();

  const { status, currentQuestionId, settings } = useRoom(roomCode);
  const question = useCurrentQuestion(roomCode, currentQuestionId);
  const players = usePlayers(roomCode);

  const [answered, setAnswered] = useState(false);
  const [openAnswer, setOpenAnswer] = useState("");
  const [lastQuestion, setLastQuestion] = useState(null);

  const [result, setResult] = useState(null);
  const [showScoreboard, setShowScoreboard] = useState(false);

  const [localCountdown, setLocalCountdown] = useState(0);
  const [confetti, setConfetti] = useState([]);

  const [playerColor, setPlayerColor] = useState("#22c55e");

  // Load player's color
  useEffect(() => {
    const loadPlayer = async () => {
      const ref = doc(db, "quizRooms", roomCode, "players", playerId);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().color)
        setPlayerColor(snap.data().color);
    };
    if (roomCode && playerId) loadPlayer();
  }, [roomCode, playerId]);

  // Handle new question + countdown
  useEffect(() => {
    if (!currentQuestionId) {
      if (lastQuestion) showResult(lastQuestion);
      return;
    }

    setLastQuestion(currentQuestionId);
    setAnswered(false);
    setResult(null);
    setOpenAnswer("");
    setShowScoreboard(false);

    // 3…2…1 countdown
    let v = 3;
    setLocalCountdown(v);
    playSound("countdown");

    const interval = setInterval(() => {
      v--;
      if (v <= 0) {
        setLocalCountdown(0);
        clearInterval(interval);
      } else {
        setLocalCountdown(v);
        playSound("countdown");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestionId]);

  // Submit answer
  const sendAnswer = async (value) => {
    if (answered || !currentQuestionId || localCountdown > 0) return;

    setAnswered(true);
    vibrate("send");

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
        timeSubmitted: Date.now(), // 🔥 stable for speed scoring
      }
    );
  };

  // Evaluate + result screen
  const showResult = async (questionId) => {
    const qSnap = await getDoc(
      doc(db, "quizRooms", roomCode, "questions", questionId)
    );
    if (!qSnap.exists()) return;

    const qData = { id: questionId, ...qSnap.data() };

    const ansSnap = await getDoc(
      doc(
        db,
        "quizRooms",
        roomCode,
        "answers",
        `${playerId}_${questionId}`
      )
    );
    const ans = ansSnap.exists() ? ansSnap.data() : null;

    const r = {
      type: qData.type,
      correctAnswer: qData.correctAnswer,
      isCorrect: false,
      isWinner: false,
      answered: !!ans,
    };

    // SPEED QUESTION RESULT
    if (qData.type === "speed") {
      const allSnap = await getDocs(
        collection(db, "quizRooms", roomCode, "answers")
      );
      const all = allSnap.docs
        .map((d) => d.data())
        .filter((x) => x.questionId === questionId);

      const sorted = all.sort(
        (a, b) => Number(a.timeSubmitted) - Number(b.timeSubmitted)
      );

      if (sorted.length > 0)
        r.isWinner = sorted[0].playerId === playerId;

      setResult(r);

      if (r.answered && r.isWinner) {
        playSound("speedWin");
        vibrate("correct");
        triggerConfetti();
      } else if (r.answered) {
        vibrate("result");
      } else {
        vibrate("result");
      }

      return afterResultDelay(r);
    }

    // NORMAL QUESTION RESULT
    if (ans) {
      r.isCorrect = evaluateAnswer(qData, ans.answer);

      playSound(r.isCorrect ? "correct" : "wrong");
      vibrate(r.isCorrect ? "correct" : "wrong");

      if (r.isCorrect) triggerConfetti();
    } else {
      vibrate("result");
    }

    setResult(r);
    afterResultDelay(r);
  };

  // After result -> scoreboard
  const afterResultDelay = (r) => {
    setTimeout(() => {
      setResult(null);
      if (settings.showLeaderboardEachRound !== false) {
        setShowScoreboard(true);
      }

      setTimeout(() => {
        setShowScoreboard(false);
      }, 5000);
    }, 3500);
  };

  // Confetti
  const triggerConfetti = () => {
    const arr = [];
    for (let i = 0; i < 40; i++) {
      arr.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random(),
        color: ["#22c55e", "#f97316", "#3b82f6", "#ec4899", "#eab308"][
          Math.floor(Math.random() * 5)
        ],
      });
    }
    setConfetti(arr);
    setTimeout(() => setConfetti([]), 1200);
  };

  const currentPlayer = useMemo(
    () => players.find((p) => p.id === playerId),
    [players, playerId]
  );

  // UI STATES ----------------------------------------------------------

  if (result)
    return (
      <ResultUI
        result={result}
        playerColor={playerColor}
        confetti={confetti}
        question={question}
      />
    );

  if (showScoreboard)
    return (
      <ScoreboardUI
        players={players}
        playerId={playerId}
        confetti={confetti}
      />
    );

  return (
    <>
      <NeonLayout maxWidth={480}>
        <div className="neon-card">
          <HeaderUI
            roomCode={roomCode}
            status={status}
            currentPlayer={currentPlayer}
          />

          {/* Waiting */}
          {!question && (
            <p style={styles.sub}>Čekáme na další otázku…</p>
          )}

          {/* Countdown overlay */}
          {localCountdown > 0 && (
            <div className="countdown-overlay">
              <div className="countdown-number">{localCountdown}</div>
            </div>
          )}

          {/* IMAGE */}
          {question?.type === "image" && question?.imageUrl && (
            <img
              src={question.imageUrl}
              alt="question"
              style={styles.image}
            />
          )}

          {/* QUESTION */}
          {question && (
            <>
              <h2 style={styles.question}>{question.title}</h2>

              <AnswerUI
                question={question}
                answered={answered}
                localCountdown={localCountdown}
                setOpenAnswer={setOpenAnswer}
                openAnswer={openAnswer}
                sendAnswer={sendAnswer}
                playerColor={playerColor}
              />

              {answered && <p style={styles.sent}>✔ Odpověď odeslána</p>}
            </>
          )}
        </div>
      </NeonLayout>
      <ConfettiLayer confetti={confetti} />
    </>
  );
}

// ---------------------------------------------------
// UI COMPONENTS
// ---------------------------------------------------

function HeaderUI({ roomCode, status, currentPlayer }) {
  return (
    <div style={styles.header}>
      <h1 style={styles.title}>Místnost {roomCode}</h1>

      <div style={styles.headerRow}>
        <span>
          Stav:{" "}
          {status === "running"
            ? "Hra běží"
            : status === "paused"
            ? "Pozastaveno"
            : "Čeká se"}
        </span>

        {currentPlayer && (
          <span>
            Ty: {currentPlayer.name} • {currentPlayer.score ?? 0} b.
            <span
              style={{
                width: 10,
                height: 10,
                background: currentPlayer.color,
                borderRadius: "999px",
                marginLeft: 6,
                display: "inline-block",
              }}
            />
          </span>
        )}
      </div>
    </div>
  );
}

function AnswerUI({
  question,
  answered,
  localCountdown,
  openAnswer,
  setOpenAnswer,
  sendAnswer,
  playerColor,
}) {
  const disabled = answered || localCountdown > 0;

  // ABC or IMAGE-ABC
  if (
    (question.type === "abc" && question.options) ||
    (question.type === "image" &&
      question.imageMode === "abc" &&
      question.options)
  ) {
    return question.options.map((opt, idx) => (
      <button
        key={idx}
        style={{ ...styles.answerBtn, borderColor: playerColor }}
        disabled={disabled}
        onClick={() => sendAnswer(idx)}
      >
        {["A", "B", "C", "D"][idx]} – {opt}
      </button>
    ));
  }

  // OPEN or IMAGE-OPEN
  if (
    question.type === "open" ||
    (question.type === "image" && question.imageMode === "open")
  ) {
    return (
      <>
        <input
          style={styles.input}
          value={openAnswer}
          disabled={disabled}
          onChange={(e) => setOpenAnswer(e.target.value)}
          placeholder="Napiš svou odpověď…"
        />
        <button
          style={{ ...styles.answerBtn, borderColor: playerColor }}
          disabled={disabled || !openAnswer.trim()}
          onClick={() => sendAnswer(openAnswer.trim())}
        >
          ✔ Odeslat
        </button>
      </>
    );
  }

  // MULTI
  if (question.type === "multi")
    return (
      <>
        {question.options.map((opt, i) => (
          <label key={i} style={styles.multiLabel}>
            <input
              type="checkbox"
              disabled={disabled}
              onChange={(e) =>
                setOpenAnswer((prev = []) =>
                  e.target.checked
                    ? [...prev, i]
                    : prev.filter((x) => x !== i)
                )
              }
            />
            {opt}
          </label>
        ))}
        <button
          style={{ ...styles.answerBtn, borderColor: playerColor }}
          disabled={disabled}
          onClick={() => sendAnswer(openAnswer || [])}
        >
          ✔ Odeslat
        </button>
      </>
    );

  // NUMBER
  if (question.type === "number")
    return (
      <>
        <input
          type="number"
          style={styles.input}
          value={openAnswer}
          disabled={disabled}
          onChange={(e) => setOpenAnswer(e.target.value)}
          placeholder="Zadej číslo"
        />
        <button
          style={{ ...styles.answerBtn, borderColor: playerColor }}
          disabled={disabled || !openAnswer.trim()}
          onClick={() => sendAnswer(Number(openAnswer))}
        >
          ✔ Odeslat
        </button>
      </>
    );

  // SPEED
  if (question.type === "speed")
    return (
      <>
        <input
          style={styles.input}
          value={openAnswer}
          disabled={disabled}
          onChange={(e) => setOpenAnswer(e.target.value)}
          placeholder="Rychle napiš odpověď…"
        />
        <button
          style={{ ...styles.answerBtn, borderColor: playerColor }}
          disabled={disabled}
          onClick={() => sendAnswer(openAnswer || "answered")}
        >
          ⚡ Odpovědět
        </button>
      </>
    );

  return null;
}

function ResultUI({ result, playerColor, confetti, question }) {
  const positive = result.isCorrect || result.isWinner;

  return (
    <>
      <NeonLayout maxWidth={480}>
        <div className="neon-card" style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: 34,
              marginTop: 40,
              color: positive ? "#4ade80" : "#f87171",
              textShadow: positive
                ? "0 0 26px rgba(74,222,128,0.9)"
                : "0 0 26px rgba(248,113,113,0.9)",
            }}
          >
            {result.type === "speed"
              ? result.answered
                ? result.isWinner
                  ? "⚡ Byl jsi nejrychlejší!"
                  : "Někdo tě předběhl…"
                : "Neodpověděl jsi."
              : result.answered
              ? positive
                ? "✔ Správně!"
                : "✘ Špatně"
              : "⏱ Neodpověděl jsi"}
          </h1>

          {/* correct answer */}
          {result.correctAnswer !== undefined &&
            question &&
            ["abc", "open", "image"].includes(result.type) && (
              <p style={styles.correctAnswer}>
                Správná odpověď:{" "}
                <strong style={{ fontSize: 22 }}>
                  {typeof result.correctAnswer === "number"
                    ? question.options?.[result.correctAnswer] ||
                      ["A", "B", "C", "D"][result.correctAnswer] ||
                      result.correctAnswer
                    : result.correctAnswer}
                </strong>
              </p>
            )}

          <p style={styles.sub}>Čekej na další kolo…</p>
        </div>
      </NeonLayout>

      <ConfettiLayer confetti={confetti} colorOverride={playerColor} />
    </>
  );
}

function ScoreboardUI({ players, playerId, confetti }) {
  return (
    <>
      <NeonLayout maxWidth={480}>
        <div className="neon-card">
          <h1 style={styles.title}>📊 Žebříček</h1>
          <Scoreboard players={players} playerId={playerId} />
          <p style={styles.sub}>Další otázka začne za chvíli…</p>
        </div>
      </NeonLayout>

      <ConfettiLayer confetti={confetti} />
    </>
  );
}

function ConfettiLayer({ confetti, colorOverride }) {
  if (!confetti?.length) return null;
  return (
    <div className="confetti-layer">
      {confetti.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: colorOverride || p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------
// STYLES
// ---------------------------------------------------

const styles = {
  title: {
    fontSize: 26,
    fontWeight: 700,
    background:
      "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
    WebkitBackgroundClip: "text",
    color: "transparent",
  },
  question: {
    fontSize: 22,
    marginBottom: 12,
    lineHeight: 1.3,
  },
  sub: {
    opacity: 0.75,
    marginTop: 10,
    fontSize: 13,
  },
  sent: {
    color: "#4ade80",
    marginTop: 10,
    fontSize: 15,
  },
  image: {
    width: "100%",
    borderRadius: 14,
    marginBottom: 12,
    border: "1px solid rgba(148,163,184,0.6)",
  },
  answerBtn: {
    width: "100%",
    padding: "14px 18px",
    background: "rgba(15,23,42,0.95)",
    borderRadius: 16,
    border: "2px solid rgba(148,163,184,0.5)",
    color: "white",
    marginBottom: 10,
    fontSize: 16,
    fontWeight: 600,
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
  },
  multiLabel: {
    fontSize: 14,
    margin: "4px 0",
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "white",
  },
  header: {
    marginBottom: 14,
    paddingBottom: 10,
    position: "sticky",
    top: 0,
    zIndex: 10,
    background:
      "radial-gradient(circle at top,#020617 0,rgba(2,6,23,0.95) 60%)",
  },
  headerRow: {
    fontSize: 11,
    opacity: 0.75,
    display: "flex",
    justifyContent: "space-between",
  },
};





