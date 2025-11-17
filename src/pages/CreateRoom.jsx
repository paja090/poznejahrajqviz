import { useState } from "react";
import { db } from "../firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Link } from "react-router-dom";   // ← přidat

export default function CreateRoom() {
  const [roomId, setRoomId] = useState(null);

  const createRoom = async () => {
    const id = Math.floor(100000 + Math.random() * 900000).toString();

    await setDoc(doc(db, "quizRooms", id), {
      createdAt: serverTimestamp(),
      status: "waiting",
      currentQuestionId: null,
      playersCount: 0,
      settings: {
        allowLateJoin: true,
        showLeaderboardEachRound: true,
      },
    });

    setRoomId(id);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Create Quiz Room</h1>

      {roomId ? (
        <>
          <p>Room created!</p>
          <h2>Kód místnosti: {roomId}</h2>

          {/* 🔥 TADY VLOŽENÝ ODKAZ */}
          <Link
            to={`/host/${roomId}/questions`}
            style={{
              display: "inline-block",
              marginTop: 20,
              padding: "12px 20px",
              background: "linear-gradient(45deg,#8b5cf6,#ec4899,#00e5a8)",
              borderRadius: 12,
              textDecoration: "none",
              color: "#071022",
              fontWeight: 600,
            }}
          >
            ➕ Přidat otázky
          </Link>
        </>
      ) : (
        <button onClick={createRoom} style={{ padding: 20, fontSize: 18 }}>
          Create Room
        </button>
      )}
    </div>
  );
}

