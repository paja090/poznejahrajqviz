import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

// ❌ odstraněno: import reboosLogo from "../assets/reboos-logo.svg";

const TYPE_LABELS = {
  abc: "Multiple choice",
  open: "Otevřená",
  image: "Obrázková",
  speed: "Speed",
  multi: "Multi-select",
  number: "Číselná",
  arrange: "Seřazení",
};

export default function QuestionProjector() {
  const { roomCode } = useParams();
  const [room, setRoom] = useState(null);
  const [question, setQuestion] = useState(null);

  useEffect(() => {
    if (!roomCode) return;
    const roomRef = doc(db, "quizRooms", roomCode);
    const unsub = onSnapshot(roomRef, (snap) => {
      if (!snap.exists()) {
        setRoom(null);
        return;
      }
      setRoom({ id: roomCode, ...snap.data() });
    });
    return () => unsub();
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode || !room?.currentQuestionId) {
      setQuestion(null);
      return;
    }
    const qRef = doc(
      db,
      "quizRooms",
      roomCode,
      "questions",
      room.currentQuestionId
    );
    const unsub = onSnapshot(qRef, (snap) => {
      if (!snap.exists()) {
        setQuestion(null);
        return;
      }
      setQuestion({ id: snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [roomCode, room?.currentQuestionId]);

  const projectorState = useMemo(() => {
    if (!room) return "loading";
    if (!room.currentQuestionId) return "waiting";
    return room.status || "waiting";
  }, [room]);

  const renderChoiceOptions = (variant = "choice") => {
    if (!question?.options || question.options.length === 0) return null;
    return (
      <div className={`projector-options ${variant}`}>
        {question.options.map((option, index) => (
          <div key={index} className={`projector-option ${variant}`}>
            <span>
              {variant === "multi"
                ? "☑"
                : `${String.fromCharCode(65 + index)}.`}
            </span>
            <p>{option}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderArrangeList = () => {
    if (!question?.options || question.options.length === 0) return null;
    return (
      <ol className="projector-arrange-list">
        {question.options.map((option, index) => (
          <li key={index} className="projector-arrange-item">
            <span className="projector-arrange-index">{index + 1}</span>
            <p>{option}</p>
          </li>
        ))}
      </ol>
    );
  };

  const renderQuestionContent = () => {
    if (!question) return null;
    if (question.type === "abc") return renderChoiceOptions();
    if (question.type === "multi") return renderChoiceOptions("multi");
    if (question.type === "arrange") return renderArrangeList();
    if (question.type === "speed") {
      return (
        <p className="projector-hint speed">
          ⚡ Speed round – body získají jen nejrychlejší odpovědi.
        </p>
      );
    }
    if (question.type === "number") {
      const toleranceValue = Number.isFinite(Number(question.tolerance))
        ? Number(question.tolerance)
        : null;
      return (
        <div className="projector-number">
          <p>Hráči zadávají přesné číslo.</p>
          {toleranceValue !== null && (
            <p className="projector-hint muted">
              Tolerance: ±{toleranceValue}
              {question.toleranceType === "percent" ? "%" : ""}
            </p>
          )}
        </div>
      );
    }
    if (question.type === "open") {
      return (
        <p className="projector-hint">
          ✏️ Otevřená odpověď – hráči píší vlastní text.
        </p>
      );
    }
    if (question.type === "image") {
      if (question.imageMode === "abc") return renderChoiceOptions();
      return (
        <p className="projector-hint">
          📸 Obrázková otázka – odpověď se zadává ručně.
        </p>
      );
    }
    return renderChoiceOptions();
  };

  return (
    <div className="projector-page">
      <div className="projector-overlay">
        <header className="projector-header">
          <div className="projector-brand">
            {/* ✔️ nové logo z public složky */}
            <img
              src="/rebuss.png"
              alt="REBUSS logo"
              className="projector-logo"
            />
            <div>
              <p className="eyebrow">Room {roomCode}</p>
              <h1>REBUSS • Projekce otázek</h1>
            </div>
          </div>

          <div className="projector-status">
            <span className={`status-dot ${projectorState}`}></span>
            <span className="state-text">{projectorState}</span>
            <Link className="projector-link" to={`/host/${roomCode}/dashboard`}>
              ⬅ Zpět na dashboard
            </Link>
          </div>
        </header>

        <main className="projector-body">
          {question ? (
            <div className="projector-card">
              <div className="projector-meta">
                <span className="badge">
                  {TYPE_LABELS[question.type] || question.type || "Otázka"}
                </span>
                {question.category && (
                  <span className="pill">{question.category}</span>
                )}
                {typeof question.order === "number" && (
                  <span className="pill muted">#{question.order + 1}</span>
                )}
              </div>

              <h2 className="projector-title">{question.title}</h2>

              {question.imageUrl && (
                <div className="projector-image">
                  <img src={question.imageUrl} alt="Obrázek otázky" />
                </div>
              )}

              {renderQuestionContent()}

              <p className="projector-footer">
                {room?.teamMode ? "Týmová otázka" : "Solo otázka"}
              </p>
            </div>
          ) : (
            <div className="projector-waiting">
              <p className="eyebrow">Čekáme na moderátora…</p>
              <h2>
                {projectorState === "loading"
                  ? "Načítám data"
                  : "Zatím není aktivní žádná otázka"}
              </h2>
              <p>
                Jakmile moderátor spustí otázku, objeví se zde automaticky.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
