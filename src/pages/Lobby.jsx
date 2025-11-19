// pages/Lobby.jsx
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebaseConfig";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { collection, onSnapshot, doc } from "firebase/firestore";
import NeonLayout from "../components/NeonLayout";

const REACTIONS = ["🔥", "😂", "👏", "😱"];

export default function Lobby() {
  const { roomCode } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const searchPlayerId = search.get("player");

  useEffect(() => {
    if (!searchPlayerId || typeof window === "undefined") return;
    try {
      localStorage.setItem("playerId", searchPlayerId);
      localStorage.setItem("playerRoom", roomCode);
    } catch (err) {
      console.warn("Nepodařilo se uložit hráčské ID", err);
    }
  }, [searchPlayerId, roomCode]);

  const playerId = useMemo(() => {
    if (searchPlayerId) return searchPlayerId;
    if (typeof window === "undefined") return null;

    try {
      const storedRoom = localStorage.getItem("playerRoom");
      if (storedRoom !== roomCode) return null;
      return localStorage.getItem("playerId");
    } catch (err) {
      console.warn("Nepodařilo se načíst hráčské ID", err);
      return null;
    }
  }, [searchPlayerId, roomCode]);

  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState("waiting");
  const [recentReaction, setRecentReaction] = useState(null);

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

  const myPlayer = players.find((p) => p.id === playerId);

  const handleReaction = (emoji) => {
    setRecentReaction(emoji);
    setTimeout(() => setRecentReaction(null), 900);
  };

  return (
    <NeonLayout maxWidth={480}>
      <div className="neon-card">
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

        <h2 style={{ fontSize: 16, marginBottom: 8 }}>
          Hráči ({players.length})
        </h2>
        <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
          {players.map((p) => (
            <li
              key={p.id}
              style={{
                padding: "6px 10px",
                borderRadius: 10,
                marginBottom: 6,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(148,163,184,0.4)",
                boxShadow:
                  p.id === playerId
                    ? "0 0 18px rgba(56,189,248,0.5)"
                    : "none",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "999px",
                  background: p.color || "#22c55e",
                }}
              />
              <span>{p.name}</span>
            </li>
          ))}
        </ul>

        <p
          style={{
            marginTop: 10,
            fontSize: 12,
            opacity: 0.7,
          }}
        >
          Tvoje ID: <span style={{ fontWeight: 600 }}>{playerId}</span>
        </p>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "center",
            gap: 10,
            fontSize: 20,
          }}
        >
          {REACTIONS.map((r) => (
            <button
              key={r}
              onClick={() => handleReaction(r)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 22,
                filter:
                  recentReaction === r ? "drop-shadow(0 0 10px #facc15)" : "",
                transform:
                  recentReaction === r ? "translateY(-2px) scale(1.1)" : "",
                transition: "all 0.15s ease",
              }}
              aria-label={`Reaction ${r}`}
            >
              {r}
            </button>
          ))}
        </div>

        {recentReaction && (
          <div
            style={{
              position: "relative",
              height: 40,
              marginTop: 8,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 30,
                animation: "floatUp 0.8s ease-out forwards",
              }}
            >
              {recentReaction}
            </div>
          </div>
        )}

        <button
          onClick={goToGame}
          className="neon-btn"
          style={{
            marginTop: 18,
            width: "100%",
            fontSize: 16,
          }}
        >
          ▶ Přejít do hry
        </button>

        {myPlayer && (
          <p
            style={{
              marginTop: 8,
              fontSize: 11,
              opacity: 0.7,
              textAlign: "center",
            }}
          >
            Tvoje barva:{" "}
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "999px",
                background: myPlayer.color || "#22c55e",
                marginLeft: 4,
              }}
            />
          </p>
        )}
      </div>
    </NeonLayout>
  );
}

