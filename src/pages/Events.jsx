// pages/Events.jsx
// Dashboard listing of all scheduled events
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebaseConfig";
import NeonLayout from "../components/NeonLayout";
import BrandLogo from "../components/BrandLogo";

export default function Events() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const ref = query(collection(db, "events"), orderBy("date", "asc"));
    return onSnapshot(ref, (snap) => {
      setEvents(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  return (
    <NeonLayout maxWidth={1100}>
      <div className="events-hero">
        <BrandLogo size={200} />
        <div>
          <p className="eyebrow">Event Control</p>
          <h1>Události & připravené kvízy</h1>
          <p className="subtext">
            Připrav si celé show dopředu, propojuj místnosti s eventy a spouštěj je na
            jedno kliknutí.
          </p>
        </div>
        <Link to="/events/create" className="neon-btn">
          ➕ Vytvořit událost
        </Link>
      </div>

      <div className="events-grid">
        {events.length === 0 && (
          <div className="empty-state">
            <p>Zatím nemáš žádné eventy. Klikni na „Vytvořit událost“ a naplánuj první show.</p>
          </div>
        )}

        {events.map((event) => (
          <article key={event.id} className="event-card">
            {event.image && (
              <div className="event-card__image">
                <img src={event.image} alt={event.name} loading="lazy" />
              </div>
            )}
            <div className="event-card__body">
              <p className="eyebrow">{event.date || "Bez data"}</p>
              <h3>{event.name}</h3>
              <p>{event.description || "Bez popisu"}</p>
              <div className="event-card__actions">
                <Link to={`/events/${event.id}`} className="ghost-btn">
                  Detail & historie
                </Link>
                <Link to={`/events/${event.id}/create-quiz`} className="ghost-btn">
                  🧪 Připravit kvíz
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </NeonLayout>
  );
}
