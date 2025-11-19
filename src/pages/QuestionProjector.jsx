import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

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

  const renderOptions = () => {
    if (!question?.options || question.options.length === 0) return null;
    return (
      <div className="projector-options">
        {question.options.map((option, index) => (
          <div key={index} className="projector-option">
            <span>{String.fromCharCode(65 + index)}.</span>
            <p>{option}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="projector-page">
      <div className="projector-overlay">
        <header className="projector-header">
          <div>
            <p className="eyebrow">Room {roomCode}</p>
            <h1>Poznej &amp; Hraj • Projekce otázek</h1>
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
              {renderOptions()}
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
                Jakmile moderátor spustí otázku, objeví se zde automaticky pro
                pohodlné promítání na projektor.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
