import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { useParams, useSearchParams } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";

export default function Lobby() {
  const { roomCode } = useParams();
  const [search] = useSearchParams();
  const playerId = search.get("player");

  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "quizRooms", roomCode, "players"),
      (snap) => {
        setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    return () => unsub();
  }, [roomCode]);

  const goToGame = () => {
    window.location.href = `/game/${roomCode}/${playerId}`;
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Místnost {roomCode}</h1>
      <h3>Čekáme na start hry…</h3>

      <h2>Hráči:</h2>
      <ul>
        {players.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>

      <p>Tvoje ID: {playerId}</p>

      {/* 🟣 TADY JE TLAČÍTKO */}
      <button
        onClick={goToGame}
        style={{
          marginTop: 20,
          padding: "15px 20px",
          background: "linear-gradient(45deg, #8b5cf6, #ec4899, #00e5a8)",
          borderRadius: 12,
          fontWeight: 700,
          border: "none",
          color: "#071022",
          cursor: "pointer",
        }}
      >
        ▶ Přejít do hry
      </button>
    </div>
  );
}
