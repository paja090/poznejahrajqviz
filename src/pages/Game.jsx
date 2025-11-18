// pages/Game.jsx
import { useEffect, useState, useMemo } from "react";
import { db } from "../firebaseConfig";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
} from "firebase/firestore";
import NeonLayout from "../components/NeonLayout";
import { useRoom } from "../hooks/useRoom";
import { useCurrentQuestion } from "../hooks/useCurrentQuestion";
import { usePlayers } from "../hooks/usePlayers";
import { playSound, vibrate } from "../utils/soundManager";

export default function Game() {
  const { roomCode, playerId } = useParams();
  const { status, currentQuestionId, settings } = useRoom(roomCode);
  const question = useCurrentQuestion(roomCode, currentQuestionId);
  const players = usePlayers(roomCode);

  const [answered, setAnswered] = useState(false);
  const [openAnswer, setOpenAnswer] = useState("");

  const [lastQuestionId, setLastQuestionId] = useState(null);
  const [result, setResult] = useState(null);
  const [showScoreboard, setShowScoreboard] = useState(false);

  const [localCountdown, setLocalCountdown] = useState(0);
  const [confetti, setConfetti] = useState([]);

  const [playerColor, setPlayerColor] = useState("#22c55e");

  // načteme vlastní barvu hráče
  useEffect(() => {
    const loadPlayer = async () => {
      const pRef = doc(
        db,
        "quizRooms",
        roomCode,
        "players",
        playerId
      );
      const snap = await getDoc(pRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.color) setPlayerColor(data.color);
      }
    };
    if (roomCode && playerId) loadPlayer();
  }, [roomCode, playerId]);

  // když se objeví nová otázka -> reset + countdown
  useEffect(() => {
    if (currentQuestionId) {
      setLastQuestionId(currentQuestionId);
      setAnswered(false);
      setResult(null);
      setShowScoreboard(false);
      setOpenAnswer("");

      // 3–2–1 local countdown
      let v = 3;
      setLocalCountdown(v);
      playSound("countdown");
      const interval = setInterval(() => {
        v -= 1;
        if (v <= 0) {
          setLocalCountdown(0);
          clearInterval(interval);
        } else {
          setLocalCountdown(v);
          playSound("countdown");
        }
      }, 1000);
      return () => clearInterval(interval);
    } else if (!currentQuestionId && lastQuestionId) {
      // konec otázky -> zobraz výsledek
      showResult();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionId]);

  const showResult = async () => {
    if (!lastQuestionId) return;

    const qRef = doc(
      db,
      "quizRooms",
      roomCode,
      "questions",
      lastQuestionId
    );
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
      setResult(res);
      vibrate("result");
    } else if (qData.type === "abc") {
      res.isCorrect = ansData.answer === qData.correctAnswer;
      setResult(res);
      playSound(res.isCorrect ? "correct" : "wrong");
      vibrate(res.isCorrect ? "correct" : "wrong");
      if (res.isCorrect) triggerConfetti();
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
      playSound(res.isCorrect ? "correct" : "wrong");
      vibrate(res.isCorrect ? "correct" : "wrong");
      if (res.isCorrect) triggerConfetti();
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
      if (res.answered && res.isWinner) {
        playSound("speedWin");
        vibrate("correct");
        triggerConfetti();
      } else if (res.answered) {
        vibrate("result");
      }
    } else if (qData.type === "image") {
      if (!ansData) {
        setResult(res);
        vibrate("result");
      } else if (typeof qData.correctAnswer === "number") {
        res.isCorrect = ansData.answer === qData.correctAnswer;
        setResult(res);
        playSound(res.isCorrect ? "correct" : "wrong");
        vibrate(res.isCorrect ? "correct" : "wrong");
        if (res.isCorrect) triggerConfetti();
      } else if (
        typeof qData.correctAnswer === "string" &&
        typeof ansData.answer === "string"
      ) {
        res.isCorrect =
          ansData.answer.trim().toLowerCase() ===
          qData.correctAnswer.trim().toLowerCase();
        setResult(res);
        playSound(res.isCorrect ? "correct" : "wrong");
        vibrate(res.isCorrect ? "correct" : "wrong");
        if (res.isCorrect) triggerConfetti();
      }
    }

    // po výsledku -> scoreboard -> další otázka
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

  // odpověď hráče
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
        type: question?.type || "abc",
        timeSubmitted: serverTimestamp(),
      }
    );
  };

  const triggerConfetti = () => {
    const pieces = [];
    for (let i = 0; i < 40; i++) {
      pieces.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.7,
        color: [
          "#f97316",
          "#22c55e",
          "#3b82f6",
          "#ec4899",
          "#eab308",
        ][Math.floor(Math.random() * 5)],
      });
    }
    setConfetti(pieces);
    setTimeout(() => setConfetti([]), 1200);
  };

  const currentPlayer = useMemo(
    () => players.find((p) => p.id === playerId),
    [players, playerId]
  );

  // STAVY UI

  if (result) {
    if (result.type === "speed") {
      return (
        <ResultScreen
          title={
            result.answered
              ? result.isWinner
                ? "⚡ Byl jsi nejrychlejší!"
                : "Někdo byl o chlup rychlejší…"
              : "Nestihl jsi odpovědět."
          }
          subtitle="Čekej na žebříček…"
          positive={!!(result.answered && result.isWinner)}
          playerColor={playerColor}
          confetti={confetti}
        />
      );
    }

    let titleText = "⏱ Neodpověděl jsi včas";
    let positive = false;

    if (result.answered) {
      if (result.isCorrect) {
        titleText = "✔ Správně!";
        positive = true;
      } else {
        titleText = "✘ Špatně!";
      }
    }

    return (
      <ResultScreen
        title={titleText}
        subtitle="Čekej na žebříček…"
        correctAnswer={result.correctAnswer}
        type={result.type}
        positive={positive}
        playerColor={playerColor}
        confetti={confetti}
      />
    );
  }

  if (showScoreboard) {
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

  // hlavní game UI
  return (
    <>
      <NeonLayout maxWidth={480}>
        <div className="neon-card">
          {/* sticky header */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 2,
              paddingBottom: 10,
              marginBottom: 8,
              background:
                "radial-gradient(circle at top,#020617 0,rgba(2,6,23,0.95) 60%,rgba(2,6,23,0.95) 100%)",
            }}
          >
            <h1 style={styles.title}>Místnost {roomCode}</h1>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                opacity: 0.7,
                alignItems: "center",
              }}
            >
              <span>
                Stav:{" "}
                {status === "running"
                  ? "Hra běží"
                  : status === "paused"
                  ? "Pozastaveno"
                  : status === "finished"
                  ? "Ukončeno"
                  : "Čeká se"}
              </span>
              {currentPlayer && (
                <span>
                  Ty:{" "}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {currentPlayer.name} • {currentPlayer.score ?? 0} b.
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "999px",
                        background: currentPlayer.color || playerColor,
                      }}
                    />
                  </span>
                </span>
              )}
            </div>
          </div>

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
              {/* obrázek */}
              {question.type === "image" && question.imageUrl && (
                <div
                  style={{
                    marginBottom: 12,
                  }}
                >
                  <img
                    src={question.imageUrl}
                    alt="Quiz"
                    style={{
                      maxWidth: "100%",
                      borderRadius: 14,
                      border:
                        "1px solid rgba(148,163,184,0.5)",
                    }}
                  />
                </div>
              )}

              <h2 style={styles.question}>{question.title}</h2>

              {localCountdown > 0 && (
                <div className="countdown-overlay">
                  <div className="countdown-number">
                    {localCountdown}
                  </div>
                </div>
              )}

              {/* ABC + Image ABC */}
              {((question.type === "abc" && question.options) ||
                (question.type === "image" &&
                  question.imageMode === "abc" &&
                  question.options)) &&
                question.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendAnswer(idx)}
                    disabled={answered || localCountdown > 0}
                    style={{
                      ...styles.answerBtn,
                      borderColor:
                        playerColor ||
                        "rgba(148,163,184,0.5)",
                      opacity: answered ? 0.55 : 1,
                    }}
                  >
                    {["A", "B", "C"][idx]} – {opt}
                  </button>
                ))}

              {/* open + image open */}
              {(question.type === "open" ||
                (question.type === "image" &&
                  question.imageMode === "open")) && (
                <>
                  <input
                    style={styles.input}
                    value={openAnswer}
                    onChange={(e) =>
                      setOpenAnswer(e.target.value)
                    }
                    placeholder="Napiš svou odpověď…"
                    disabled={answered || localCountdown > 0}
                  />
                  <button
                    onClick={() => sendAnswer(openAnswer)}
                    disabled={
                      answered ||
                      !openAnswer.trim() ||
                      localCountdown > 0
                    }
                    style={{
                      ...styles.answerBtn,
                      borderColor:
                        playerColor ||
                        "rgba(148,163,184,0.5)",
                      opacity:
                        answered || !openAnswer.trim()
                          ? 0.6
                          : 1,
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
                  <p
                    style={{
                      fontSize: 13,
                      opacity: 0.75,
                      marginTop: 6,
                    }}
                  >
                    ⚡ Rychlostní otázka – buď co nejrychlejší.
                  </p>
                  <input
                    style={styles.input}
                    value={openAnswer}
                    onChange={(e) =>
                      setOpenAnswer(e.target.value)
                    }
                    placeholder="Tvá odpověď…"
                    disabled={answered || localCountdown > 0}
                  />
                  <button
                    onClick={() =>
                      sendAnswer(openAnswer || "answered")
                    }
                    disabled={answered || localCountdown > 0}
                    style={{
                      ...styles.answerBtn,
                      borderColor:
                        playerColor ||
                        "rgba(148,163,184,0.5)",
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
      </NeonLayout>
      <ConfettiLayer confetti={confetti} />
    </>
  );
}

function ResultScreen({
  title,
  subtitle,
  positive,
  correctAnswer,
  type,
  playerColor,
  confetti,
}) {
  return (
    <>
      <NeonLayout maxWidth={480}>
        <div className="neon-card" style={{ textAlign: "center" }}>
          <div style={{ marginTop: 40 }}>
            <h1
              style={{
                fontSize: 34,
                color: positive ? "#4ade80" : "#f97373",
                textShadow: positive
                  ? "0 0 26px rgba(74,222,128,0.9)"
                  : "0 0 26px rgba(248,113,113,0.9)",
              }}
            >
              {title}
            </h1>

            {typeof correctAnswer !== "undefined" &&
              (type === "abc" ||
                type === "image" ||
                type === "open") && (
                <p style={styles.correctAnswer}>
                  Správná odpověď:{" "}
                  <span style={{ fontSize: 22 }}>
                    {type === "abc" || type === "image"
                      ? ["A", "B", "C"][correctAnswer]
                      : correctAnswer}
                  </span>
                </p>
              )}

            <p style={styles.sub}>{subtitle}</p>
          </div>
        </div>
      </NeonLayout>
      <ConfettiLayer confetti={confetti} colorOverride={playerColor} />
    </>
  );
}

function Scoreboard({ players, playerId }) {
  const top3Ids = players.slice(0, 3).map((p) => p.id);

  return (
    <>
      <div style={styles.scoreboardBox}>
        {players.map((p, index) => {
          const isMe = p.id === playerId;
          const rank = index + 1;
          let badge = "";
          if (rank === 1) badge = "🥇";
          else if (rank === 2) badge = "🥈";
          else if (rank === 3) badge = "🥉";

          return (
            <div
              key={p.id}
              style={{
                ...styles.scoreRow,
                border:
                  rank <= 3
                    ? "1px solid rgba(250,204,21,0.6)"
                    : "1px solid transparent",
                boxShadow:
                  rank === 1
                    ? "0 0 18px rgba(250,204,21,0.45)"
                    : "none",
                background: isMe
                  ? "rgba(59,130,246,0.3)"
                  : "rgba(255,255,255,0.06)",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ width: 18 }}>{badge || rank}.</span>
                <span>{p.name}</span>
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <span>{p.score ?? 0} b.</span>
                {p.color && (
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "999px",
                      background: p.color,
                    }}
                  />
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* podium pro top3 */}
      {players.length > 0 && (
        <div className="podium">
          {players.slice(0, 3).map((p, i) => (
            <div
              key={p.id}
              className={`podium-item ${
                i === 0 ? "gold" : i === 1 ? "silver" : "bronze"
              }`}
            >
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                {i === 0
                  ? "1. místo"
                  : i === 1
                  ? "2. místo"
                  : "3. místo"}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600 }}>
                {p.name}
              </div>
              <div style={{ fontSize: 11 }}>
                {p.score ?? 0} b.
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ConfettiLayer({ confetti, colorOverride }) {
  if (!confetti || !confetti.length) return null;
  return (
    <div className="confetti-layer">
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            background:
              colorOverride || piece.color || "#f97316",
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

const styles = {
  title: {
    fontSize: 26,
    marginBottom: 10,
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
    background: "rgba(15,23,42,0.95)",
    borderRadius: 16,
    border: "2px solid rgba(148,163,184,0.6)",
    padding: "14px 18px",
    marginBottom: 10,
    width: "100%",
    color: "#f9fafb",
    fontSize: 17,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 0 16px rgba(15,23,42,0.9)",
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
    color: "#4ade80",
    marginTop: 10,
    fontSize: 15,
  },
  correctAnswer: {
    marginTop: 18,
    fontSize: 16,
  },
  sub: {
    marginTop: 16,
    opacity: 0.75,
    fontSize: 13,
  },
  scoreboardBox: {
    marginTop: 16,
    padding: 4,
  },
  scoreRow: {
    padding: "10px 12px",
    borderRadius: 12,
    marginBottom: 8,
    fontSize: 15,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pausedBox: {
    padding: 8,
    borderRadius: 999,
    background: "rgba(148,163,184,0.25)",
    fontSize: 13,
    marginBottom: 10,
  },
};





