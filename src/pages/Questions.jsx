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
  multi: "✅",
  number: "🔢",
  arrange: "🔁",
};

export default function Questions() {
  const { roomCode } = useParams();

  const [questionType, setQuestionType] = useState("abc");
  const [imageMode, setImageMode] = useState("abc");

  const [title, setTitle] = useState("");

  // Shared option fields
  const [opt1, setOpt1] = useState("");
  const [opt2, setOpt2] = useState("");
  const [opt3, setOpt3] = useState("");
  const [opt4, setOpt4] = useState("");

  // ABC / IMAGE-ABC
  const [correctIndex, setCorrectIndex] = useState("0");

  // OPEN + IMAGE-OPEN
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
  const [toleranceType, setToleranceType] = useState("absolute");

  // IMAGE
  const [imageFile, setImageFile] = useState(null);

  // ARRANGE
  const [arrangeText, setArrangeText] = useState("");

  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);

  // Load questions (realtime)
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
    return await getDownloadURL(storageRef);
  };

  const buildOptionsArray = () => {
    return [opt1, opt2, opt3, opt4]
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  // SAVE QUESTION
  const handleAddQuestion = async () => {
    if (!title.trim()) {
      alert("Zadej text otázky.");
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();
      const qRef = doc(
        collection(db, "quizRooms", roomCode, "questions")
      );
      const id = qRef.id;

      let imageUrl = null;
      if (questionType === "image") {
        imageUrl = await uploadImageIfNeeded();
        if (!imageUrl) {
          alert("Vyber soubor obrázku.");
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

      // ABC
      if (questionType === "abc") {
        const options = buildOptionsArray();
        if (options.length < 2) {
          alert("Vyplň alespoň dvě možnosti.");
          setSaving(false);
          return;
        }
        const idx = Number(correctIndex);
        if (idx < 0 || idx >= options.length) {
          alert("Vyber správnou odpověď.");
          setSaving(false);
          return;
        }

        payload = { ...base, options, correctAnswer: idx };
      }

      // OPEN
      else if (questionType === "open") {
        if (!openCorrect.trim()) {
          alert("Zadej správnou odpověď.");
          setSaving(false);
          return;
        }
        payload = { ...base, options: [], correctAnswer: openCorrect.trim() };
      }

      // SPEED
      else if (questionType === "speed") {
        payload = { ...base, options: [], correctAnswer: "" };
      }

      // IMAGE
      else if (questionType === "image") {
        if (imageMode === "abc") {
          const options = buildOptionsArray();
          if (options.length < 2) {
            alert("Vyplň alespoň dvě možnosti.");
            setSaving(false);
            return;
          }
          const idx = Number(correctIndex);
          payload = {
            ...base,
            options,
            correctAnswer: idx,
            imageMode: "abc",
          };
        } else {
          if (!openCorrect.trim()) {
            alert("Zadej správnou odpověď.");
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
      }

      // MULTI-SELECT
      else if (questionType === "multi") {
        const options = buildOptionsArray();
        const correctIndices = Object.entries(multiCorrect)
          .filter(([i, v]) => v)
          .map(([i]) => Number(i))
          .filter((i) => i < options.length);

        if (options.length < 2) {
          alert("Vyplň alespoň dvě možnosti.");
          setSaving(false);
          return;
        }
        if (correctIndices.length === 0) {
          alert("Vyber aspoň jednu správnou odpověď.");
          setSaving(false);
          return;
        }

        payload = {
          ...base,
          options,
          correctAnswer: correctIndices,
        };
      }

      // NUMBER
      else if (questionType === "number") {
        const num = Number(numberCorrect);
        const tol = Number(tolerance);

        if (!Number.isFinite(num)) {
          alert("Zadej platné číslo jako správnou odpověď.");
          setSaving(false);
          return;
        }

        if (!Number.isFinite(tol) || tol < 0) {
          alert("Tolerance musí být nezáporné číslo.");
          setSaving(false);
          return;
        }

        payload = {
          ...base,
          options: [],
          correctAnswer: num,
          tolerance: tol,
          toleranceType,
        };
      }

      // ARRANGE
      else if (questionType === "arrange") {
        const lines = arrangeText
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        if (lines.length < 2) {
          alert("Zadej aspoň dvě položky.");
          setSaving(false);
          return;
        }

        payload = {
          ...base,
          options: lines,
          correctAnswer: lines.map((_, i) => i),
        };
      }

      await setDoc(qRef, payload);
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Chyba při ukládání otázky.");
    } finally {
      setSaving(false);
    }
  };

  // MULTI TOGGLE
  const toggleMulti = (i) => {
    setMultiCorrect((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  // TYPE SPECIFIC FIELDS RENDER
  const renderFields = () => {
    // Generic input for options
    const OptionsInput = () => (
      <div className="form-section">
        <label className="form-label">Možnosti odpovědí</label>
        <input
          className="form-input"
          value={opt1}
          onChange={(e) => setOpt1(e.target.value)}
          placeholder="Možnost 1"
        />
        <input
          className="form-input"
          value={opt2}
          onChange={(e) => setOpt2(e.target.value)}
          placeholder="Možnost 2"
        />
        <input
          className="form-input"
          value={opt3}
          onChange={(e) => setOpt3(e.target.value)}
          placeholder="Možnost 3 (volitelné)"
        />
        <input
          className="form-input"
          value={opt4}
          onChange={(e) => setOpt4(e.target.value)}
          placeholder="Možnost 4 (volitelné)"
        />
      </div>
    );

    // ABC
    if (questionType === "abc")
      return (
        <>
          <OptionsInput />
          <div className="form-section">
            <label className="form-label">Správná odpověď</label>
            <select
              className="form-select"
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
      );

    // OPEN
    if (questionType === "open")
      return (
        <div className="form-section">
          <label className="form-label">Správná odpověď</label>
          <input
            className="form-input"
            value={openCorrect}
            onChange={(e) => setOpenCorrect(e.target.value)}
            placeholder="Správná odpověď"
          />
        </div>
      );

    // SPEED
    if (questionType === "speed")
      return (
        <p style={{ fontSize: 13, opacity: 0.8 }}>
          ⚡ Speed otázka — odpovídá se podle rychlosti.
        </p>
      );

    // IMAGE
    if (questionType === "image")
      return (
        <>
          <div className="form-section">
            <label className="form-label">Obrázek</label>
            <input type="file" onChange={(e) => setImageFile(e.target.files[0])} />
          </div>

          <div className="form-section">
            <label className="form-label">Režim odpovědi</label>
            <select
              className="form-select"
              value={imageMode}
              onChange={(e) => setImageMode(e.target.value)}
            >
              <option value="abc">Výběr z možností</option>
              <option value="open">Otevřená odpověď</option>
            </select>
          </div>

          {imageMode === "abc" ? (
            <>
              <OptionsInput />
              <div className="form-section">
                <label className="form-label">Správná odpověď</label>
                <select
                  className="form-select"
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
            <div className="form-section">
              <label className="form-label">Správná odpověď</label>
              <input
                className="form-input"
                value={openCorrect}
                onChange={(e) => setOpenCorrect(e.target.value)}
                placeholder="Správná odpověď"
              />
            </div>
          )}
        </>
      );

    // MULTI
    if (questionType === "multi")
      return (
        <>
          <OptionsInput />

          <div className="form-section">
            <label className="form-label">Správné odpovědi</label>

            {[0, 1, 2, 3].map((i) => (
              <label
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: buildOptionsArray().length > i ? 1 : 0.4,
                }}
              >
                <input
                  type="checkbox"
                  disabled={buildOptionsArray().length <= i}
                  checked={multiCorrect[i]}
                  onChange={() => toggleMulti(i)}
                />
                {i + 1}. možnost
              </label>
            ))}
          </div>
        </>
      );

    // NUMBER
    if (questionType === "number")
      return (
        <>
          <div className="form-section">
            <label className="form-label">Správné číslo</label>
            <input
              className="form-input"
              value={numberCorrect}
              type="number"
              onChange={(e) => setNumberCorrect(e.target.value)}
            />
          </div>

          <div className="form-section">
            <label className="form-label">Tolerance</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                className="form-input"
                value={tolerance}
                type="number"
                onChange={(e) => setTolerance(e.target.value)}
              />
              <select
                className="form-select"
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

    // ARRANGE
    if (questionType === "arrange")
      return (
        <div className="form-section">
          <label className="form-label">Položky (každá na nový řádek)</label>
          <textarea
            className="form-textarea"
            value={arrangeText}
            onChange={(e) => setArrangeText(e.target.value)}
          />
        </div>
      );
  };

  return (
    <NeonLayout>
      <div className="neon-card" style={{ maxWidth: 580, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>➕ Manuální otázky</h1>

          <Link
            to={`/host/${roomCode}/dashboard`}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              background: "rgba(15,23,42,0.8)",
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.4)",
              color: "white",
              textDecoration: "none",
            }}
          >
            ← Zpět
          </Link>
        </div>

        {/* TYPE */}
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

        {/* TITLE */}
        <div className="form-section">
          <label className="form-label">Text otázky</label>
          <input
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Např. Kdy vznikla Česká republika?"
          />
        </div>

        {/* TYPE SPECIFIC */}
        {renderFields()}

        {/* SAVE BUTTON */}
        <button
          onClick={handleAddQuestion}
          disabled={saving}
          className="neon-btn"
          style={{ marginTop: 20, width: "100%" }}
        >
          {saving ? "Ukládám..." : "💾 Uložit otázku"}
        </button>

        {/* LIST */}
        <div style={{ marginTop: 24 }}>
          <h2 className="section-title">Aktuální otázky</h2>

          {questions.length === 0 && (
            <p style={{ fontSize: 13, opacity: 0.7 }}>
              Zatím žádné otázky...
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {questions.map((q) => (
              <div key={q.id} className="question-item">
                <div>
                  <div style={{ fontSize: 14 }}>
                    {TYPE_ICONS[q.type]} {q.title}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    Typ: {TYPE_LABELS[q.type]} • ID: {q.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </NeonLayout>
  );
}






