import { useState } from "react";
import { db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function JoinRoom() {
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const joinRoom = async () => {
    setError("");

    if (!roomCode || !name) {
      return setError("Vyplň kód místnosti i jméno.");
    }

    // 1) Ov ěření místnosti
    const roomRef = doc(db, "quizRooms", roomCode);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return setError("Místnost neexistuje.");
    }

    // 2) Přidání hráče do subkolekce
    const playerRef = await addDoc(
      collection(db, "quizRooms", roomCode, "players"),
      {
        name,
        score: 0,
        joinedAt: serverTimestamp(),
      }
    );

    // 3) Pokračování do lobby
    navigate(`/lobby/${roomCode}?player=${playerRef.id}`);
  };

  return (
    <div style={{ padding: 40, maxWidth: 400 }}>
      <h1>Připojit se do místnosti</h1>

      <label>Kód místnosti:</label>
      <input
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
        placeholder="123456"
        style={{ display: "block", width: "100%", marginBottom: 20 }}
      />

      <label>Tvoje přezdívka:</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tvoje jméno"
        style={{ display: "block", width: "100%", marginBottom: 20 }}
      />

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button
        onClick={joinRoom}
        style={{ padding: 20, marginTop: 20, width: "100%" }}
      >
        Připojit se
      </button>
    </div>
  );
}
