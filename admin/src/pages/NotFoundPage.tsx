import { Link } from "react-router-dom";

/**
 * Catch-all 404 for unmatched admin routes — mirrors the storefront tone
 * without pulling in Next.js chrome.
 */
export function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.25rem",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 440 }}>
        <p
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#6b7260",
            margin: 0,
          }}
        >
          404
        </p>
        <h1
          style={{
            margin: "1rem 0 0",
            fontSize: "2rem",
            fontWeight: 600,
            color: "#3B4133",
            letterSpacing: "-0.02em",
          }}
        >
          This page is not in the house
        </h1>
        <p style={{ margin: "1rem 0 0", color: "#5c6354", lineHeight: 1.5 }}>
          The admin route you opened does not exist. Head back to the dashboard
          or bookings.
        </p>
        <div
          style={{
            marginTop: "1.75rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            justifyContent: "center",
          }}
        >
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 44,
              padding: "0 1.25rem",
              borderRadius: 999,
              background: "#3B4133",
              color: "#f7f4ec",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Go to dashboard
          </Link>
          <Link
            to="/bookings"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 44,
              padding: "0 1.25rem",
              borderRadius: 999,
              border: "1px solid rgba(59,65,51,0.2)",
              color: "#3B4133",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            View bookings
          </Link>
        </div>
      </div>
    </div>
  );
}
