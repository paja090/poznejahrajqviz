// components/NeonLayout.jsx
export default function NeonLayout({ children, maxWidth = 480 }) {
  return (
    <div className="neon-bg">
      <div className="neon-particles" />
      <div className="neon-content">
        <div
          style={{
            maxWidth,
            margin: "0 auto",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
