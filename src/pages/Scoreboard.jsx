import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function Scoreboard() {
  const { roomCode } = useParams();
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "quizRooms", roomCode, "players"),
      orderBy("score", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [roomCode]);

  return (
    <div style={{ padding: 40 }}>
      <h1>Žebříček – Místnost {roomCode}</h1>

      <ul style={{ marginTop: 20 }}>
        {players.map((p, index) => (
          <li
            key={p.id}
            style={{
              marginBottom: 15,
              padding: 10,
              borderRadius: 8,
              background: "rgba(255,255,255,0.1)",
            }}
          >
            <strong>{index + 1}. {p.name}</strong>
            <span style={{ float: "right", fontWeight: 700 }}>
              {p.score ?? 0} bodů
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
