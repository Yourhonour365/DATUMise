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
      className="d-md-none mobile-fab mobile-fab--top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
    >
      <img src="/datumise-down-chev.svg" alt="" width="18" height="18" style={{ transform: "rotate(180deg)", filter: "brightness(0) invert(1)" }} />
    </button>
  );
}

export default BackToTop;
