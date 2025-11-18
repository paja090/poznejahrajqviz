import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { useParams } from "react-router-dom";

export default function SelectQuestions() {
  const { roomCode } = useParams();

  const [bank, setBank] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const ref = collection(db, "questionBank");
      const snap = await getDocs(ref);
      setBank(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    load();
  }, []);

  const addToRoom = async (q) => {
    await setDoc(
      doc(db, "quizRooms", roomCode, "questions", q.id),
      {
        ...q,
        createdAt: new Date()
      }
    );
    alert(`Otázka "${q.title}" byla přidána.`);
  };

  const filtered = bank.filter((q) => {
    return (
      (categoryFilter === "all" || q.category === categoryFilter) &&
      q.title.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div style={{ padding: 20, color: "white" }}>
      <h1>Vybrat otázky – Místnost {roomCode}</h1>

      {loading && <p>Načítání databáze…</p>}

      {!loading && (
        <>
          {/* Filtry */}
          <div style={{ marginBottom: 20 }}>
            <input
              placeholder="Hledat otázku…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: 10,
                width: "100%",
                marginBottom: 10,
                borderRadius: 8
              }}
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: 10, width: "100%", borderRadius: 8 }}
            >
              <option value="all">Všechny kategorie</option>
              <option value="Historie">Historie</option>
              <option value="Geografie">Geografie</option>
              <option value="Sport">Sport</option>
              <option value="Filmy & Seriály">Filmy & Seriály</option>
              <option value="Hudba">Hudba</option>
            </select>
          </div>

          {/* Seznam otázek */}
          {filtered.map((q) => (
            <div
              key={q.id}
              style={{
                background: "rgba(255,255,255,0.05)",
                padding: 12,
                borderRadius: 8,
                marginBottom: 10
              }}
            >
              <strong>{q.title}</strong>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {q.category} • {q.type.toUpperCase()}
              </div>

              <button
                onClick={() => addToRoom(q)}
                style={{
                  marginTop: 8,
                  padding: 8,
                  borderRadius: 6,
                  background: "lime",
                  cursor: "pointer"
                }}
              >
                ➕ Přidat do místnosti
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
