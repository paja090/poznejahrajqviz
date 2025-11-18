// pages/SelectQuestions.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import NeonLayout from "../components/NeonLayout";

const TYPE_ICONS = {
  abc: "🅰",
  open: "✏️",
  image: "🖼️",
  speed: "⚡",
  multi: "✅",
  number: "🔢",
  arrange: "🔁",
};

const TYPE_LABELS = {
  abc: "ABC",
  open: "Otevřená",
  image: "Obrázková",
  speed: "Speed",
  multi: "Multi-select",
  number: "Číselná",
  arrange: "Seřazení",
};

export default function SelectQuestions() {
  const { roomCode } = useParams();

  const [bankQuestions, setBankQuestions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadQuestionBank();
  }, []);

  const loadQuestionBank = async () =>
  {
    const snap = await getDocs(collection(db, "questionBank"));
    setBankQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const normalized = (q) => {
    const now = Date.now();

    return {
      id: q.id,
      title: q.title,
      type: q.type,
      options: q.options || null,
      correctAnswer: q.correctAnswer ?? null,
      imageUrl: q.imageUrl ?? null,

      // Pro IMAGE typ – jestli máš v bankách imageMode
      imageMode: q.imageMode || null,

      // Pro NUMBER typ – pokud existuje
      tolerance: q.tolerance || null,
      toleranceType: q.toleranceType || null,

      order: now,
      createdAt: now,
      category: q.category || "other",
      difficulty: q.difficulty || "normal",
    };
  };

  const addOne = async (q) => {
    setLoading(true);
    try {
      const payload = normalized(q);
      await setDoc(
        doc(db, "quizRooms", roomCode, "questions", q.id),
        payload
      );
      alert(`Otázka "${q.title}" byla přidána.`);
    } catch (err) {
      console.error(err);
      alert("Chyba při ukládání.");
    }
    setLoading(false);
  };

  const importCategory = async (category) => {
    if (!window.confirm(`Opravdu chceš importovat kategorii "${category}"?`))
      return;

    setImporting(true);

    try {
      const items = bankQuestions.filter((q) => q.category === category);
      if (items.length === 0) {
        alert("Tato kategorie je prázdná.");
        setImporting(false);
        return;
      }

      const batch = writeBatch(db);
      const now = Date.now();

      items.forEach((q) => {
        const ref = doc(
          db,
          "quizRooms",
          roomCode,
          "questions",
          q.id
        );

        const data = normalized(q);
        data.order = now + Math.random(); // malé rozhození pořadí
        batch.set(ref, data);
      });

      await batch.commit();

      alert(`Kategorie "${category}" byla úspěšně importována.`);
    } catch (err) {
      console.error(err);
      alert("Chyba při hromadném importu.");
    }

    setImporting(false);
  };

  const filteredQuestions =
    filter === "all"
      ? bankQuestions
      : bankQuestions.filter((q) => q.type === filter);

  const categories = Array.from(new Set(bankQuestions.map((q) => q.category)));

  return (
    <NeonLayout>
      <div className="neon-card" style={{ maxWidth: 700, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              background:
                "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            📚 Výběr otázek – místnost {roomCode}
          </h1>

          <Link
            to={`/host/${roomCode}/dashboard`}
            style={{
              textDecoration: "none",
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.6)",
              color: "white",
            }}
          >
            ← Zpět
          </Link>
        </div>

        {/* Filtr */}
        <div className="form-section">
          <label className="form-label">Filtrovat typ:</label>
          <select
            className="form-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Vše</option>
            <option value="abc">ABC</option>
            <option value="open">Otevřené</option>
            <option value="image">Obrázkové</option>
            <option value="speed">Speed</option>
            <option value="multi">Multi-select</option>
            <option value="number">Číselné</option>
            <option value="arrange">Seřazení</option>
          </select>
        </div>

        {/* Hromadný import podle kategorií */}
        <div className="form-section" style={{ marginTop: 20 }}>
          <label className="form-label">Hromadný import kategorií:</label>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 4,
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                className="neon-btn"
                disabled={importing}
                style={{
                  padding: "6px 12px",
                  fontSize: 13,
                  borderRadius: 10,
                }}
                onClick={() => importCategory(cat)}
              >
                📥 {cat}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <h2 className="section-title">Otázky v databázi</h2>

          {filteredQuestions.length === 0 && (
            <p style={{ fontSize: 13, opacity: 0.7 }}>Žádné otázky.</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredQuestions.map((q) => (
              <div key={q.id} className="question-item">
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {TYPE_ICONS[q.type]} {q.title}
                  </div>

                  <div
                    style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}
                  >
                    Typ: {TYPE_LABELS[q.type]} • Kategorie: {q.category} •
                    ID: {q.id}
                  </div>
                </div>

                <button
                  className="neon-btn"
                  style={{ padding: "6px 12px", fontSize: 13 }}
                  disabled={loading}
                  onClick={() => addOne(q)}
                >
                  ➕ Přidat
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </NeonLayout>
  );
}


