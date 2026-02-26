import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";
import { useIntl } from "react-intl";
import { LoadingState } from "./components/common";

// ---------------------------------------------------------------------------
// Lazy-loaded page components
// ---------------------------------------------------------------------------

const Dashboard = lazy(() => import("./pages/Dashboard"));
const VocabularyBrowse = lazy(() => import("./pages/VocabularyBrowse"));
const VocabularyReview = lazy(() => import("./pages/VocabularyReview"));
const GrammarLesson = lazy(() => import("./pages/GrammarLesson"));
const Conversation = lazy(() => import("./pages/Conversation"));
const Writing = lazy(() => import("./pages/Writing"));
const Pronunciation = lazy(() => import("./pages/Pronunciation"));
const Listening = lazy(() => import("./pages/Listening"));
const Cultural = lazy(() => import("./pages/Cultural"));
const Profile = lazy(() => import("./pages/Profile"));
const PlacementTest = lazy(() => import("./pages/PlacementTest"));
const ExitExam = lazy(() => import("./pages/ExitExam"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));

// ---------------------------------------------------------------------------
// Navigation configuration
// ---------------------------------------------------------------------------

interface NavItem {
  to: string;
  labelId: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", labelId: "nav.dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
  { to: "/vocabulary", labelId: "nav.vocabulary", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { to: "/grammar", labelId: "nav.grammar", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { to: "/conversation", labelId: "nav.conversation", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { to: "/writing", labelId: "nav.writing", icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" },
  { to: "/pronunciation", labelId: "nav.pronunciation", icon: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" },
  { to: "/listening", labelId: "nav.listening", icon: "M15.536 8.464a5 5 0 010 7.072M12 12h.01M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728" },
  { to: "/cultural", labelId: "nav.cultural", icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
];

// ---------------------------------------------------------------------------
// Sidebar navigation
// ---------------------------------------------------------------------------

function Sidebar() {
  const intl = useIntl();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-6">
        <span className="text-xl font-bold text-blue-600">AF</span>
        <span className="text-lg font-semibold text-gray-900">
          Aprende Frances
        </span>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Principal">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  ].join(" ")
                }
              >
                <svg
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={item.icon}
                  />
                </svg>
                {intl.formatMessage({ id: item.labelId })}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Profile link */}
      <div className="border-t border-gray-100 px-3 py-3">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            [
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
            ].join(" ")
          }
        >
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
          {intl.formatMessage({ id: "nav.profile" })}
        </NavLink>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------

export function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />

        <main className="ml-60 flex-1 px-6 py-8">
          <Suspense
            fallback={
              <LoadingState message="Cargando..." skeleton skeletonLines={6} />
            }
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/vocabulary" element={<VocabularyBrowse />} />
              <Route path="/vocabulary/review" element={<VocabularyReview />} />
              <Route path="/grammar" element={<GrammarLesson />} />
              <Route path="/conversation" element={<Conversation />} />
              <Route path="/writing" element={<Writing />} />
              <Route path="/pronunciation" element={<Pronunciation />} />
              <Route path="/listening" element={<Listening />} />
              <Route path="/cultural" element={<Cultural />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/placement" element={<PlacementTest />} />
              <Route path="/exam" element={<ExitExam />} />
              <Route path="/admin" element={<AdminAnalytics />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}
