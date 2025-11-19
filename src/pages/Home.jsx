// pages/Home.jsx
import { Link } from "react-router-dom";
import NeonLayout from "../components/NeonLayout";
import reboosLogo from "../assets/reboos-logo.svg";

export default function Home() {
  return (
    <NeonLayout>
      <div className="neon-card" style={{ textAlign: "center" }}>
        <img
          src={reboosLogo}
          alt="REBOOS logo"
          className="home-logo"
        />
        <h1
          style={{
            fontSize: 34,
            marginBottom: 18,
            fontWeight: 800,
            background:
              "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Poznej & Hraj – Quiz App
        </h1>

        <p style={{ marginBottom: 34, opacity: 0.75, fontSize: 15 }}>
          Vytvoř místnost, přidej otázky a zahrajte si živý kvíz jako Kahoot –
          ale v neon cyber stylu.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Link
            to="/create"
            className="neon-btn"
            style={{
              display: "block",
              textDecoration: "none",
              fontSize: 18,
              textAlign: "center",
            }}
          >
            🎮 Vytvořit místnost
          </Link>

          <Link
            to="/join"
            style={{
              padding: "14px 22px",
              borderRadius: 999,
              textDecoration: "none",
              fontSize: 16,
              fontWeight: 600,
              border: "1px solid rgba(148,163,184,0.5)",
              color: "white",
              background: "rgba(15,23,42,0.9)",
            }}
          >
            🔑 Připojit se ke hře
          </Link>
        </div>
      </div>
    </NeonLayout>
  );
}


