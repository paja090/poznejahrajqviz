// pages/Questions.jsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebaseConfig";
import NeonLayout from "../components/NeonLayout";

const TYPE_LABELS = {
  abc: "ABC",
  open: "Otevřená",
  speed: "Speed",
  image: "Obrázková",
  multi: "Multi-select",
  number: "Číselná",
  arrange: "Seřazení",
};

const TYPE_ICONS = {
  abc: "🅰",
  open: "✏️",
  speed: "⚡",
  image: "🖼️",
  multi: "✅✅",
  number: "🔢",
  arrange: "🔁",
};

export default function Questions() {
  const { roomCode } = useParams();

  const [questionType, setQuestionType] = useState("abc");
  const [imageMode, setImageMode] = useState("abc"); // "abc" | "open"

  const [title, setTitle] = useState("");

  // společné options (použijeme pro abc / multi / image-abc)
  const [opt1, setOpt1] = useState("");
  const [opt2, setOpt2] = useState("");
  const [opt3, setOpt3] = useState("");
  const [opt4, setOpt4] = useState("");

  // ABC
  const [correctIndex, setCorrectIndex] = useState("0");

  // OPEN
  const [openCorrect, setOpenCorrect] = useState("");

  // MULTI
  const [multiCorrect, setMultiCorrect] = useState({
    0: false,
    1: false,
    2: false,
    3: false,
  });

  // NUMBER
  const [numberCorrect, setNumberCorrect] = useState("");
  const [tolerance, setTolerance] = useState("1");
  const [toleranceType, setToleranceType] = useState("absolute"); // "absolute" | "percent"

  // IMAGE
  const [imageFile, setImageFile] = useState(null);

  // ARRANGE
  const [arrangeText, setArrangeText] = useState("");

  // existující otázky v místnosti
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);

  // realtime seznam otázek
  useEffect(() => {
    const qCol = query(
      collection(db, "quizRooms", roomCode, "questions"),
      orderBy("order", "asc")
    );

    const unsub = onSnapshot(qCol, (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [roomCode]);

  const resetForm = () => {
    setTitle("");
    setOpt1("");
    setOpt2("");
    setOpt3("");
    setOpt4("");
    setCorrectIndex("0");
    setOpenCorrect("");
    setMultiCorrect({ 0: false, 1: false, 2: false, 3: false });
    setNumberCorrect("");
    setTolerance("1");
    setToleranceType("absolute");
    setImageFile(null);
    setArrangeText("");
    setImageMode("abc");
  };

  const uploadImageIfNeeded = async () => {
    if (!imageFile) return null;

    const safeName = imageFile.name.replace(/\s+/g, "_");
    const path = `roomImages/${roomCode}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, imageFile);
    const url = await getDownloadURL(storageRef);
    return url;
  };

  const buildOptionsArray = () => {
    return [opt1, opt2, opt3, opt4]
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const handleAddQuestion = async () => {
    if (!title.trim()) {
      alert("Zadej text otázky.");
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();
      // vytvoříme nový dokument s vlastním id
      const qRef = doc(
        collection(db, "quizRooms", roomCode, "questions")
      );
      const id = qRef.id;

      let imageUrl = null;
      if (questionType === "image") {
        imageUrl = await uploadImageIfNeeded();
        if (!imageUrl) {
          alert("Zvol obrázek pro obrázkovou otázku.");
          setSaving(false);
          return;
        }
      }

      const base = {
        id,
        title: title.trim(),
        type: questionType,
        options: null,
        correctAnswer: null,
        imageUrl: imageUrl || null,
        order: now,
        createdAt: now,
      };

      let payload = { ...base };

      if (questionType === "abc") {
        const options = buildOptionsArray();
        if (options.length < 2) {
          alert("Vyplň alespoň dvě možnosti.");
          setSaving(false);
          return;
        }
        const idx = Number(correctIndex);
        if (Number.isNaN(idx) || idx < 0 || idx >= options.length) {
          alert("Vyber platnou správnou odpověď.");
          setSaving(false);
          return;
        }
        payload = {
          ...base,
          options,
          correctAnswer: idx,
        };
      } else if (questionType === "open") {
        if (!openCorrect.trim()) {
          alert("Zadej správnou odpověď pro otevřenou otázku.");
          setSaving(false);
          return;
        }
        payload = {
          ...base,
          options: [],
          correctAnswer: openCorrect.trim(),
        };
      } else if (questionType === "speed") {
        // speed otázka – odpověď samotná se typicky nepoužívá
        payload = {
          ...base,
          options: [],
          correctAnswer: "",
        };
      } else if (questionType === "image") {
        if (imageMode === "abc") {
          const options = buildOptionsArray();
          if (options.length < 2) {
            alert("Vyplň alespoň dvě možnosti pro obrázkovou ABC otázku.");
            setSaving(false);
            return;
          }
          const idx = Number(correctIndex);
          if (Number.isNaN(idx) || idx < 0 || idx >= options.length) {
            alert("Vyber platnou správnou odpověď.");
            setSaving(false);
            return;
          }
          payload = {
            ...base,
            options,
            correctAnswer: idx,
            imageMode: "abc",
          };
        } else {
          // image + open
          if (!openCorrect.trim()) {
            alert("Zadej správnou odpověď pro obrázkovou otevřenou otázku.");
            setSaving(false);
            return;
          }
          payload = {
            ...base,
            options: [],
            correctAnswer: openCorrect.trim(),
            imageMode: "open",
          };
        }
      } else if (questionType === "multi") {
        const options = buildOptionsArray();
        if (options.length < 2) {
          alert("Vyplň alespoň dvě možnosti pro multi-select.");
          setSaving(false);
          return;
        }
        const correctIndices = Object.entries(multiCorrect)
          .filter(([k, v]) => v)
          .map(([k]) => Number(k))
          .filter((i) => i < options.length);

        if (correctIndices.length === 0) {
          alert("Vyber alespoň jednu správnou odpověď u multi-select otázky.");
          setSaving(false);
          return;
        }

        payload = {
          ...base,
          options,
          correctAnswer: correctIndices, // [1,3,...]
        };
      } else if (questionType === "number") {
        const num = Number(numberCorrect);
        const tol = Number(tolerance);

        if (Number.isNaN(num)) {
          alert("Zadej číselnou správnou odpověď.");
          setSaving(false);
          return;
        }
        if (Number.isNaN(tol) || tol < 0) {
          alert("Tolerance musí být nezáporné číslo.");
          setSaving(false);
          return;
        }

        payload = {
          ...base,
          options: [],
          correctAnswer: num,
          tolerance: tol,
          toleranceType, // "absolute" | "percent"
        };
      } else if (questionType === "arrange") {
        const lines = arrangeText
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        if (lines.length < 2) {
          alert("Zadej alespoň dvě položky (každou na nový řádek).");
          setSaving(false);
          return;
        }

        // pro verzi 2.1: správné pořadí = tak, jak je admin zadal
        const correctOrder = lines.map((_, idx) => idx);

        payload = {
          ...base,
          options: lines,
          correctAnswer: correctOrder,
        };
      }

      await setDoc(qRef, payload);
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Nepodařilo se uložit otázku, zkus to prosím znovu.");
    } finally {
      setSaving(false);
    }
  };

  const toggleMultiCorrect = (index) => {
    setMultiCorrect((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const renderTypeSpecificFields = () => {
    // společné inputy pro options (max 4)
    const renderOptionsInputs = (labelPrefix = "Možnost") => (
      <div style={{ display: "grid", gap: 6 }}>
        <div>
          <label className="neon-label">{labelPrefix} 1</label>
          <input
            className="neon-input"
            value={opt1}
            onChange={(e) => setOpt1(e.target.value)}
            placeholder="Např. Praha"
          />
        </div>
        <div>
          <label className="neon-label">{labelPrefix} 2</label>
          <input
            className="neon-input"
            value={opt2}
            onChange={(e) => setOpt2(e.target.value)}
            placeholder="Např. Brno"
          />
        </div>
        <div>
          <label className="neon-label">{labelPrefix} 3</label>
          <input
            className="neon-input"
            value={opt3}
            onChange={(e) => setOpt3(e.target.value)}
            placeholder="Volitelné"
          />
        </div>
        <div>
          <label className="neon-label">{labelPrefix} 4</label>
          <input
            className="neon-input"
            value={opt4}
            onChange={(e) => setOpt4(e.target.value)}
            placeholder="Volitelné"
          />
        </div>
      </div>
    );

    if (questionType === "abc") {
      const options = buildOptionsArray();
      return (
        <>
          {renderOptionsInputs("Možnost")}
          <div style={{ marginTop: 10 }}>
            <label className="neon-label">Správná odpověď (index)</label>
            <select
              className="neon-input"
              value={correctIndex}
              onChange={(e) => setCorrectIndex(e.target.value)}
            >
              <option value="0">1. možnost</option>
              <option value="1">2. možnost</option>
              <option value="2">3. možnost</option>
              <option value="3">4. možnost</option>
            </select>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              Aktuálně vyplněno {options.length} možností.
            </div>
          </div>
        </>
      );
    }

    if (questionType === "open") {
      return (
        <div style={{ marginTop: 10 }}>
          <label className="neon-label">Správná odpověď</label>
          <input
            className="neon-input"
            value={openCorrect}
            onChange={(e) => setOpenCorrect(e.target.value)}
            placeholder="Např. Karlův most"
          />
        </div>
      );
    }

    if (questionType === "speed") {
      return (
        <p style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
          ⚡ Speed otázka – bodování podle nastavení místnosti. Text otázky
          slouží jen jako popis, odpovědi se vyhodnocují podle rychlosti.
        </p>
      );
    }

    if (questionType === "image") {
      return (
        <>
          <div style={{ marginTop: 10 }}>
            <label className="neon-label">Obrázek</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              style={{ marginTop: 4 }}
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <label className="neon-label">Režim odpovědi</label>
            <select
              className="neon-input"
              value={imageMode}
              onChange={(e) => setImageMode(e.target.value)}
            >
              <option value="abc">Výběr z možností (ABC)</option>
              <option value="open">Otevřená odpověď</option>
            </select>
          </div>

          {imageMode === "abc" ? (
            <>
              {renderOptionsInputs("Možnost")}
              <div style={{ marginTop: 10 }}>
                <label className="neon-label">Správná odpověď (index)</label>
                <select
                  className="neon-input"
                  value={correctIndex}
                  onChange={(e) => setCorrectIndex(e.target.value)}
                >
                  <option value="0">1. možnost</option>
                  <option value="1">2. možnost</option>
                  <option value="2">3. možnost</option>
                  <option value="3">4. možnost</option>
                </select>
              </div>
            </>
          ) : (
            <div style={{ marginTop: 10 }}>
              <label className="neon-label">Správná odpověď (text)</label>
              <input
                className="neon-input"
                value={openCorrect}
                onChange={(e) => setOpenCorrect(e.target.value)}
                placeholder="Např. Národní muzeum"
              />
            </div>
          )}
        </>
      );
    }

    if (questionType === "multi") {
      const options = buildOptionsArray();
      return (
        <>
          {renderOptionsInputs("Možnost")}
          <div style={{ marginTop: 10 }}>
            <label className="neon-label">
              Správné odpovědi (můžeš označit více)
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 6,
                marginTop: 4,
              }}
            >
              {[0, 1, 2, 3].map((idx) => (
                <label
                  key={idx}
                  style={{
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    opacity: idx < options.length ? 1 : 0.4,
                  }}
                >
                  <input
                    type="checkbox"
                    disabled={idx >= options.length}
                    checked={multiCorrect[idx] && idx < options.length}
                    onChange={() => toggleMultiCorrect(idx)}
                  />
                  {idx + 1}. možnost
                </label>
              ))}
            </div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
              Nejprve vyplň text možností, pak označ správné.
            </div>
          </div>
        </>
      );
    }

    if (questionType === "number") {
      return (
        <>
          <div style={{ marginTop: 10 }}>
            <label className="neon-label">Správná číselná odpověď</label>
            <input
              className="neon-input"
              type="number"
              value={numberCorrect}
              onChange={(e) => setNumberCorrect(e.target.value)}
              placeholder="Např. 42"
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="neon-label">Tolerance</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="neon-input"
                style={{ flex: 1 }}
                type="number"
                value={tolerance}
                onChange={(e) => setTolerance(e.target.value)}
                placeholder="Např. 1"
              />
              <select
                className="neon-input"
                style={{ flexBasis: 130 }}
                value={toleranceType}
                onChange={(e) => setToleranceType(e.target.value)}
              >
                <option value="absolute">± jednotek</option>
                <option value="percent">± %</option>
              </select>
            </div>
          </div>
        </>
      );
    }

    if (questionType === "arrange") {
      return (
        <div style={{ marginTop: 10 }}>
          <label className="neon-label">
            Položky k seřazení (každá na nový řádek)
          </label>
          <textarea
            className="neon-input"
            style={{ minHeight: 120 }}
            value={arrangeText}
            onChange={(e) => setArrangeText(e.target.value)}
            placeholder={"Bitva u Slavkova\nPrvní olympiáda\nVznik ČR"}
          />
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
            Ve verzi 2.1 platí: správné pořadí = tak, jak položky zapíšeš.
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <NeonLayout>
      <div className="neon-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 12,
            alignItems: "center",
          }}
        >
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              background:
                "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            ➕ Manuální otázky – místnost {roomCode}
          </h1>
          <Link
            to={`/host/${roomCode}/dashboard`}
            style={{
              fontSize: 13,
              textDecoration: "none",
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.7)",
              color: "white",
            }}
          >
            ← Zpět na dashboard
          </Link>
        </div>

        {/* Výběr typu */}
        <div style={{ marginBottom: 10 }}>
          <label className="neon-label">Typ otázky</label>
          <select
            className="neon-input"
            value={questionType}
            onChange={(e) => {
              setQuestionType(e.target.value);
              // při změně typu necháme title, ale smažeme detailní fields
              setOpt1("");
              setOpt2("");
              setOpt3("");
              setOpt4("");
              setCorrectIndex("0");
              setOpenCorrect("");
              setMultiCorrect({ 0: false, 1: false, 2: false, 3: false });
              setNumberCorrect("");
              setTolerance("1");
              setToleranceType("absolute");
              setImageFile(null);
              setArrangeText("");
              setImageMode("abc");
            }}
          >
            <option value="abc">🅰 ABC</option>
            <option value="open">✏️ Otevřená</option>
            <option value="speed">⚡ Speed</option>
            <option value="image">🖼 Obrázková</option>
            <option value="multi">✅ Multi-select</option>
            <option value="number">🔢 Číselná</option>
            <option value="arrange">🔁 Seřazení</option>
          </select>
        </div>

      {/* Typ otázky */}
<div className="form-section">
  <label className="form-label">Typ otázky</label>
  <select
    className="form-select"
    value={questionType}
    onChange={(e) => setQuestionType(e.target.value)}
  >
    <option value="abc">🅰 ABC</option>
    <option value="open">✏️ Otevřená</option>
    <option value="speed">⚡ Speed</option>
    <option value="image">🖼 Obrázková</option>
    <option value="multi">✅ Multi-select</option>
    <option value="number">🔢 Číselná</option>
    <option value="arrange">🔁 Seřazení</option>
  </select>
</div>

{/* Text otázky */}
<div className="form-section">
  <label className="form-label">Text otázky</label>
  <input
    className="form-input"
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    placeholder="Např. V kterém roce vznikla Česká republika?"
  />
</div>

        {/* Typově specifické údaje */}
        {renderTypeSpecificFields()}

        <button
          onClick={handleAddQuestion}
          disabled={saving}
          className="neon-btn"
          style={{ marginTop: 14, width: "100%" }}
        >
          {saving ? "Ukládám..." : "💾 Uložit otázku do místnosti"}
        </button>

        {/* Existující otázky */}
        <div
          style={{
            marginTop: 18,
            borderTop: "1px solid rgba(148,163,184,0.3)",
            paddingTop: 10,
          }}
        >
          <h2
            style={{
              fontSize: 15,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            Aktuální otázky v místnosti
          </h2>

          {questions.length === 0 && (
            <p style={{ fontSize: 13, opacity: 0.7 }}>
              Zatím žádné otázky – přidej je ručně nebo přes databázi.
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {questions.map((q) => (
              <div
                key={q.id}
                style={{
                  padding: 8,
                  borderRadius: 10,
                  border: "1px solid rgba(148,163,184,0.35)",
                  background: "rgba(15,23,42,0.8)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {TYPE_ICONS[q.type] || "❓"} {q.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.7,
                      marginTop: 2,
                    }}
                  >
                    Typ: {TYPE_LABELS[q.type] || q.type} • ID: {q.id}
                  </div>
                </div>
                {/* Start / delete logika bude řízená z AdminDashboardu */}
              </div>
            ))}
          </div>
        </div>
      </div>
    </NeonLayout>
  );
}





