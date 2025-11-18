import { useState } from "react";
import { db } from "../firebaseConfig";
import {
  doc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import NeonLayout from "../components/NeonLayout";
import { evaluateAnswer } from "../utils/evaluateAnswer";

export default function TeamTest() {
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const roomCode = "TEAMTEST";

  const addLog = (msg) => {
    console.log(msg);
    setLog((prev) => [...prev, msg]);
  };

  // -------------------------------------
  // HLAVNÍ TEAM TEST
  // -------------------------------------
  const runTest = async () => {
    setRunning(true);
    setLog([]);

    addLog("▶ Spouštím TEAM TEST…");

    await createRoom();
    addLog("✔ Místnost TEAMTEST vytvořena");

    const players = await createPlayers();
    addLog("✔ Hráči vytvořeni: " + players.length);

    const { teamA, teamB } = await assignTeams(players);
    addLog("✔ Náhodné rozdělení týmů");
    addLog("Team A: " + teamA.map((p) => p.name).join(", "));
    addLog("Team B: " + teamB.map((p) => p.name).join(", "));

    const questions = await createQuestions();
    addLog("✔ Vytvořeny testovací otázky");

    await simulateAnswers(questions, teamA, teamB);
    addLog("✔ Odpovědi simulovány");

    const result = await countTeamPoints(teamA, teamB);
    addLog("✔ Výpočet bodů hotov");

    addLog("TEAM A: " + result.teamA);
    addLog("TEAM B: " + result.teamB);

    if (result.teamA > result.teamB) {
      addLog("🎉 ✔ TEAM SCORING FUNGUJE SPRÁVNĚ");
    } else {
      addLog("❌ TEAM TEST SELHAL – výsledky nejsou správné");
    }

    setRunning(false);
  };

  // -------------------------------------
  // 1) Místnost
  // -------------------------------------
  const createRoom = async () => {
    await setDoc(doc(db, "quizRooms", roomCode), {
      createdAt: Date.now(),
      status: "waiting",
      settings: { speedScoringMode: "first" },
    });
  };

  // -------------------------------------
  // 2) Hráči (6 hráčů)
  // -------------------------------------
  const createPlayers = async () => {
    const arr = [];
    for (let i = 1; i <= 6; i++) {
      const ref = await addDoc(
        collection(db, "quizRooms", roomCode, "players"),
        {
          name: "Hráč" + i,
          score: 0,
        }
      );
      arr.push({ id: ref.id, name: "Hráč" + i });
    }
    return arr;
  };

  // -------------------------------------
  // 3) Rozdělení týmů A / B
  // -------------------------------------
  const assignTeams = async (players) => {
    const shuffled = [...players].sort(() => Math.random() - 0.5);

    const teamA = shuffled.slice(0, 3);
    const teamB = shuffled.slice(3, 6);

    for (let p of teamA) {
      await updateDoc(doc(db, "quizRooms", roomCode, "players", p.id), {
        team: "A",
      });
    }
    for (let p of teamB) {
      await updateDoc(doc(db, "quizRooms", roomCode, "players", p.id), {
        team: "B",
      });
    }

    return { teamA, teamB };
  };

  // -------------------------------------
  // 4) Testovací otázky
  // -------------------------------------
  const createQuestions = async () => {
    const questions = [
      {
        title: "Největší planeta?",
        type: "abc",
        options: ["Mars", "Jupiter"],
        correctAnswer: 1,
      },
      {
        title: "Kolik je 5+5?",
        type: "number",
        correctAnswer: 10,
        tolerance: 0,
        toleranceType: "absolute",
      },
      {
        title: "Vyber ovoce",
        type: "multi",
        options: ["auto", "jablko", "banán"],
        correctAnswer: [1, 2],
      },
    ];

    const ids = [];

    for (let q of questions) {
      const ref = doc(collection(db, "quizRooms", roomCode, "questions"));
      await setDoc(ref, {
        id: ref.id,
        ...q,
        order: Date.now(),
        createdAt: Date.now(),
      });
      ids.push({ id: ref.id, ...q });
    }

    return ids;
  };

  // -------------------------------------
  // 5) Simulace odpovědí
  // -------------------------------------
  const simulateAnswers = async (questions, teamA, teamB) => {
    for (let q of questions) {
      // team A → správně
      for (let p of teamA) {
        await addDoc(collection(db, "quizRooms", roomCode, "answers"), {
          questionId: q.id,
          playerId: p.id,
          answer: q.correctAnswer,
          timeSubmitted: Date.now(),
        });
      }

      // team B → schválně špatně
      for (let p of teamB) {
        await addDoc(collection(db, "quizRooms", roomCode, "answers"), {
          questionId: q.id,
          playerId: p.id,
          answer: "X",
          timeSubmitted: Date.now(),
        });
      }
    }
  };

  // -------------------------------------
  // 6) Spočítat body
  // -------------------------------------
  const countTeamPoints = async (teamA, teamB) => {
    const answersSnap = await getDocs(
      collection(db, "quizRooms", roomCode, "answers")
    );
    const questionsSnap = await getDocs(
      collection(db, "quizRooms", roomCode, "questions")
    );

    const questions = {};
    questionsSnap.forEach((d) => (questions[d.id] = d.data()));

    let scoreA = 0;
    let scoreB = 0;

    answersSnap.forEach((ans) => {
      const a = ans.data();
      const q = questions[a.questionId];
      const ok = evaluateAnswer(q, a.answer);

      if (!ok) return;

      if (teamA.some((p) => p.id === a.playerId)) scoreA++;
      if (teamB.some((p) => p.id === a.playerId)) scoreB++;
    });

    return { teamA: scoreA, teamB: scoreB };
  };

  // -------------------------------------
  // UI
  // -------------------------------------
  return (
    <NeonLayout>
      <div className="neon-card" style={{ maxWidth: 600, margin: "0 auto" }}>
        <h1>🧪 TEAM TEST – v2.2</h1>

        <button
          className="neon-btn"
          disabled={running}
          onClick={runTest}
          style={{ marginTop: 15 }}
        >
          {running ? "Testuji..." : "Spustit test týmového módu"}
        </button>

        <div style={{ marginTop: 20 }}>
          <h3>Log:</h3>
          <pre
            style={{
              background: "rgba(0,0,0,0.3)",
              padding: 12,
              borderRadius: 10,
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


