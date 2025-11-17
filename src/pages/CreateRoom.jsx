import { useState } from "react";
import { db } from "../firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Link } from "react-router-dom";

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
          Vytvořit místnost
        </h1>

        {!roomId && (
          <button
            onClick={createRoom}
            style={{
              width: "100%",
              padding: 14,
              fontSize: 16,
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              background:
                "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
              color: "#020617",
              boxShadow: "0 0 20px rgba(236,72,153,0.6)",
            }}
          >
            🎮 Vytvořit novou místnost
          </button>
        )}

        {roomId && (
          <>
            <p style={{ marginTop: 10, marginBottom: 6, opacity: 0.8 }}>
              Místnost byla vytvořena. Sdílej tento kód s hráči:
            </p>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                textAlign: "center",
                letterSpacing: 4,
                marginBottom: 18,
              }}
            >
              {roomId}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <Link
                to={`/host/${roomId}/questions`}
                style={linkButton}
              >
                ➕ Přidat otázky
              </Link>

              <Link
                to={`/host/${roomId}/dashboard`}
                style={{
                  ...linkButton,
                  background: "rgba(15,23,42,0.95)",
                  color: "white",
                  border: "1px solid rgba(148,163,184,0.6)",
                  boxShadow: "none",
                }}
              >
                🎛 Otevřít moderátorský panel
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const linkButton = {
  display: "inline-block",
  width: "100%",
  textAlign: "center",
  padding: "12px 18px",
  background: "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
  borderRadius: 999,
  textDecoration: "none",
  color: "#020617",
  fontWeight: 600,
  fontSize: 15,
  boxShadow: "0 0 20px rgba(236,72,153,0.6)",
};


