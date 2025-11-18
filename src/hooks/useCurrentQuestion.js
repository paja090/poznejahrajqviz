// hooks/useCurrentQuestion.js
import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

export function useCurrentQuestion(roomCode, currentQuestionId) {
  const [question, setQuestion] = useState(null);

  useEffect(() => {
    if (!roomCode || !currentQuestionId) {
      setQuestion(null);
      return;
    }

    const qRef = doc(
      db,
      "quizRooms",
      roomCode,
      "questions",
      currentQuestionId
    );

    const unsub = onSnapshot(qRef, (snap) => {
      if (snap.exists()) {
        setQuestion({ id: currentQuestionId, ...snap.data() });
      } else {
        setQuestion(null);
      }
    });

    return () => unsub();
  }, [roomCode, currentQuestionId]);

  return question;
}
