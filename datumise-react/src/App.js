import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import api from "./api/api";
import ObservationCreateForm from "./ObservationCreateForm";
import ObservationDetail from "./ObservationDetail";
import ObservationEditForm from "./ObservationEditForm";
import ObservationList from "./ObservationList";
import SurveyList from "./SurveyList";
import SurveyDetail from "./SurveyDetail";
import SurveyCapture from "./SurveyCapture";
import Register from "./Register";
import Login from "./Login";

function Home() {
  return (
    <div className="container mt-5">
      <h1>DATUMise Observations</h1>
      <p>Structured site observations platform.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Derive a screen title from the current pathname                   */
/* ------------------------------------------------------------------ */
function useScreenTitle() {
  const { pathname } = useLocation();

  if (pathname === "/") return "DATUMise";
  if (pathname === "/surveys") return "Surveys";
  if (/^\/surveys\/\d+$/.test(pathname)) return "Survey";
  if (pathname === "/observations") return "Observations";
  if (/^\/observations\/survey\/\d+$/.test(pathname)) return "Observations";
  if (/^\/observations\/\d+$/.test(pathname)) return "Observation";
  if (/^\/observations\/\d+\/edit$/.test(pathname)) return "Edit Observation";
  if (pathname === "/observations/create") return "New Observation";
  if (pathname === "/login") return "Login";
  if (pathname === "/register") return "Register";
  return "DATUMise";
}

/* ------------------------------------------------------------------ */
/*  App layout with responsive nav                                    */
/* ------------------------------------------------------------------ */
function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isCaptureMode = /^\/surveys\/\d+\/capture/.test(location.pathname);
  const screenTitle = useScreenTitle();

  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await api.post("/api/auth/logout/");
    } catch (err) {
      console.log("Logout error:", err.response?.data);
    } finally {
      localStorage.removeItem("token");
      setIsLoggedIn(false);
      window.location.href = "/";
    }
  };

  if (isCaptureMode) {
    return (
      <Routes>
        <Route path="/surveys/:id/capture" element={<SurveyCapture />} />
      </Routes>
    );
  }

  return (
    <>
      {/* ---- Desktop nav (hidden on mobile) ---- */}
      <nav className="app-nav-desktop navbar navbar-light bg-light px-3">
        <Link className="navbar-brand" to="/">DATUMise</Link>
        <Link className="btn btn-outline-dark btn-sm me-2" to="/observations">
          Observations
        </Link>
        <Link className="btn btn-outline-dark btn-sm me-2" to="/surveys">
          Surveys
        </Link>
        <div>
          {isLoggedIn ? (
            <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <>
              <Link className="btn btn-outline-primary btn-sm me-2" to="/login">Login</Link>
              <Link className="btn btn-outline-secondary btn-sm" to="/register">Register</Link>
            </>
          )}
        </div>
      </nav>

      {/* ---- Mobile header (hidden on desktop) ---- */}
      <header className="app-nav-mobile">
        <button
          type="button"
          className="app-nav-icon-btn"
          onClick={() => navigate("/")}
          aria-label="Home"
        >
          <img src="/datumise_home.svg" alt="" width="22" height="22" />
        </button>

        <span className="app-nav-title">{screenTitle}</span>

        <div className="app-nav-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="app-nav-icon-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Menu"
          >
            <img src="/datumise_menu.svg" alt="" width="22" height="22" />
          </button>

          {menuOpen && (
            <div className="app-nav-dropdown">
              <Link to="/surveys" className="app-nav-dropdown-item">
                Surveys
              </Link>
              <Link to="/observations" className="app-nav-dropdown-item">
                Observations
              </Link>
              <div className="app-nav-dropdown-divider" />
              {isLoggedIn ? (
                <button
                  type="button"
                  className="app-nav-dropdown-item app-nav-dropdown-danger"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              ) : (
                <>
                  <Link to="/login" className="app-nav-dropdown-item">
                    Login
                  </Link>
                  <Link to="/register" className="app-nav-dropdown-item">
                    Register
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/observations" element={<ObservationList />} />
        <Route path="/observations/survey/:surveyId" element={<ObservationList />} />
        <Route path="/observations/create" element={<ObservationCreateForm />} />
        <Route path="/observations/:id" element={<ObservationDetail />} />
        <Route path="/observations/:id/edit" element={<ObservationEditForm />} />
        <Route path="/surveys" element={<SurveyList />} />
        <Route path="/surveys/:id" element={<SurveyDetail />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
