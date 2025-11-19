import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { autoBalanceTeams } from "../utils/teamUtils";

export default function TeamDebugPanel({ roomCode, onClose }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const snap = await getDocs(collection(db, "quizRooms", roomCode, "players"));
    const arr = [];
    snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
    setPlayers(arr);
    setLoading(false);
  };

  const reshuffle = async () => {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const half = Math.ceil(shuffled.length / 2);

    for (let i = 0; i < shuffled.length; i++) {
      await updateDoc(doc(db, "quizRooms", roomCode, "players", shuffled[i].id), {
        team: i < half ? "A" : "B",
      });
    }

    load();
  };

  const rebalance = async () => {
    await autoBalanceTeams(roomCode);
    load();
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="debug-panel">Načítám…</div>;

  return (
    <div className="debug-panel">
      <h2>🛠 Team Debug</h2>

      <button onClick={onClose} className="debug-close">✖</button>

      <h3>Hráči:</h3>
      <ul>
        {players.map((p) => (
          <li key={p.id}>
            <b>{p.name}</b> — Team {p.team || "?"} — score: {p.score || 0}
          </li>
        ))}
      </ul>

      <h3>Akce:</h3>

      <button onClick={rebalance} className="debug-btn">⚖ Auto-balance týmů</button>
      <button onClick={reshuffle} className="debug-btn">🔀 Náhodné rozdělení</button>

      <p style={{ opacity: 0.7, marginTop: 20 }}>
        Změny se projeví okamžitě ve všech oknech.
      </p>
    </div>
  );
}
import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { autoBalanceTeams } from "../utils/teamUtils";

export default function TeamDebugPanel({ roomCode, onClose }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const snap = await getDocs(collection(db, "quizRooms", roomCode, "players"));
    const arr = [];
    snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
    setPlayers(arr);
    setLoading(false);
  };

  const reshuffle = async () => {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const half = Math.ceil(shuffled.length / 2);

    for (let i = 0; i < shuffled.length; i++) {
      await updateDoc(doc(db, "quizRooms", roomCode, "players", shuffled[i].id), {
        team: i < half ? "A" : "B",
      });
    }

    load();
  };

  const rebalance = async () => {
    await autoBalanceTeams(roomCode);
    load();
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="debug-panel">Načítám…</div>;

  return (
    <div className="debug-panel">
      <h2>🛠 Team Debug</h2>

      <button onClick={onClose} className="debug-close">✖</button>

      <h3>Hráči:</h3>
      <ul>
        {players.map((p) => (
          <li key={p.id}>
            <b>{p.name}</b> — Team {p.team || "?"} — score: {p.score || 0}
          </li>
        ))}
      </ul>

      <h3>Akce:</h3>

      <button onClick={rebalance} className="debug-btn">⚖ Auto-balance týmů</button>
      <button onClick={reshuffle} className="debug-btn">🔀 Náhodné rozdělení</button>

      <p style={{ opacity: 0.7, marginTop: 20 }}>
        Změny se projeví okamžitě ve všech oknech.
      </p>
    </div>
  );
}
