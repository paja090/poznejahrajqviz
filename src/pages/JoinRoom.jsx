// pages/JoinRoom.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import NeonLayout from "../components/NeonLayout";

const PLAYER_COLORS = [
  "#22c55e",
  "#ef4444",
  "#3b82f6",
  "#eab308",
  "#a855f7",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#22d3ee",
  "#4ade80",
  "#facc15",
  "#fb7185",
];

function randomColor() {
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
}

export default function JoinRoom() {
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    const trimmedRoom = roomCode.trim();
    const trimmedName = name.trim();

    if (!trimmedRoom || !trimmedName) {
      alert("Vyplň jméno i kód místnosti.");
      return;
    }

    setLoading(true);
    try {
      const roomRef = doc(db, "quizRooms", trimmedRoom);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        alert("Místnost s tímto kódem neexistuje.");
        setLoading(false);
        return;
      }

      const roomData = roomSnap.data();
      if (roomData.status === "finished") {
        alert("Tato hra už byla ukončena.");
        setLoading(false);
        return;
      }

      const color = randomColor();

      const playersRef = collection(
        db,
        "quizRooms",
        trimmedRoom,
        "players"
      );
      const playerDoc = await addDoc(playersRef, {
        name: trimmedName,
        score: 0,
        joinedAt: serverTimestamp(),
        color,
        fastestWins: 0,
        reactionScore: 0,
      });

      await updateDoc(roomRef, {
        playersCount: increment(1),
      });

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("playerId", playerDoc.id);
          localStorage.setItem("playerRoom", trimmedRoom);
        } catch (storageErr) {
          console.warn("Nepodařilo se uložit playerId do localStorage", storageErr);
        }
      }

      navigate(`/lobby/${trimmedRoom}?player=${playerDoc.id}`);
    } catch (err) {
      console.error(err);
      alert("Nepodařilo se připojit – zkus to prosím znovu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <NeonLayout>
      <form onSubmit={handleJoin} className="neon-card">
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 16,
            textAlign: "center",
            background:
              "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Připojit se ke hře
        </h1>

        <label style={labelStyle}>Tvoje jméno</label>
        <input
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Např. Pavel"
        />

        <label style={labelStyle}>Kód místnosti</label>
        <input
          style={inputStyle}
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          placeholder="Šestimístný kód"
        />

        <button
          type="submit"
          disabled={loading}
          className="neon-btn"
          style={{
            marginTop: 18,
            width: "100%",
            fontSize: 16,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Připojuji…" : "🔑 Připojit se"}
        </button>
      </form>
    </NeonLayout>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 4,
  marginTop: 10,
  fontSize: 13,
  opacity: 0.85,
};

const inputStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.6)",
  background: "rgba(15,23,42,0.8)",
  color: "white",
  fontSize: 14,
  outline: "none",
};

