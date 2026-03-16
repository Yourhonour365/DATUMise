import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import api from "./api/api";
import ObservationDetail from "./ObservationDetail";
import ObservationList from "./ObservationList";
import SurveyList from "./SurveyList";
import SurveyDetail from "./SurveyDetail";
import SurveyCapture from "./SurveyCapture";
import SurveyCreateForm from "./SurveyCreateForm";
import SurveyEditForm from "./SurveyEditForm";
import Register from "./Register";
import Login from "./Login";
import ClientList from "./ClientList";
import ClientDetail from "./ClientDetail";
import SiteList from "./SiteList";
import SiteDetail from "./SiteDetail";
import SiteEditForm from "./SiteEditForm";
import TeamList from "./TeamList";
import TeamDetail from "./TeamDetail";
import TeamEditForm from "./TeamEditForm";
import ClientEditForm from "./ClientEditForm";
import Filters from "./Filters";
import Settings from "./Settings";
import QuickAdd from "./QuickAdd";
import ClientCreateForm from "./ClientCreateForm";
import SiteCreateForm from "./SiteCreateForm";
import TeamCreateForm from "./TeamCreateForm";
import { FilterProvider } from "./FilterContext";

function Home({ isLoggedIn }) {
  if (!isLoggedIn) {
    return (
      <div className="container px-3 d-flex flex-column align-items-center" style={{ paddingTop: "15vh" }}>
        <img src="/datumise-icon.svg" alt="DATUMise" width="72" height="72" className="mb-3" />
        <h4 className="fw-bold mb-1">DATUMise</h4>
        <p className="fw-semibold text-muted mb-3" style={{ fontSize: "0.95rem" }}>
          Smarter Field Data. Faster.
        </p>
        <p className="text-center text-muted mb-4" style={{ fontSize: "0.85rem", maxWidth: "360px", lineHeight: 1.5 }}>
          Capture observations in the field and organise them into structured surveys.
          Images, notes, and comments stay linked to the site and survey, creating a clear
          record that teams can review, discuss, and act on.
        </p>
        <p className="text-muted mb-4" style={{ fontSize: "0.78rem", fontStyle: "italic" }}>
          Built for mobile-first fieldwork.
        </p>
        <div className="d-flex gap-3">
          <Link to="/login" className="btn btn-primary px-4">Login</Link>
          <Link to="/register" className="btn btn-outline-secondary px-4">Register</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4 px-3">
      <div className="dashboard-grid">
        <Link to="/quick-add" className="dashboard-tile">
          <img src="/datumise-add.svg" alt="" width="28" height="28" />
          <span>Quick Add</span>
        </Link>
        <Link to="/clients" className="dashboard-tile">
          <img src="/datumise-clients.svg" alt="" width="28" height="28" />
          <span>Clients</span>
        </Link>
        <Link to="/filters" className="dashboard-tile">
          <img src="/datumise-filter.svg" alt="" width="28" height="28" />
          <span>Filters</span>
        </Link>
        <Link to="/observations" className="dashboard-tile">
          <img src="/datumise-observations.svg" alt="" width="28" height="28" />
          <span>Observations</span>
        </Link>
        <Link to="/sites" className="dashboard-tile">
          <img src="/datumise-sites.svg" alt="" width="28" height="28" />
          <span>Sites</span>
        </Link>
        <Link to="/surveys" className="dashboard-tile">
          <img src="/datumise-surveys.svg" alt="" width="28" height="28" />
          <span>Surveys</span>
        </Link>
        <Link to="/team" className="dashboard-tile">
          <img src="/datumise-surveyors.svg" alt="" width="28" height="28" />
          <span>Team</span>
        </Link>
        <Link to="/settings" className="dashboard-tile" style={{ order: 999 }}>
          <img src="/datumise-settings.svg" alt="" width="28" height="28" />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Derive a screen title from the current pathname                   */
/* ------------------------------------------------------------------ */
function useScreenTitle() {
  const { pathname } = useLocation();

  if (pathname === "/") return "DATUMise";
  if (pathname === "/clients") return "Clients";
  if (/^\/clients\/\d+$/.test(pathname)) return "Client";
  if (pathname === "/sites") return "Sites";
  if (/^\/sites\/\d+\/edit$/.test(pathname)) return "Edit Site";
  if (/^\/sites\/\d+$/.test(pathname)) return "Site";
  if (pathname === "/surveys") return "Surveys";
  if (pathname === "/surveys/create") return "New Survey";
  if (/^\/surveys\/\d+\/edit$/.test(pathname)) return "Edit Survey";
  if (/^\/surveys\/\d+$/.test(pathname)) return "Survey";
  if (pathname === "/observations") return "Observations";
  if (/^\/observations\/survey\/\d+$/.test(pathname)) return "Observations";
  if (/^\/observations\/\d+$/.test(pathname)) return "Observation";
  if (pathname === "/team") return "Team";
  if (/^\/team\/\d+$/.test(pathname)) return "Team Member";
  if (/^\/team\/\d+\/edit$/.test(pathname)) return "Edit Team Member";
  if (/^\/clients\/\d+\/edit$/.test(pathname)) return "Edit Client";
  if (pathname === "/quick-add") return "Quick Add";
  if (pathname === "/clients/create") return "New Client";
  if (pathname === "/sites/create") return "New Site";
  if (pathname === "/team/create") return "New Team Member";
  if (pathname === "/filters") return "Filters";
  if (pathname === "/settings") return "Settings";
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
      <nav className="app-nav-desktop navbar px-4" style={{ background: "#db440a", borderBottom: "none" }}>
        <Link className="navbar-brand fw-bold" to="/" style={{ color: "#faf6ef" }}>
          DATUMise
        </Link>
        {isLoggedIn && (
          <>
            <Link className="nav-link ms-3" to="/clients" style={{ color: "#faf6ef" }}>
              Clients
            </Link>
            <Link className="nav-link ms-3" to="/filters" style={{ color: "#faf6ef" }}>
              Filters
            </Link>
            <Link className="nav-link ms-3" to="/observations" style={{ color: "#faf6ef" }}>
              Observations
            </Link>
            <Link className="nav-link ms-3" to="/settings" style={{ color: "#faf6ef" }}>
              Settings
            </Link>
            <Link className="nav-link ms-3" to="/sites" style={{ color: "#faf6ef" }}>
              Sites
            </Link>
            <Link className="nav-link ms-3" to="/surveys" style={{ color: "#faf6ef" }}>
              Surveys
            </Link>
            <Link className="nav-link ms-3" to="/team" style={{ color: "#faf6ef" }}>
              Team
            </Link>
          </>
        )}
        <div className="ms-auto">
          {isLoggedIn ? (
            <button className="nav-link btn btn-link" onClick={handleLogout} style={{ color: "#faf6ef" }}>
              Logout
            </button>
          ) : (
            <>
              <Link className="nav-link d-inline" to="/login" style={{ color: "#faf6ef" }}>
                Login
              </Link>
              <Link className="nav-link d-inline ms-3" to="/register" style={{ color: "#faf6ef" }}>
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ---- Mobile header (hidden on desktop) ---- */}
      <header className="app-nav-mobile">
        {isLoggedIn ? (
          <button
            type="button"
            className="app-nav-icon-btn"
            onClick={() => navigate("/")}
            aria-label="Home"
          >
            <img src="/datumise_home.svg" alt="" width="22" height="22" />
          </button>
        ) : (
          <div style={{ width: "22px" }} />
        )}

        <span className="app-nav-title">{screenTitle}</span>

        {isLoggedIn ? (
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
              <Link to="/clients" className="app-nav-dropdown-item">
                Clients
              </Link>
              <Link to="/filters" className="app-nav-dropdown-item">
                Filters
              </Link>
              <Link to="/observations" className="app-nav-dropdown-item">
                Observations
              </Link>
              <Link to="/settings" className="app-nav-dropdown-item">
                Settings
              </Link>
              <Link to="/sites" className="app-nav-dropdown-item">
                Sites
              </Link>
              <Link to="/surveys" className="app-nav-dropdown-item">
                Surveys
              </Link>
              <Link to="/team" className="app-nav-dropdown-item">
                Team
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
        ) : (
          <div style={{ width: "22px" }} />
        )}
      </header>

      <Routes>
        <Route path="/" element={<Home isLoggedIn={isLoggedIn} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/observations" element={<ObservationList />} />
        <Route path="/observations/survey/:surveyId" element={<ObservationList />} />
        <Route path="/observations/:id" element={<ObservationDetail />} />
        <Route path="/quick-add" element={<QuickAdd />} />
        <Route path="/clients" element={<ClientList />} />
        <Route path="/clients/create" element={<ClientCreateForm />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/clients/:id/edit" element={<ClientEditForm />} />
        <Route path="/sites" element={<SiteList />} />
        <Route path="/sites/create" element={<SiteCreateForm />} />
        <Route path="/sites/:id" element={<SiteDetail />} />
        <Route path="/sites/:id/edit" element={<SiteEditForm />} />
        <Route path="/surveys" element={<SurveyList />} />
        <Route path="/surveys/create" element={<SurveyCreateForm />} />
        <Route path="/surveys/:id/edit" element={<SurveyEditForm />} />
        <Route path="/surveys/:id" element={<SurveyDetail />} />
        <Route path="/team" element={<TeamList />} />
        <Route path="/team/create" element={<TeamCreateForm />} />
        <Route path="/team/:id" element={<TeamDetail />} />
        <Route path="/team/:id/edit" element={<TeamEditForm />} />
        <Route path="/filters" element={<Filters />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <FilterProvider>
        <AppLayout />
      </FilterProvider>
    </Router>
  );
}

export default App;
