// hooks/useRoom.js
import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

export function useRoom(roomCode) {
  const [room, setRoom] = useState(null);
  const [status, setStatus] = useState("waiting");
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    if (!roomCode) return;
    const roomRef = doc(db, "quizRooms", roomCode);
    const unsub = onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      if (!data) return;
      setRoom(data);
      setStatus(data.status || "waiting");
      setCurrentQuestionId(data.currentQuestionId || null);
      setSettings(data.settings || {});
    });

    return () => unsub();
  }, [roomCode]);

  return { room, status, currentQuestionId, settings };
}
