// pages/EventDetail.jsx
// Overview of a single event + attached quizzes
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import NeonLayout from "../components/NeonLayout";
import BrandLogo from "../components/BrandLogo";

export default function EventDetail() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    const ref = doc(db, "events", eventId);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setEvent({ id: snap.id, ...snap.data() });
      } else {
        setEvent(null);
      }
    });
  }, [eventId]);

  useEffect(() => {
    const ref = query(
      collection(db, "quizRooms"),
      where("eventId", "==", eventId)
    );
    return onSnapshot(ref, (snap) => {
      setQuizzes(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, [eventId]);

  const preparedQuizzes = useMemo(
    () => quizzes.filter((quiz) => quiz.prepared),
    [quizzes]
  );

  const history = useMemo(
    () => quizzes.filter((quiz) => quiz.status === "finished"),
    [quizzes]
  );

  const activateQuiz = async (roomCode) => {
    if (!window.confirm("Spustit připravený kvíz a pustit hráče do lobby?")) return;
    await updateDoc(doc(db, "quizRooms", roomCode), {
      status: "waiting",
      prepared: false,
      activatedAt: serverTimestamp(),
    });
  };

  if (!event) {
    return (
      <NeonLayout maxWidth={960}>
        <div className="neon-card">
          <p>Načítám detail události…</p>
        </div>
      </NeonLayout>
    );
  }

  return (
    <NeonLayout maxWidth={1100}>
      <div className="event-detail">
        <div className="event-detail__hero">
          <BrandLogo size={160} />
          <div>
            <p className="eyebrow">Událost</p>
            <h1>{event.name}</h1>
            <p className="subtext">{event.description}</p>
            <p className="subtext">Datum: {event.date}</p>
            <div className="event-detail__actions">
              <Link to="/events" className="ghost-btn">
                ← Zpět na přehled
              </Link>
              <Link to={`/events/${event.id}/create-quiz`} className="neon-btn">
                ➕ Připravit další kvíz
              </Link>
            </div>
          </div>
          {event.image && (
            <img
              src={event.image}
              alt={event.name}
              className="event-detail__image"
            />
          )}
        </div>

        <section className="panel">
          <div className="panel-header">
            <h2>Připravené kvízy</h2>
            <p className="subtext">Odemkneš je jedním klikem pro lobby.</p>
          </div>
          {preparedQuizzes.length === 0 && (
            <p className="subtext">Žádný kvíz není označen jako prepared.</p>
          )}
          <div className="quiz-list">
            {preparedQuizzes.map((quiz) => {
              const updatedAt =
                (quiz.updatedAt?.toDate &&
                  quiz.updatedAt.toDate().toLocaleString()) ||
                (quiz.createdAt?.toDate &&
                  quiz.createdAt.toDate().toLocaleString()) ||
                "—";
              return (
                <article key={quiz.id} className="quiz-card">
                  <header>
                    <h3>Místnost {quiz.id}</h3>
                    <span className="status-pill">prepared</span>
                  </header>
                  <p className="subtext">Poslední úprava: {updatedAt}</p>
                <div className="quiz-card__actions">
                  <button className="ghost-btn" onClick={() => activateQuiz(quiz.id)}>
                    ▶ Spustit připravený kvíz
                  </button>
                  <Link
                    to={`/host/${quiz.id}/dashboard`}
                    className="ghost-btn"
                  >
                    Moderovat
                  </Link>
                  <Link
                    to={`/host/${quiz.id}/questions`}
                    className="ghost-btn"
                  >
                    Upravit otázky
                  </Link>
                </div>
              </article>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Historie & výsledky</h2>
            <p className="subtext">Uzavřené hry během události.</p>
          </div>
          {history.length === 0 && <p className="subtext">Zatím žádné odehrané kvízy.</p>}
          <div className="quiz-list">
            {history.map((quiz) => (
              <article key={quiz.id} className="quiz-card">
                <header>
                  <h3>Místnost {quiz.id}</h3>
                  <span className="status-pill success">finished</span>
                </header>
                <p className="subtext">Skóre hráčů: {quiz.playersCount || 0}</p>
                <div className="quiz-card__actions">
                  <Link to={`/scoreboard/${quiz.id}`} className="ghost-btn">
                    📊 Scoreboard
                  </Link>
                  <Link
                    to={`/events/${event.id}/results/${quiz.id}`}
                    className="ghost-btn"
                  >
                    🏆 Vyhodnocení
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </NeonLayout>
  );
}
