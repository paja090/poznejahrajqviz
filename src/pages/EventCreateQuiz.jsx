// pages/EventCreateQuiz.jsx
// Create a prepared quiz linked to an event
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import NeonLayout from "../components/NeonLayout";

export default function EventCreateQuiz() {
  const { eventId } = useParams();

  const [roomCode, setRoomCode] = useState(null);
  const [timeLimit, setTimeLimit] = useState(20);
  const [speedMode, setSpeedMode] = useState("top3");
  const [teamMode, setTeamMode] = useState(false);
  const [teamSize, setTeamSize] = useState(4);
  const [saving, setSaving] = useState(false);

  const createPreparedRoom = async () => {
    setSaving(true);
    try {
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();

      const payload = {
        eventId,
        prepared: true,
        status: "prepared",
        currentQuestionId: null,
        createdAt: serverTimestamp(),
        playersCount: 0,
        teamMode,
        teamSettings: {
          teamSize,
        },
        settings: {
          timeLimitSeconds: timeLimit,
          speedScoringMode: speedMode,
          showLeaderboardEachRound: true,
          showAnswersWhileRunning: false,
          autoPlayDelay: 4000,
          pauseDuration: 3000,
        },
      };

      await setDoc(doc(db, "quizRooms", newCode), payload);
      setRoomCode(newCode);
    } catch (error) {
      console.error(error);
      alert("Nepodařilo se vytvořit draft kvízu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <NeonLayout maxWidth={780}>
      <div className="neon-card">
        <h1 style={{ textAlign: "center" }}>Připravený kvíz pro event</h1>
        <p className="subtext" style={{ textAlign: "center", marginBottom: 20 }}>
          Vše se uloží jako draft. Hráči se nepřipojí, dokud kvíz neaktivuješ.
        </p>

        <div className="form-section">
          <label className="form-label">Čas na odpověď (s)</label>
          <input
            type="number"
            min={5}
            max={90}
            className="form-input"
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value) || 20)}
          />
        </div>

        <div className="form-section">
          <label className="form-label">Bodování speed otázek</label>
          <select
            className="form-select"
            value={speedMode}
            onChange={(e) => setSpeedMode(e.target.value)}
          >
            <option value="first">Pouze první</option>
            <option value="top3">Top 3 hráči</option>
            <option value="scale">Stupnice pro všechny</option>
          </select>
        </div>

        <div className="form-section">
          <label className="form-label">Týmový mód</label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={teamMode}
              onChange={(e) => setTeamMode(e.target.checked)}
            />
            Zapnout týmy
          </label>
          {teamMode && (
            <>
              <label className="form-label">Velikost týmu</label>
              <input
                className="form-input"
                type="number"
                min={2}
                max={10}
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value) || 4)}
              />
            </>
          )}
        </div>

        <button
          className="neon-btn"
          onClick={createPreparedRoom}
          disabled={saving}
          style={{ width: "100%", marginTop: 12 }}
        >
          {saving ? "Ukládám…" : "💾 Uložit připravený kvíz"}
        </button>

        {roomCode && (
          <div className="prepared-success">
            <p>Kód místnosti: {roomCode}</p>
            <div className="quiz-card__actions">
              <Link to={`/host/${roomCode}/questions`} className="ghost-btn">
                ➕ Přidat otázky
              </Link>
              <Link to={`/host/${roomCode}/dashboard`} className="ghost-btn">
                Moderovat
              </Link>
              <Link to={`/events/${eventId}`} className="ghost-btn">
                ← Zpět na event
              </Link>
            </div>
          </div>
        )}
      </div>
    </NeonLayout>
  );
}
