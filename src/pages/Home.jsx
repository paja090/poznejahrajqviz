import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#071022",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
        textAlign: "center"
      }}
    >
      <div style={{ maxWidth: 400 }}>
        <h1
          style={{
            fontSize: 36,
            marginBottom: 20,
            fontWeight: 800,
            background: "linear-gradient(45deg, #8b5cf6, #ec4899, #00e5a8)",
            WebkitBackgroundClip: "text",
            color: "transparent"
          }}
        >
          Poznej & Hraj – Quiz App
        </h1>

        <p style={{ marginBottom: 40, opacity: 0.7 }}>
          Připoj se ke hře nebo vytvoř novou místnost.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Link
            to="/create"
            style={{
              padding: "15px 25px",
              background:
                "linear-gradient(45deg, #8b5cf6, #ec4899, #00e5a8)",
              borderRadius: 12,
              textDecoration: "none",
              fontSize: 18,
              fontWeight: 600,
              color: "#071022"
            }}
          >
            🎮 Vytvořit místnost
          </Link>

          <Link
            to="/join"
            style={{
              padding: "15px 25px",
              background: "rgba(255,255,255,0.12)",
              borderRadius: 12,
              textDecoration: "none",
              fontSize: 18,
              fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white"
            }}
          >
            🔑 Připojit se ke hře
          </Link>
        </div>
      </div>
    </div>
  );
}
