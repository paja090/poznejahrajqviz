import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";

export default function SelectQuestions() {
  const { roomCode } = useParams();

  const [bankQuestions, setBankQuestions] = useState([]);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("all");

  // Načti otázkovou banku
  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "questionBank"));
      setBankQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    load();
  }, []);

  // Přidání otázky do místnosti
  const addToRoom = async (q) => {
    setAdding(true);

    const payload = {
      id: q.id,
      title: q.title,
      type: q.type,
      options: q.options || [],
      correctAnswer: q.correctAnswer || null,
      imageUrl: q.imageUrl || null,
      category: q.category || null,
      difficulty: q.difficulty || "easy",

      // DŮLEŽITÉ – díky tomu AdminDashboard návratí otázku!
      order: Date.now(),
      createdAt: Date.now(),
    };

    await setDoc(
      doc(db, "quizRooms", roomCode, "questions", q.id),
      payload
    );

    alert(`Otázka "${q.title}" byla přidána do místnosti.`);
    setAdding(false);
  };

  // Filtrace
  const filteredQuestions =
    filter === "all"
      ? bankQuestions
      : bankQuestions.filter((q) => q.type === filter);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>📚 Výběr otázek – místnost {roomCode}</h1>

        <Link to={`/host/${roomCode}/dashboard`} style={styles.backLink}>
          ← Zpět na moderátorský dashboard
        </Link>

        {/* FILTR */}
        <div style={styles.filterBox}>
          <label style={styles.label}>Filtrovat typ:</label>
          <select
            style={styles.select}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Vše</option>
            <option value="abc">ABC otázky</option>
            <option value="open">Otevřené</option>
            <option value="image">Obrázkové</option>
          </select>
        </div>

        <div style={styles.list}>
          {filteredQuestions.map((q) => (
            <div key={q.id} style={styles.questionBox}>
              <div style={styles.questionTitle}>
                <strong>{q.title}</strong>
              </div>

              <div style={styles.meta}>
                Typ:{" "}
                {q.type === "abc"
                  ? "ABC"
                  : q.type === "open"
                  ? "Otevřená"
                  : "Obrázková"}
                {"  "}
                • Kategorie: {q.category}
              </div>

              {q.type === "abc" && (
                <div style={styles.optionsBox}>
                  <div>A: {q.options?.[0]}</div>
                  <div>B: {q.options?.[1]}</div>
                  <div>C: {q.options?.[2]}</div>
                </div>
              )}

              {q.type === "open" && (
                <div style={styles.optionsBox}>
                  Správná odpověď: {q.correctAnswer}
                </div>
              )}

              {q.type === "image" && (
                <div style={styles.imgPreview}>
                  <img src={q.imageUrl} alt="preview" />
                </div>
              )}

              <button
                style={styles.addBtn}
                onClick={() => addToRoom(q)}
                disabled={adding}
              >
                ➕ Přidat do místnosti
              </button>
            </div>
          ))}

          {filteredQuestions.length === 0 && (
            <p>V databázi nejsou žádné otázky.</p>
          )}
        </div>

        {/* TLAČÍTKO NA RUČNÍ PŘIDÁNÍ */}
        <Link
          to={`/host/${roomCode}/questions`}
          style={styles.manualButton}
        >
          ➕ Přidat otázku ručně
        </Link>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#020617",
    color: "white",
    padding: 20,
    fontFamily: "Inter, sans-serif",
  },
  container: {
    maxWidth: 800,
    margin: "0 auto",
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    marginBottom: 10,
  },
  backLink: {
    color: "#8b9dfd",
    display: "inline-block",
    marginBottom: 14,
    textDecoration: "none",
  },
  filterBox: {
    marginBottom: 20,
    background: "rgba(255,255,255,0.05)",
    padding: 12,
    borderRadius: 12,
  },
  label: {
    marginRight: 8,
  },
  select: {
    background: "#0f172a",
    color: "white",
    padding: 6,
    borderRadius: 6,
    border: "1px solid #475569",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  questionBox: {
    background: "rgba(255,255,255,0.05)",
    padding: 14,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
  },
  questionTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  meta: {
    opacity: 0.7,
    fontSize: 13,
    marginBottom: 6,
  },
  optionsBox: {
    fontSize: 13,
    opacity: 0.85,
    marginBottom: 8,
  },
  imgPreview: {
    margin: "8px 0",
  },
  addBtn: {
    padding: "8px 12px",
    background: "linear-gradient(45deg,#22c55e,#16a34a)",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    color: "#071022",
    fontWeight: 600,
    width: "100%",
    marginTop: 8,
  },
  manualButton: {
    display: "block",
    marginTop: 20,
    padding: 12,
    textAlign: "center",
    background: "linear-gradient(45deg,#a855f7,#ec4899)",
    borderRadius: 10,
    color: "white",
    textDecoration: "none",
    fontWeight: 700,
  },
};

