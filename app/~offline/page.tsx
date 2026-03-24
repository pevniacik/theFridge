export default function OfflinePage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100svh",
        padding: "2rem",
        textAlign: "center",
        background: "var(--color-bg)",
        color: "var(--color-text)",
      }}
    >
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🧊</div>
      <h1
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          marginBottom: "0.75rem",
        }}
      >
        You&rsquo;re offline
      </h1>
      <p
        style={{
          color: "var(--color-text-muted)",
          maxWidth: "24rem",
          lineHeight: 1.6,
        }}
      >
        theFridge server is unreachable. Check that the home device is running.
      </p>
    </div>
  );
}
