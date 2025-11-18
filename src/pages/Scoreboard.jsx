// pages/Scoreboard.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import NeonLayout from "../components/NeonLayout";

export default function Scoreboard() {
  const { roomCode } = useParams();

  const [players, setPlayers] = useState([]);
  const [bestAccuracy, setBestAccuracy] = useState(null);
  const [fastestPlayer, setFastestPlayer] = useState(null);
  const [mostPopularQuestion, setMostPopularQuestion] =
    useState(null);

  useEffect(() => {
    const load = async () => {
      const playersSnap = await getDocs(
        collection(db, "quizRooms", roomCode, "players")
      );
      const playersList = playersSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      playersList.sort((a, b) => (b.score || 0) - (a.score || 0));
      setPlayers(playersList);

      const answersSnap = await getDocs(
        collection(db, "quizRooms", roomCode, "answers")
      );
      const answers = answersSnap.docs.map((d) => d.data());

      const questionsSnap = await getDocs(
        collection(db, "quizRooms", roomCode, "questions")
      );
      const questions = {};
      questionsSnap.docs.forEach((q) => {
        questions[q.id] = { id: q.id, ...q.data() };
      });

      // accuracy per player
      const stats = {};
      for (const ans of answers) {
        if (!stats[ans.playerId]) {
          stats[ans.playerId] = {
            total: 0,
            correct: 0,
          };
        }
        stats[ans.playerId].total += 1;

        const q = questions[ans.questionId];
        if (!q) continue;
        let isCorrect = false;

        if (q.type === "abc") {
          isCorrect = ans.answer === q.correctAnswer;
        } else if (q.type === "open") {
          if (
            typeof ans.answer === "string" &&
            typeof q.correctAnswer === "string"
          ) {
            isCorrect =
              ans.answer.trim().toLowerCase() ===
              q.correctAnswer.trim().toLowerCase();
          }
        } else if (q.type === "image") {
          if (typeof q.correctAnswer === "number") {
            isCorrect = ans.answer === q.correctAnswer;
          } else if (
            typeof q.correctAnswer === "string" &&
            typeof ans.answer === "string"
          ) {
            isCorrect =
              ans.answer.trim().toLowerCase() ===
              q.correctAnswer.trim().toLowerCase();
          }
        }
        if (isCorrect) {
          stats[ans.playerId].correct += 1;
        }
      }

      let bestAcc = null;
      Object.entries(stats).forEach(([playerId, s]) => {
        if (!s.total) return;
        const acc = s.correct / s.total;
        if (!bestAcc || acc > bestAcc.accuracy) {
          const player = playersList.find((p) => p.id === playerId);
          if (player) {
            bestAcc = {
              player,
              accuracy: acc,
              total: s.total,
            };
          }
        }
      });
      setBestAccuracy(bestAcc);

      // nejrychlejší hráč podle reactionScore / fastestWins
      let fastest = null;
      playersList.forEach((p) => {
        const score = (p.reactionScore || 0) + (p.fastestWins || 0) * 2;
        if (!fastest || score > fastest.score) {
          fastest = { player: p, score };
        }
      });
      setFastestPlayer(fastest);

      // otázka s nejvíce správnými odpověďmi
      const correctCounts = {};
      for (const ans of answers) {
        const q = questions[ans.questionId];
        if (!q) continue;

        let isCorrect = false;
        if (q.type === "abc") {
          isCorrect = ans.answer === q.correctAnswer;
        } else if (q.type === "open") {
          if (
            typeof ans.answer === "string" &&
            typeof q.correctAnswer === "string"
          ) {
            isCorrect =
              ans.answer.trim().toLowerCase() ===
              q.correctAnswer.trim().toLowerCase();
          }
        } else if (q.type === "image") {
          if (typeof q.correctAnswer === "number") {
            isCorrect = ans.answer === q.correctAnswer;
          } else if (
            typeof q.correctAnswer === "string" &&
            typeof ans.answer === "string"
          ) {
            isCorrect =
              ans.answer.trim().toLowerCase() ===
              q.correctAnswer.trim().toLowerCase();
          }
        }

        if (isCorrect) {
          correctCounts[ans.questionId] =
            (correctCounts[ans.questionId] || 0) + 1;
        }
      }

      let bestQ = null;
      Object.entries(correctCounts).forEach(([qId, count]) => {
        const q = questions[qId];
        if (!q) return;
        if (!bestQ || count > bestQ.count) {
          bestQ = { question: q, count };
        }
      });

      setMostPopularQuestion(bestQ);
    };

    if (roomCode) {
      load();
    }
  }, [roomCode]);

  return (
    <NeonLayout maxWidth={720}>
      <div
        style={{
          color: "white",
          padding: 4,
        }}
      >
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            textAlign: "center",
            marginBottom: 4,
            background:
              "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          🏆 Finální výsledky
        </h1>
        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            opacity: 0.8,
            marginBottom: 14,
          }}
        >
          Místnost {roomCode}
        </p>

        {/* TOP hráči */}
        <div
          style={{
            background: "rgba(15,23,42,0.95)",
            padding: 16,
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.4)",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              marginBottom: 8,
            }}
          >
            Žebříček hráčů
          </h2>

          {players.length === 0 && (
            <p style={{ fontSize: 13, opacity: 0.7 }}>
              Žádní hráči – zřejmě došlo k chybě nebo nikdo nehrál.
            </p>
          )}

          {players.length > 0 && (
            <>
              <div style={{ marginBottom: 10 }}>
                {players.slice(0, 3).map((p, i) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 10px",
                      borderRadius: 999,
                      marginBottom: 6,
                      background:
                        i === 0
                          ? "rgba(250,204,21,0.16)"
                          : "rgba(148,163,184,0.16)",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 14,
                      }}
                    >
                      <span style={{ width: 22 }}>
                        {i === 0
                          ? "🥇"
                          : i === 1
                          ? "🥈"
                          : "🥉"}
                      </span>
                      <span>{p.name}</span>
                    </span>
                    <span style={{ fontSize: 14 }}>
                      {p.score ?? 0} b.
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="podium"
                style={{ marginTop: 6, marginBottom: 6 }}
              >
                {players.slice(0, 3).map((p, i) => (
                  <div
                    key={p.id}
                    className={`podium-item ${
                      i === 0
                        ? "gold"
                        : i === 1
                        ? "silver"
                        : "bronze"
                    }`}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        marginBottom: 4,
                      }}
                    >
                      {i === 0
                        ? "Vítěz"
                        : i === 1
                        ? "2. místo"
                        : "3. místo"}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11 }}>
                      {p.score ?? 0} b.
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Statistika */}
        <div
          style={{
            background: "rgba(15,23,42,0.95)",
            padding: 16,
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.4)",
          }}
        >
          <h2
            style={{
              fontSize: 18,
              marginBottom: 8,
            }}
          >
            Statistika hry
          </h2>

          <ul
            style={{
              listStyle: "none",
              paddingLeft: 0,
              margin: 0,
              fontSize: 13,
            }}
          >
            <li style={{ marginBottom: 6 }}>
              <strong>Nejlepší přesnost:</strong>{" "}
              {bestAccuracy ? (
                <>
                  {bestAccuracy.player.name} –{" "}
                  {(bestAccuracy.accuracy * 100).toFixed(0)}% (
                  {bestAccuracy.correct}/{bestAccuracy.total})
                </>
              ) : (
                "Nedostatek dat."
              )}
            </li>

            <li style={{ marginBottom: 6 }}>
              <strong>Nejrychlejší reakce:</strong>{" "}
              {fastestPlayer && fastestPlayer.score > 0 ? (
                <>
                  {fastestPlayer.player.name} (reakční skóre{" "}
                  {fastestPlayer.score})
                </>
              ) : (
                "Nedostatek dat ze speed otázek."
              )}
            </li>

            <li>
              <strong>Nejoblíbenější otázka:</strong>{" "}
              {mostPopularQuestion ? (
                <>
                  „{mostPopularQuestion.question.title}“ –{" "}
                  {mostPopularQuestion.count} správných odpovědí
                </>
              ) : (
                "Nenašla se otázka s výrazně vysokým počtem správných odpovědí."
              )}
            </li>
          </ul>
        </div>
      </div>
    </NeonLayout>
  );
}

