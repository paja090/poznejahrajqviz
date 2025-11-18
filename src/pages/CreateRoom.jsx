// pages/CreateRoom.jsx
import { useState } from "react";
import { db } from "../firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Link } from "react-router-dom";
import NeonLayout from "../components/NeonLayout";

export default function CreateRoom() {
  const [roomId, setRoomId] = useState(null);

  const [timeLimit, setTimeLimit] = useState(15);
  const [speedScoring, setSpeedScoring] = useState("first");
  const [autoScoreboard, setAutoScoreboard] = useState(true);
  const [showAnswersLive, setShowAnswersLive] = useState(false);

  const createRoom = async () => {
    const id = Math.floor(100000 + Math.random() * 900000).toString();

    await setDoc(doc(db, "quizRooms", id), {
      createdAt: serverTimestamp(),
      status: "waiting",
      currentQuestionId: null,
      playersCount: 0,
      settings: {
        allowLateJoin: true,
        showLeaderboardEachRound: autoScoreboard,
        timeLimitSeconds: timeLimit,
        speedScoringMode: speedScoring, // "first" | "top3" | "scale"
        showAnswersWhileRunning: showAnswersLive,
      },
    });

    setRoomId(id);
  };

  return (
    <NeonLayout>
      <div className="neon-card">
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 10,
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
          <>
            <p
              style={{
                fontSize: 13,
                opacity: 0.75,
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Nastav parametry hry a spusť vlastní neonový kvíz.
            </p>

            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>
                ⏱ Čas na odpověď (s)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={timeLimit}
                onChange={(e) =>
                  setTimeLimit(Number(e.target.value) || 15)
                }
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.6)",
                  background: "rgba(15,23,42,0.9)",
                  color: "white",
                }}
              />
            </div>

            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>
                ⚡ Bodování speed otázek
              </label>
              <select
                value={speedScoring}
                onChange={(e) => setSpeedScoring(e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.6)",
                  background: "rgba(15,23,42,0.9)",
                  color: "white",
                }}
              >
                <option value="first">Pouze první</option>
                <option value="top3">Top 3 hráči</option>
                <option value="scale">Všichni podle rychlosti</option>
              </select>
            </div>

            <div style={{ fontSize: 13, marginBottom: 8 }}>
              <label style={{ display: "flex", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={autoScoreboard}
                  onChange={(e) => setAutoScoreboard(e.target.checked)}
                />
                <span>Automaticky zobrazit žebříček mezi otázkami</span>
              </label>
            </div>

            <div style={{ fontSize: 13, marginBottom: 16 }}>
              <label style={{ display: "flex", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={showAnswersLive}
                  onChange={(e) => setShowAnswersLive(e.target.checked)}
                />
                <span>
                  Zobrazovat odpovědi hráčů během kola (pro
                  moderátora)
                </span>
              </label>
            </div>

            <button
              onClick={createRoom}
              className="neon-btn"
              style={{
                width: "100%",
                fontSize: 16,
              }}
            >
              🎮 Vytvořit novou místnost
            </button>
          </>
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
                className="neon-btn"
                style={{
                  display: "block",
                  textDecoration: "none",
                  textAlign: "center",
                  fontSize: 15,
                }}
              >
                ➕ Přidat otázky
              </Link>

              <Link
                to={`/host/${roomId}/dashboard`}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px 18px",
                  borderRadius: 999,
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: 600,
                  background: "rgba(15,23,42,0.95)",
                  color: "white",
                  border: "1px solid rgba(148,163,184,0.6)",
                }}
              >
                🎛 Otevřít moderátorský panel
              </Link>
            </div>
          </>
        )}
      </div>
    </NeonLayout>
  );
}



