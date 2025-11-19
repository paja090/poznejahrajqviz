// pages/QuizResults.jsx
// Neon summary after the game is finished
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, doc, onSnapshot } from "firebase/firestore";
import NeonLayout from "../components/NeonLayout";
import BrandLogo from "../components/BrandLogo";
import { db } from "../firebaseConfig";
import { evaluateAnswer } from "../utils/evaluateAnswer";

export default function QuizResults() {
  const params = useParams();
  const { roomCode } = params;
  const eventId = params.eventId;

  const [room, setRoom] = useState(null);
  const [event, setEvent] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    const roomRef = doc(db, "quizRooms", roomCode);
    return onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setRoom(data);
      }
    });
  }, [roomCode]);

  useEffect(() => {
    const targetEventId = eventId || room?.eventId;
    if (!targetEventId) return;
    const ref = doc(db, "events", targetEventId);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) setEvent({ id: snap.id, ...snap.data() });
    });
  }, [eventId, room?.eventId]);

  useEffect(() => {
    const ref = collection(db, "quizRooms", roomCode, "players");
    return onSnapshot(ref, (snap) => {
      const arr = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      arr.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      setPlayers(arr);
    });
  }, [roomCode]);

  useEffect(() => {
    const ref = collection(db, "quizRooms", roomCode, "teams");
    return onSnapshot(ref, (snap) => {
      const arr = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      arr.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      setTeams(arr);
    });
  }, [roomCode]);

  useEffect(() => {
    const ref = collection(db, "quizRooms", roomCode, "questions");
    return onSnapshot(ref, (snap) => {
      const arr = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setQuestions(arr);
    });
  }, [roomCode]);

  useEffect(() => {
    const ref = collection(db, "quizRooms", roomCode, "answers");
    return onSnapshot(ref, (snap) => {
      setAnswers(snap.docs.map((doc) => doc.data()));
    });
  }, [roomCode]);

  const answersByQuestion = useMemo(() => {
    const map = new Map();
    answers.forEach((answer) => {
      if (!map.has(answer.questionId)) map.set(answer.questionId, []);
      map.get(answer.questionId).push(answer);
    });
    return map;
  }, [answers]);

  const buildStatsForPlayer = (playerId) => {
    const stats = {
      answeredCount: 0,
      correctCount: 0,
      speedWins: 0,
      totalQuestions: questions.length,
    };
    questions.forEach((question) => {
      const list = answersByQuestion.get(question.id) || [];
      const answer = list.find((a) => a.playerId === playerId);
      if (answer) {
        stats.answeredCount += 1;
        if (evaluateAnswer(question, answer.answer)) {
          stats.correctCount += 1;
        }
      }
      if (question.type === "speed" && list.length) {
        const sorted = [...list].sort(
          (a, b) => Number(a.timeSubmitted) - Number(b.timeSubmitted)
        );
        if (sorted[0]?.playerId === playerId) {
          stats.speedWins += 1;
        }
      }
    });
    stats.accuracy = stats.answeredCount
      ? Math.round((stats.correctCount / stats.answeredCount) * 100)
      : 0;
    return stats;
  };

  const playerStatsMap = useMemo(() => {
    const map = new Map();
    players.forEach((player) => {
      map.set(player.id, buildStatsForPlayer(player.id));
    });
    return map;
  }, [players, questions, answersByQuestion]);

  const topPlayers = useMemo(() => players.slice(0, 3), [players]);

  const totalAccuracy = useMemo(() => {
    if (!players.length) return 0;
    const sum = players.reduce((acc, player) => {
      const stats = playerStatsMap.get(player.id);
      return acc + (stats?.accuracy || 0);
    }, 0);
    return Math.round(sum / players.length);
  }, [players, playerStatsMap]);

  const speedWinner = useMemo(() => {
    let best = null;
    players.forEach((player) => {
      const stats = playerStatsMap.get(player.id);
      if (!stats) return;
      if (!best || stats.speedWins > best.speedWins) {
        best = { player, speedWins: stats.speedWins };
      }
    });
    return best;
  }, [players, playerStatsMap]);

  const accuracyKing = useMemo(() => {
    let best = null;
    players.forEach((player) => {
      const stats = playerStatsMap.get(player.id);
      if (!stats) return;
      if (!best || stats.accuracy > best.accuracy) {
        best = { player, accuracy: stats.accuracy };
      }
    });
    return best;
  }, [players, playerStatsMap]);

  const perfectPlayers = useMemo(() => {
    return players.filter((player) => {
      const stats = playerStatsMap.get(player.id);
      if (!stats) return false;
      return (
        stats.answeredCount === stats.totalQuestions &&
        stats.correctCount === stats.totalQuestions
      );
    });
  }, [players, playerStatsMap]);

  const sortedQuestions = useMemo(() => questions, [questions]);

  const mostImproved = useMemo(() => {
    if (!sortedQuestions.length) return null;
    const half = Math.ceil(sortedQuestions.length / 2);
    const firstIds = new Set(sortedQuestions.slice(0, half).map((q) => q.id));
    const secondIds = new Set(sortedQuestions.slice(half).map((q) => q.id));

    let best = null;
    players.forEach((player) => {
      const stats = playerStatsMap.get(player.id);
      if (!stats) return;
      const list = answers.filter((a) => a.playerId === player.id);
      const accuracyForSet = (set) => {
        let answered = 0;
        let correct = 0;
        list.forEach((answer) => {
          if (!set.has(answer.questionId)) return;
          answered += 1;
          const question = questions.find((q) => q.id === answer.questionId);
          if (question && evaluateAnswer(question, answer.answer)) {
            correct += 1;
          }
        });
        return answered ? (correct / answered) * 100 : null;
      };
      const firstAcc = accuracyForSet(firstIds);
      const secondAcc = accuracyForSet(secondIds);
      if (secondAcc === null) return;
      const delta = (secondAcc || 0) - (firstAcc || 0);
      if (!best || delta > best.delta) {
        best = { player, delta: Math.round(delta) };
      }
    });
    return best;
  }, [players, answers, questions, playerStatsMap, sortedQuestions]);

  const questionStats = useMemo(() => {
    return sortedQuestions.map((question) => {
      const list = answersByQuestion.get(question.id) || [];
      const correct = list.filter((answer) =>
        evaluateAnswer(question, answer.answer)
      ).length;
      return {
        question,
        correct,
        total: list.length,
        accuracy: list.length ? Math.round((correct / list.length) * 100) : 0,
      };
    });
  }, [sortedQuestions, answersByQuestion]);

  const hardestQuestion = useMemo(() => {
    return questionStats.reduce((prev, curr) => {
      if (!prev || curr.accuracy < prev.accuracy) return curr;
      return prev;
    }, null);
  }, [questionStats]);

  const easiestQuestion = useMemo(() => {
    return questionStats.reduce((prev, curr) => {
      if (!prev || curr.accuracy > prev.accuracy) return curr;
      return prev;
    }, null);
  }, [questionStats]);

  const typeDistribution = useMemo(() => {
    const counts = {};
    questions.forEach((question) => {
      counts[question.type] = (counts[question.type] || 0) + 1;
    });
    return counts;
  }, [questions]);

  const teamResults = useMemo(() => {
    if (!teams.length) return [];
    return teams
      .map((team) => {
        const members = players.filter((player) => player.teamId === team.id);
        const totalScore =
          typeof team.score === "number"
            ? team.score
            : members.reduce((sum, member) => sum + (member.score || 0), 0);
        const avgScore = members.length
          ? Math.round(
              totalScore / members.length
            )
          : 0;
        return {
          ...team,
          members,
          score: totalScore,
          avgScore,
          accuracy:
            members.length > 0
              ? Math.round(
                  members.reduce((acc, member) => {
                    const stats = playerStatsMap.get(member.id);
                    return acc + (stats?.accuracy || 0);
                  }, 0) / members.length
                )
              : 0,
        };
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [teams, players, playerStatsMap]);

  const maxTeamScore = teamResults.length
    ? Math.max(...teamResults.map((team) => team.score || 0))
    : 0;

  const shareUrl = useMemo(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    if (eventId || event?.id) {
      return `${base}/events/${eventId || event?.id}/results/${roomCode}`;
    }
    return `${base}/results/${roomCode}`;
  }, [eventId, event?.id, roomCode]);

  const handleCopyShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  const exportCSV = () => {
    const rows = [
      ["Jméno", "Skóre", "Přesnost (%)", "Správně", "Zodpovězeno"],
      ...players.map((player) => {
        const stats = playerStatsMap.get(player.id);
        return [
          player.name,
          player.score || 0,
          stats?.accuracy || 0,
          stats?.correctCount || 0,
          stats?.answeredCount || 0,
        ];
      }),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `quiz-results-${roomCode}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    window.print();
  };

  if (!room) {
    return (
      <NeonLayout maxWidth={960}>
        <div className="neon-card">
          <p>Načítám výsledky…</p>
        </div>
      </NeonLayout>
    );
  }

  return (
    <NeonLayout maxWidth={1200}>
      <div className="results-hero">
        <div className="results-confetti" aria-hidden />
        <BrandLogo size={200} />
        <div>
          <p className="eyebrow">Oficiální vyhodnocení</p>
          <h1>
            {event?.name ? `${event.name} – místnost ${roomCode}` : `Místnost ${roomCode}`}
          </h1>
          <p className="subtext">
            Stav hry: {room.status} • Hráčů: {players.length} • Otázek: {questions.length}
          </p>
          <div className="results-actions">
            <button className="ghost-btn" onClick={exportCSV}>
              ⬇️ Export CSV
            </button>
            <button className="ghost-btn" onClick={exportPDF}>
              🖨 Export PDF
            </button>
            <Link to={`/scoreboard/${roomCode}`} className="ghost-btn">
              📊 Živý scoreboard
            </Link>
          </div>
        </div>
      </div>

      <div className="share-link">
        <span>Share link</span>
        <input value={shareUrl} readOnly />
        <button onClick={handleCopyShare}>Kopírovat</button>
      </div>

      <section className="top-three">
        {topPlayers.map((player, index) => {
          const stats = playerStatsMap.get(player.id);
          const badges = ["🥇", "🥈", "🥉"];
          return (
            <article key={player.id} className={`podium podium-${index}`}>
              <span className="podium__medal">{badges[index]}</span>
              <h3>{player.name}</h3>
              <p className="podium__score">{player.score || 0} bodů</p>
              <p className="subtext">Přesnost {stats?.accuracy || 0}%</p>
            </article>
          );
        })}
      </section>

      <section className="results-grid">
        <article className="stat-card">
          <h4>Počet hráčů</h4>
          <p className="stat-card__value">{players.length}</p>
        </article>
        <article className="stat-card">
          <h4>Počet otázek</h4>
          <p className="stat-card__value">{questions.length}</p>
        </article>
        <article className="stat-card">
          <h4>Průměrná úspěšnost</h4>
          <p className="stat-card__value">{totalAccuracy}%</p>
        </article>
        {speedWinner && (
          <article className="stat-card">
            <h4>Nejrychlejší hráč</h4>
            <p className="stat-card__value">{speedWinner.player.name}</p>
            <p className="subtext">Speed výhry: {speedWinner.speedWins}</p>
          </article>
        )}
        {accuracyKing && (
          <article className="stat-card">
            <h4>Accuracy king</h4>
            <p className="stat-card__value">{accuracyKing.player.name}</p>
            <p className="subtext">{accuracyKing.accuracy}% správně</p>
          </article>
        )}
        {mostImproved && (
          <article className="stat-card">
            <h4>Největší zlepšení</h4>
            <p className="stat-card__value">{mostImproved.player.name}</p>
            <p className="subtext">+{mostImproved.delta} % v druhé půlce</p>
          </article>
        )}
      </section>

      {perfectPlayers.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <h2>Hráči s perfektním během</h2>
          </div>
          <div className="tag-row">
            {perfectPlayers.map((player) => (
              <span key={player.id} className="tag">
                {player.name}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-header">
          <h2>Statistika otázek</h2>
          <p className="subtext">
            Nejtěžší: {hardestQuestion?.question?.title || "—"} • Nejlehčí:
            {" "}
            {easiestQuestion?.question?.title || "—"}
          </p>
        </div>
        <div className="question-accuracy-list">
          {questionStats.map((item, index) => {
            const title =
              item.question.title ||
              item.question.prompt ||
              item.question.text ||
              "Bez názvu";
            return (
              <div key={item.question.id} className="question-accuracy-item">
                <div>
                  <p>
                    <strong>Q{index + 1}:</strong> {title}
                  </p>
                  <p className="subtext">
                    {item.correct}/{item.total} správně ({item.accuracy}%)
                  </p>
                </div>
                <div className="bar">
                  <div style={{ width: `${item.accuracy}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="type-distribution">
          {Object.entries(typeDistribution).map(([type, count]) => (
            <span key={type} className="tag">
              {type.toUpperCase()} – {count}x
            </span>
          ))}
        </div>
      </section>

      {teamResults.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <h2>Týmové výsledky</h2>
            <p className="subtext">Pořadí, přesnost a průměrné body na hráče.</p>
          </div>
          <div className="team-results">
            {teamResults.map((team, index) => (
              <article key={team.id} className="team-card">
                <header>
                  <h3>
                    #{index + 1} {team.name}
                  </h3>
                  <span>{team.score || 0} bodů</span>
                </header>
                <div className="bar">
                  <div
                    style={{
                      width: maxTeamScore ? `${(team.score / maxTeamScore) * 100}%` : "0%",
                      background: team.color || "#38bdf8",
                    }}
                  />
                </div>
                <p className="subtext">
                  Přesnost {team.accuracy}% • Průměr na hráče {team.avgScore} bodů
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </NeonLayout>
  );
}
