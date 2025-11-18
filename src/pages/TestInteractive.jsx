import { useState } from "react";
import { db, storage } from "../firebaseConfig";
import {
  doc,
  setDoc,
  collection,
  addDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import NeonLayout from "../components/NeonLayout";

export default function TestInteractive() {
  const [roomCode, setRoomCode] = useState("");
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);

  const addLog = (t) => setLog((p) => [...p, t]);

  const uploadDummyImage = async (room) => {
    const blob = new Blob([new Uint8Array([137, 80, 78, 71])], {
      type: "image/png",
    });
    const path = `quizImages/${room}/dummy.png`;
    const r = ref(storage, path);
    await uploadBytes(r, blob);
    return await getDownloadURL(r);
  };

  const setup = async () => {
    setLoading(true);
    setLog([]);

    const room = "TESTROOM";
    setRoomCode(room);

    // 1) vytvoření místnosti
    await setDoc(doc(db, "quizRooms", room), {
      createdAt: Date.now(),
      status: "waiting",
      settings: { speedScoringMode: "first" },
    });
    addLog("✔ Místnost TESTROOM vytvořena");

    // 2) obrázek
    const img = await uploadDummyImage(room);

    // 3) přidání otázek (ABC, OPEN, IMAGE, MULTI, NUMBER, ARRANGE, SPEED)
    const questions = [
      {
        title: "Největší planeta?",
        type: "abc",
        options: ["Mars", "Jupiter"],
        correctAnswer: 1,
        order: 1,
      },
      {
        title: "Kolik nohou má pavouk?",
        type: "open",
        correctAnswer: "8",
        options: [],
        order: 2,
      },
      {
        title: "Kdo je na obrázku?",
        type: "image",
        imageMode: "abc",
        options: ["pes", "kočka"],
        correctAnswer: 1,
        imageUrl: img,
        order: 3,
      },
      {
        title: "Název obrázku?",
        type: "image",
        imageMode: "open",
        options: [],
        correctAnswer: "test",
        imageUrl: img,
        order: 4,
      },
      {
        title: "Vyber ovoce",
        type: "multi",
        options: ["jablko", "auto", "banán"],
        correctAnswer: [0, 2],
        order: 5,
      },
      {
        title: "Kolik je 100 + 20?",
        type: "number",
        options: [],
        correctAnswer: 120,
        tolerance: 5,
        toleranceType: "absolute",
        order: 6,
      },
      {
        title: "Seřaď:",
        type: "arrange",
        options: ["pes", "kočka", "myš"],
        correctAnswer: [0, 1, 2],
        order: 7,
      },
      {
        title: "Speed otázka",
        type: "speed",
        options: [],
        order: 8,
      },
    ];

    for (let q of questions) {
      const refQ = doc(collection(db, "quizRooms", room, "questions"));
      await setDoc(refQ, { id: refQ.id, ...q, createdAt: Date.now() });
      addLog(`✔ Otázka: ${q.title}`);
    }

    setLoading(false);
  };

  return (
    <NeonLayout>
      <div className="neon-card" style={{ maxWidth: 600, margin: "0 auto" }}>
        <h1>🧪 Interaktivní test</h1>

        <button className="neon-btn" disabled={loading} onClick={setup}>
          {loading ? "Připravuji..." : "Vytvořit testovací místnost"}
        </button>

        {roomCode && (
          <>
            <p style={{ marginTop: 20 }}>
              👉 Jako hráč otevři:  
              <br />
              <strong>/join</strong>
              <br />
              a zadej kód: <strong>TESTROOM</strong>
            </p>
            <p>
              Admin Dashboard: <br />
              <strong>/host/TESTROOM/dashboard</strong>
            </p>
          </>
        )}

        <div style={{ marginTop: 20 }}>
          <h3>Log:</h3>
          <pre style={{ maxHeight: 400, overflowY: "auto" }}>{log.join("\n")}</pre>
        </div>
      </div>
    </NeonLayout>
  );
}
