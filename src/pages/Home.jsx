import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420 }}>
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
          Vytvoř místnost, přidej otázky a zahrajte si živý kvíz jako Kahoot.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Link
            to="/create"
            style={{
              padding: "14px 22px",
              background:
                "linear-gradient(45deg,#a855f7,#ec4899,#00e5a8)",
              borderRadius: 999,
              textDecoration: "none",
              fontSize: 18,
              fontWeight: 600,
              color: "#020617",
              boxShadow: "0 0 20px rgba(236,72,153,0.6)",
            }}
          >
            🎮 Vytvořit místnost
          </Link>

          <Link
            to="/join"
            style={{
              padding: "14px 22px",
              background: "rgba(15,23,42,0.9)",
              borderRadius: 999,
              textDecoration: "none",
              fontSize: 16,
              fontWeight: 600,
              border: "1px solid rgba(148,163,184,0.5)",
              color: "white",
            }}
          >
            🔑 Připojit se ke hře
          </Link>
        </div>
      </div>
    </div>
  );
}


