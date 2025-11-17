import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { collection, onSnapshot, doc } from "firebase/firestore";

export default function Lobby() {
  const { roomCode } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const playerId = search.get("player");

  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState("waiting");

  // hráči
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "quizRooms", roomCode, "players"),
      (snap) => {
        setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    return () => unsub();
  }, [roomCode]);

  // stav hry
  useEffect(() => {
    const roomRef = doc(db, "quizRooms", roomCode);
    const unsub = onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      if (!data) return;
      setStatus(data.status || "waiting");
    });

    return () => unsub();
  }, [roomCode]);

  const goToGame = () => {
    if (!playerId) {
      alert("Chybí ID hráče – vrať se prosím a připoj se znovu.");
      return;
    }
    navigate(`/game/${roomCode}/${playerId}`);
  };

  const statusText = {
    waiting: "Čekáme na start hry…",
    running: "Hra už běží – můžeš přejít do hry!",
    paused: "Hra je dočasně pozastavena.",
    finished: "Hra byla ukončena.",
  }[status] || "Čekáme na start hry…";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: 24,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(15,23,42,0.95)",
          borderRadius: 18,
          padding: 20,
          boxShadow: "0 0 30px rgba(15,23,42,0.9)",
          border: "1px solid rgba(148,163,184,0.4)",
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 6,
          }}
        >
          Lobby – Místnost {roomCode}
        </h1>

        <p
          style={{
            textAlign: "center",
            marginBottom: 14,
            opacity: 0.8,
            fontSize: 14,
          }}
        >
          {statusText}
        </p>

        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Hráči ({players.length})</h2>
        <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
          {players.map((p) => (
            <li
              key={p.id}
              style={{
                padding: "6px 10px",
                borderRadius: 10,
                background: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(148,163,184,0.4)",
                marginBottom: 6,
                fontSize: 14,
              }}
            >
              {p.name}
            </li>
          ))}
        </ul>

        <p
          style={{
            marginTop: 12,
            fontSize: 12,
            opacity: 0.7,
          }}
        >
          Tvoje ID: <span style={{ fontWeight: 600 }}>{playerId}</span>
        </p>

        <button
          onClick={goToGame}
          style={{
            marginTop: 18,
            width: "100%",
            padding: 14,
            borderRadius: 999,
            border: "none",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            background:
              "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
            color: "#020617",
            boxShadow: "0 0 18px rgba(236,72,153,0.7)",
          }}
        >
          ▶ Přejít do hry
        </button>
      </div>
    </div>
  );
}
