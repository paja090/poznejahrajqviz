// pages/Game.jsx
import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { evaluateAnswer } from "../utils/evaluateAnswer";

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
  const [teams, setTeams] = useState([]);

  // Load player's color
  useEffect(() => {
    const loadPlayer = async () => {
      const ref = doc(db, "quizRooms", roomCode, "players", playerId);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().color) {
        setPlayerColor(snap.data().color);
      }
    };
    if (roomCode && playerId) loadPlayer();
  }, [roomCode, playerId]);

  // Load teams (Team Mode)
  useEffect(() => {
    const tRef = collection(db, "quizRooms", roomCode, "teams");
    const unsub = onSnapshot(tRef, (snap) => {
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [roomCode]);

  const currentPlayer = useMemo(
    () => players.find((p) => p.id === playerId),
    [players, playerId]
  );

  const currentTeam = useMemo(() => {
    if (!currentPlayer) return null;
    if (currentPlayer.teamId) {
      return teams.find((t) => t.id === currentPlayer.teamId) || null;
    }
    // fallback – některé implementace můžou mít team.players[]
    return (
      teams.find((t) => (t.players || []).includes(playerId)) || null
    );
  }, [teams, currentPlayer, playerId]);

  const accentColor = currentTeam?.color || playerColor;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        timeSubmitted: Date.now(), // stabilní pro speed scoring
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

      if (sorted.length > 0) {
        r.isWinner = sorted[0].playerId === playerId;
      }

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

      return afterResultDelay();
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
    afterResultDelay();
  };

  // After result -> scoreboard
  const afterResultDelay = () => {
    setTimeout(() => {
      setResult(null);
      if (settings?.showLeaderboardEachRound !== false) {
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

  // UI STATES ----------------------------------------------------------

  if (result)
    return (
      <ResultUI
        result={result}
        teamColor={accentColor}
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
        teamColor={accentColor}
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
            currentTeam={currentTeam}
            teams={teams}
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
                accentColor={accentColor}
              />

              {answered && <p style={styles.sent}>✔ Odpověď odeslána</p>}
            </>
          )}
        </div>
      </NeonLayout>
      <ConfettiLayer confetti={confetti} colorOverride={accentColor} />
    </>
  );
}

// ---------------------------------------------------
// UI COMPONENTS
// ---------------------------------------------------

function HeaderUI({ roomCode, status, currentPlayer, currentTeam, teams }) {
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

      {currentTeam && (
        <div style={{ marginTop: 6 }}>
          <div
            style={{
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "999px",
                background: currentTeam.color || "#22c55e",
              }}
            />
            <span>
              Tým: <b>{currentTeam.name}</b> • {currentTeam.score ?? 0} b.
            </span>
          </div>
          <TeamProgressBar team={currentTeam} teams={teams} />
        </div>
      )}
    </div>
  );
}

function TeamProgressBar({ team, teams }) {
  if (!team) return null;

  const scores = teams.map((t) => t.score ?? 0);
  const maxScore = scores.length ? Math.max(...scores) : 0;
  const percent =
    maxScore > 0 ? Math.round(((team.score ?? 0) / maxScore) * 100) : 0;

  return (
    <div
      style={{
        width: "100%",
        height: 10,
        borderRadius: 999,
        background: "rgba(15,23,42,0.9)",
        border: "1px solid rgba(148,163,184,0.5)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${percent}%`,
          height: "100%",
          background: team.color || "#22c55e",
          boxShadow: "0 0 12px rgba(34,197,94,0.6)",
          transition: "width 0.6s ease",
        }}
      />
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
  accentColor,
}) {
  const disabled = answered || localCountdown > 0;

  const borderColor = accentColor || "rgba(148,163,184,0.6)";

  const [arrangeState, setArrangeState] = useState({
    questionId: null,
    order: [],
  });

  useEffect(() => {
    if (question.type !== "arrange" || !Array.isArray(question.options)) return;
    const indexes = question.options.map((_, idx) => idx);
    const shuffled = shuffle(indexes);
    setArrangeState({ questionId: question.id, order: shuffled });
  }, [question.id, question.type, question.options]);

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
        style={{ ...styles.answerBtn, borderColor }}
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
          style={{ ...styles.answerBtn, borderColor }}
          disabled={disabled || !openAnswer.trim()}
          onClick={() => sendAnswer(openAnswer.trim())}
        >
          ✔ Odeslat
        </button>
      </>
    );
  }

  // MULTI
  if (question.type === "multi") {
    const valueArray = Array.isArray(openAnswer) ? openAnswer : [];
    const toggleIndex = (index, checked) => {
      setOpenAnswer((prev) => {
        const prevArr = Array.isArray(prev) ? prev : [];
        if (checked) {
          if (prevArr.includes(index)) return prevArr;
          return [...prevArr, index];
        } else {
          return prevArr.filter((x) => x !== index);
        }
      });
    };

    return (
      <>
        {question.options?.map((opt, i) => (
          <label key={i} style={styles.multiLabel}>
            <input
              type="checkbox"
              disabled={disabled}
              checked={valueArray.includes(i)}
              onChange={(e) => toggleIndex(i, e.target.checked)}
            />
            {opt}
          </label>
        ))}
        <button
          style={{ ...styles.answerBtn, borderColor }}
          disabled={disabled || valueArray.length === 0}
          onClick={() => sendAnswer(valueArray)}
        >
          ✔ Odeslat
        </button>
      </>
    );
  }

  // NUMBER
  if (question.type === "number") {
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
          style={{ ...styles.answerBtn, borderColor }}
          disabled={disabled || !openAnswer.toString().trim()}
          onClick={() => sendAnswer(Number(openAnswer))}
        >
          ✔ Odeslat
        </button>
      </>
    );
  }

  // SPEED
  if (question.type === "speed") {
    return (
      <>
        <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 4 }}>
          ⚡ Rychlostní otázka – buď co nejrychlejší.
        </p>
        <input
          style={styles.input}
          value={openAnswer}
          disabled={disabled}
          onChange={(e) => setOpenAnswer(e.target.value)}
          placeholder="Rychle napiš odpověď…"
        />
        <button
          style={{ ...styles.answerBtn, borderColor }}
          disabled={disabled}
          onClick={() => sendAnswer(openAnswer || "answered")}
        >
          ⚡ Odpovědět
        </button>
      </>
    );
  }

  // ARRANGE
  if (question.type === "arrange") {
    const moveItem = (index, direction) => {
      setArrangeState((prev) => {
        if (prev.order.length === 0) return prev;
        const next = [...prev.order];
        const target = index + direction;
        if (target < 0 || target >= next.length) return prev;
        const [item] = next.splice(index, 1);
        next.splice(target, 0, item);
        return { ...prev, order: next };
      });
    };

    return (
      <>
        <p style={styles.sub}>Přetáhni pořadí položek do správné posloupnosti.</p>
        <div style={styles.arrangeList}>
          {arrangeState.order.map((originalIndex, idx) => (
            <div key={originalIndex} style={styles.arrangeItem}>
              <span style={styles.arrangeIndex}>{idx + 1}.</span>
              <span style={styles.arrangeText}>
                {question.options?.[originalIndex]}
              </span>
              <div style={styles.arrangeControls}>
                <button
                  type="button"
                  onClick={() => moveItem(idx, -1)}
                  disabled={idx === 0 || disabled}
                  style={styles.arrangeButton}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(idx, 1)}
                  disabled={idx === arrangeState.order.length - 1 || disabled}
                  style={styles.arrangeButton}
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          style={{ ...styles.answerBtn, borderColor }}
          disabled={disabled || arrangeState.order.length === 0}
          onClick={() => sendAnswer(arrangeState.order)}
        >
          ✔ Odeslat pořadí
        </button>
      </>
    );
  }

  return null;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function ResultUI({ result, teamColor, confetti, question }) {
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

      <ConfettiLayer confetti={confetti} colorOverride={teamColor} />
    </>
  );
}

function ScoreboardUI({ players, playerId, confetti, teamColor }) {
  return (
    <>
      <NeonLayout maxWidth={480}>
        <div className="neon-card">
          <h1 style={styles.title}>📊 Žebříček</h1>
          <Scoreboard players={players} playerId={playerId} />
          <p style={styles.sub}>Další otázka začne za chvíli…</p>
        </div>
      </NeonLayout>

      <ConfettiLayer confetti={confetti} colorOverride={teamColor} />
    </>
  );
}

function Scoreboard({ players, playerId }) {
  const sorted = [...players].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0)
  );
  return (
    <>
      <div style={styles.scoreboardBox}>
        {sorted.map((p, idx) => {
          const isMe = p.id === playerId;
          const rank = idx + 1;
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
  },
  multiLabel: {
    fontSize: 14,
    margin: "4px 0",
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "white",
  },
  arrangeList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 12,
  },
  arrangeItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.4)",
    background: "rgba(15,23,42,0.85)",
  },
  arrangeIndex: {
    fontWeight: 600,
    width: 22,
  },
  arrangeText: {
    flex: 1,
    fontSize: 14,
  },
  arrangeControls: {
    display: "flex",
    gap: 6,
  },
  arrangeButton: {
    borderRadius: 8,
    border: "1px solid rgba(148,163,184,0.5)",
    padding: "4px 8px",
    background: "rgba(15,23,42,0.95)",
    color: "white",
    cursor: "pointer",
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
  correctAnswer: {
    marginTop: 18,
    fontSize: 16,
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
};






