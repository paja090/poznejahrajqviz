import { useState } from "react";
import { db, storage } from "../firebaseConfig";
import {
  doc,
  setDoc,
  collection,
  updateDoc,
  addDoc,
} from "firebase/firestore";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import NeonLayout from "../components/NeonLayout";

export default function TestMode() {
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);

  function addLog(text) {
    setLog((prev) => [...prev, text]);
    console.log(text);
  }

  const createRoom = async () => {
    const roomCode = "TEST123";
    const ref = doc(db, "quizRooms", roomCode);
    await setDoc(ref, {
      createdAt: Date.now(),
      status: "waiting",
      settings: { speedScoringMode: "first" },
    });
    addLog("✔ Místnost TEST123 vytvořena");
    return roomCode;
  };

  const createPlayer = async (roomCode) => {
    const ref = addDoc(
      collection(db, "quizRooms", roomCode, "players"),
      {
        name: "TestUser",
        color: "#00eaff",
        score: 0,
      }
    );
    const playerId = (await ref).id;
    addLog("✔ Testovací hráč vytvořen");
    return playerId;
  };

  // Pomocná funkce pro obrázek
  const uploadTestImage = async (roomCode) => {
    const blob = new Blob(
      [new Uint8Array([137,80,78,71,13,10])], // fake malý PNG header
      { type: "image/png" }
    );
    const path = `quizImages/${roomCode}/testImage.png`;
    const r = ref(storage, path);
    await uploadBytes(r, blob);
    return await getDownloadURL(r);
  };

  const addQuestion = async (roomCode, q) => {
    await setDoc(
      doc(collection(db, "quizRooms", roomCode, "questions")),
      q
    );
  };

  const simulateAnswer = async (roomCode, qid, playerId, answer) => {
    await addDoc(
      collection(db, "quizRooms", roomCode, "answers"),
      {
        questionId: qid,
        answer,
        playerId,
        timeSubmitted: Date.now(),
      }
    );
  };

  const runTest = async () => {
    setRunning(true);
    setLog([]);

    const roomCode = await createRoom();
    const playerId = await createPlayer(roomCode);

    // 1) ABC
    const q1 = {
      title: "Největší planeta?",
      type: "abc",
      options: ["Mars", "Jupiter"],
      correctAnswer: 1,
      order: 1,
      createdAt: Date.now(),
    };
    const q1Ref = doc(collection(db, "quizRooms", roomCode, "questions"));
    await setDoc(q1Ref, { id: q1Ref.id, ...q1 });
    await simulateAnswer(roomCode, q1Ref.id, playerId, 1);
    addLog("✔ ABC otázka OK");

    // 2) OPEN
    const q2 = {
      title: "Kolik nohou má pavouk?",
      type: "open",
      correctAnswer: "8",
      options: [],
      order: 2,
      createdAt: Date.now(),
    };
    const q2Ref = doc(collection(db, "quizRooms", roomCode, "questions"));
    await setDoc(q2Ref, { id: q2Ref.id, ...q2 });
    await simulateAnswer(roomCode, q2Ref.id, playerId, "8");
    addLog("✔ OPEN OK");

    // 3) IMAGE-ABC
    const imageUrl = await uploadTestImage(roomCode);
    const q3 = {
      title: "Co je na obrázku?",
      type: "image",
      imageMode: "abc",
      options: ["pes", "kočka"],
      correctAnswer: 1,
      imageUrl,
      order: 3,
      createdAt: Date.now(),
    };
    const q3Ref = doc(collection(db, "quizRooms", roomCode, "questions"));
    await setDoc(q3Ref, { id: q3Ref.id, ...q3 });
    await simulateAnswer(roomCode, q3Ref.id, playerId, 1);
    addLog("✔ IMAGE-ABC OK");

    // 4) IMAGE-OPEN
    const q4 = {
      title: "Název obrázku?",
      type: "image",
      imageMode: "open",
      imageUrl,
      correctAnswer: "test",
      options: [],
      order: 4,
      createdAt: Date.now(),
    };
    const q4Ref = doc(collection(db, "quizRooms", roomCode, "questions"));
    await setDoc(q4Ref, { id: q4Ref.id, ...q4 });
    await simulateAnswer(roomCode, q4Ref.id, playerId, "Test");
    addLog("✔ IMAGE-OPEN OK");

    // 5) MULTI
    const q5 = {
      title: "Vyber ovoce",
      type: "multi",
      options: ["jablko", "auto", "banán"],
      correctAnswer: [0, 2],
      order: 5,
      createdAt: Date.now(),
    };
    const q5Ref = doc(collection(db, "quizRooms", roomCode, "questions"));
    await setDoc(q5Ref, { id: q5Ref.id, ...q5 });
    await simulateAnswer(roomCode, q5Ref.id, playerId, [0, 2]);
    addLog("✔ MULTI OK");

    // 6) NUMBER
    const q6 = {
      title: "Kolik je 100+20?",
      type: "number",
      correctAnswer: 120,
      tolerance: 5,
      toleranceType: "absolute",
      options: [],
      order: 6,
      createdAt: Date.now(),
    };
    const q6Ref = doc(collection(db, "quizRooms", roomCode, "questions"));
    await setDoc(q6Ref, { id: q6Ref.id, ...q6 });
    await simulateAnswer(roomCode, q6Ref.id, playerId, 118);
    addLog("✔ NUMBER OK");

    // 7) ARRANGE
    const q7 = {
      title: "Seřaď",
      type: "arrange",
      options: ["pes", "kočka", "myš"],
      correctAnswer: [0, 1, 2],
      order: 7,
      createdAt: Date.now(),
    };
    const q7Ref = doc(collection(db, "quizRooms", roomCode, "questions"));
    await setDoc(q7Ref, { id: q7Ref.id, ...q7 });
    await simulateAnswer(roomCode, q7Ref.id, playerId, [0, 1, 2]);
    addLog("✔ ARRANGE OK");

    // 8) SPEED
    const q8 = {
      title: "Kdo klikne nejrychleji?",
      type: "speed",
      options: [],
      order: 8,
      createdAt: Date.now(),
    };
    const q8Ref = doc(collection(db, "quizRooms", roomCode, "questions"));
    await setDoc(q8Ref, { id: q8Ref.id, ...q8 });
    await simulateAnswer(roomCode, q8Ref.id, playerId, "něco");
    addLog("✔ SPEED OK");

    addLog("🎉 VŠECHNY OTÁZKY OTESTOVÁNY");
    setRunning(false);
  };

  return (
    <NeonLayout>
      <div className="neon-card" style={{ maxWidth: 600, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>
          🧪 Testovací mód – v2.2
        </h1>

        <button
          className="neon-btn"
          disabled={running}
          onClick={runTest}
          style={{ marginTop: 20 }}
        >
          {running ? "Probíhá test..." : "Spustit testovací mód"}
        </button>

        <div style={{ marginTop: 20 }}>
          <h3>Log:</h3>
          <pre
            style={{
              background: "rgba(0,0,0,0.3)",
              padding: 10,
              borderRadius: 8,
              fontSize: 12,
              maxHeight: 400,
              overflowY: "auto",
            }}
          >
{log.join("\n")}
          </pre>
        </div>
      </div>
    </NeonLayout>
  );
}

