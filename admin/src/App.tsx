import { Refine, Authenticated } from "@refinedev/core";
import routerProvider from "@refinedev/react-router-v6";
import { dataProvider } from "./providers/dataProvider";
import { authProvider } from "./providers/authProvider";
import {
  BrowserRouter,
  Outlet,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AdminLayout } from "./layout/AdminLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { BookingsPage } from "./pages/BookingsPage";
import { RoomsPage } from "./pages/RoomsPage";
import { CalendarPage } from "./pages/CalendarPage";
import { GuestsPage } from "./pages/GuestsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { RefundsPage } from "./pages/RefundsPage";
import { UsersPage } from "./pages/UsersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { OtaPage } from "./pages/OtaPage";
import { WalkInPage } from "./pages/WalkInPage";
import { AuditLogPage } from "./pages/AuditLogPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function AuthFallback() {
  const location = useLocation();
  const next = `${location.pathname}${location.search}`;
  const to =
    next && next !== "/"
      ? `/login?next=${encodeURIComponent(next)}`
      : "/login";
  return <Navigate to={to} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <Refine
        dataProvider={dataProvider}
        authProvider={authProvider}
        routerProvider={routerProvider}
        resources={[
          { name: "dashboard", list: "/" },
          { name: "bookings", list: "/bookings" },
          { name: "rooms", list: "/rooms" },
          { name: "calendar", list: "/calendar" },
          { name: "guests", list: "/guests" },
          { name: "analytics", list: "/analytics" },
          { name: "refunds", list: "/refunds" },
          { name: "users", list: "/users" },
          { name: "ota", list: "/ota" },
          { name: "walk-in", list: "/walk-in" },
          { name: "audit_log", list: "/audit-log" },
          { name: "notifications", list: "/notifications" },
          { name: "settings", list: "/settings" },
        ]}
        options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <Authenticated key="auth" fallback={<AuthFallback />}>
                <AdminLayout>
                  <Outlet />
                </AdminLayout>
              </Authenticated>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="guests" element={<GuestsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="refunds" element={<RefundsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="ota" element={<OtaPage />} />
            <Route path="walk-in" element={<WalkInPage />} />
            <Route path="audit-log" element={<AuditLogPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Refine>
    </BrowserRouter>
  );
}
