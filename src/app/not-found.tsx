import Link from "next/link";

// Lokal prefiksdan tashqaridagi 404
export default function GlobalNotFound() {
  return (
    <html lang="uz">
      <body style={{ fontFamily: "system-ui", display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <h1>404</h1>
          <Link href="/">Bosh sahifa</Link>
        </div>
      </body>
    </html>
  );
}
