// components/BrandLogo.jsx
// Centralized logo rendering – now using /public/rebuss.png

export default function BrandLogo({ size = 160, className = "" }) {
  return (
    <img
      src="/rebuss.png"
      alt="REBUSS logo"
      className={`brand-logo ${className}`}
      style={{
        maxWidth: size,
        maxHeight: size * 0.45,
        objectFit: "contain",
      }}
    />
  );
}

