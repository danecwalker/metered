"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "grid",
          placeItems: "center",
          background: "#3d392f",
          color: "#e8dfcc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "20rem", padding: "1.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", letterSpacing: "-0.03em" }}>
            Something broke
          </h1>
          <p style={{ color: "#c9c0ad", fontSize: "0.9375rem" }}>
            Metered failed to start this page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              minHeight: "44px",
              padding: "0 1.1rem",
              border: 0,
              borderRadius: "999px",
              background: "#f3ead8",
              color: "#3d392f",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
