// utils/teamUtils.js
import { db } from "../firebaseConfig";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

/**
 * Náhodné rozdělení hráčů do týmů A/B
 */
export function splitIntoTeams(players) {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const half = Math.ceil(shuffled.length / 2);

  return {
    teamA: shuffled.slice(0, half),
    teamB: shuffled.slice(half),
  };
}

/**
 * AUTO-BALANCE TÝMŮ
 * — upraví počty hráčů tak, aby A/B měly rozdíl max 1
 */
export async function autoBalanceTeams(roomCode) {
  const snap = await getDocs(
    collection(db, "quizRooms", roomCode, "players")
  );

  const players = [];
  snap.forEach((d) => players.push({ id: d.id, ...d.data() }));

  let teamA = players.filter((p) => p.team === "A");
  let teamB = players.filter((p) => p.team === "B");
  let none  = players.filter((p) => !p.team);

  // 1) přiřadit hráče bez týmu
  for (const p of none) {
    const assign = teamA.length <= teamB.length ? "A" : "B";
    await updateDoc(
      doc(db, "quizRooms", roomCode, "players", p.id),
      { team: assign }
    );
    if (assign === "A") teamA.push(p);
    else teamB.push(p);
  }

  // 2) dorovnat rozdíl
  while (Math.abs(teamA.length - teamB.length) > 1) {
    if (teamA.length > teamB.length) {
      // A má víc → přesun do B
      const moved = teamA.pop();
      await updateDoc(
        doc(db, "quizRooms", roomCode, "players", moved.id),
        { team: "B" }
      );
      teamB.push(moved);
    } else {
      // B má víc → přesun do A
      const moved = teamB.pop();
      await updateDoc(
        doc(db, "quizRooms", roomCode, "players", moved.id),
        { team: "A" }
      );
      teamA.push(moved);
    }
  }

  return { teamA, teamB };
}

