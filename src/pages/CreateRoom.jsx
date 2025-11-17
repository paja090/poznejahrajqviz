import { useState } from "react";
import { db } from "../firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

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
        </>
      ) : (
        <button onClick={createRoom} style={{ padding: 20, fontSize: 18 }}>
          Create Room
        </button>
      )}
    </div>
  );
}
