// pages/CreateEvent.jsx
// Form to schedule a new event
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebaseConfig";
import NeonLayout from "../components/NeonLayout";
import BrandLogo from "../components/BrandLogo";

export default function CreateEvent() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name || !date) {
      alert("Vyplň název a datum.");
      return;
    }
    setSubmitting(true);
    try {
      let finalImageUrl = imageUrl.trim() || null;
      if (!finalImageUrl && imageFile) {
        const storageRef = ref(
          storage,
          `events/${Date.now()}_${imageFile.name.replace(/\s+/g, "-")}`
        );
        await uploadBytes(storageRef, imageFile);
        finalImageUrl = await getDownloadURL(storageRef);
      }

      const docRef = await addDoc(collection(db, "events"), {
        name,
        date,
        description,
        image: finalImageUrl,
        createdAt: serverTimestamp(),
        createdBy: "admin-dashboard",
      });

      navigate(`/events/${docRef.id}`);
    } catch (error) {
      console.error(error);
      alert("Nepodařilo se uložit událost.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <NeonLayout maxWidth={720}>
      <form className="neon-card" onSubmit={handleSubmit}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <BrandLogo size={180} />
          <h1 style={{ marginBottom: 4 }}>Nová událost</h1>
          <p className="subtext">
            Naplánuj profesionální show dopředu. Události udrží otázky, nastavení i
            výsledky.
          </p>
        </div>

        <label className="form-label">Název</label>
        <input
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Např. Firemní večírek"
        />

        <label className="form-label">Datum</label>
        <input
          type="date"
          className="form-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <label className="form-label">Popis</label>
        <textarea
          className="form-input"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Krátké shrnutí eventu"
        />

        <label className="form-label">Obrázek (URL)</label>
        <input
          className="form-input"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
        />

        <label className="form-label">nebo nahrát soubor</label>
        <input
          className="form-input"
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
        />

        <button type="submit" className="neon-btn" disabled={submitting}>
          {submitting ? "Ukládám…" : "💾 Uložit událost"}
        </button>
      </form>
    </NeonLayout>
  );
}
