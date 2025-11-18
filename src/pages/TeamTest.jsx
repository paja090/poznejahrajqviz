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
  const [roomCode] = useState("TEAMTEST");

  const addLog = (msg) => {
    console.log(msg);
    setLog((prev) => [...prev, msg]);
  };

  // -------------------------------------
  // HLAVNÍ FUNKCE
  // -------------------------------------
  const runTest = async () => {
    setRunning(true);
    setLog([]);

    addLog("▶ Spouštím TEAM TEST…");

    // 1) vytvoříme místnost
    await createRoom();
    addLog("✔ Místnost TEAMTEST vytvořena");

    // 2) vytvoříme 6 hráčů
    const players = await createPlayers();
    addLog("✔ Hráči vytvořeni: " + players.length);

    // 3) náhodně je rozdělíme do dvou týmů A/B
    const { teamA, teamB } = await assignTeams(players);
    addLog("✔ Náhodné rozdělení týmů");
    addLog("Team A: " + teamA.map((p) => p.name).join(", "));
    addLog("Team B: " + teamB.map((p) => p.name).join(", "));

    // 4) vytvoříme 3 testovací otázky
    const questions = await createQuestions();
    addLog("✔ Vytvořeny testovací otázky");

    // 5) simulujeme odpovědi (A odpoví správně, B špatně)
    await simulateAnswers(questions, teamA, teamB);
    addLog("✔ Odpovědi simulovány");

    // 6) spočítáme skóre
    const result = await countTeamPoints(teamA, tea

