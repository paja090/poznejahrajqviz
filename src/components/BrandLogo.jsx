// components/BrandLogo.jsx
// Centralized logo rendering so we keep proportions/responsiveness consistent
import reboosLogo from "../assets/reboos-logo.svg";

export default function BrandLogo({ size = 160, className = "" }) {
  return (
    <img
      src={reboosLogo}
      alt="REBOOS wordmark"
      className={`brand-logo ${className}`}
      style={{ maxWidth: size, maxHeight: size * 0.45 }}
    />
  );
}
