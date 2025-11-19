import questionBank from "../data/questionBank.json";
import { db } from "../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";

export default function ImportQuestions() {

  const handleImport = async () => {
    for (const q of questionBank.questions) {
      await setDoc(doc(db, "questionBank", q.id), q);
    }
    alert("Otázková banka úspěšně nahraná do Firestore 🎉");
  };

  return (
    <div style={{ padding: 24, color: "white" }}>
      <h1>Import otázkové banky</h1>
      <button
        onClick={handleImport}
        style={{ padding: 12, fontSize: 18, borderRadius: 10 }}
      >
        📥 Nahrát otázky
      </button>
    </div>
  );
}
