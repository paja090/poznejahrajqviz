// hooks/usePlayers.js
import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";

export function usePlayers(roomCode) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!roomCode) return;
    const pRef = collection(db, "quizRooms", roomCode, "players");
    const unsub = onSnapshot(pRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.score || 0) - (a.score || 0));
      setPlayers(list);
    });

    return () => unsub();
  }, [roomCode]);

  return players;
}
