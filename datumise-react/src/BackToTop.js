import { useEffect, useState } from "react";

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="d-md-none"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        border: "none",
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <img src="/datumise-down-chev.svg" alt="" width="18" height="18" style={{ transform: "rotate(180deg)", filter: "brightness(0) invert(1)" }} />
    </button>
  );
}

export default BackToTop;
