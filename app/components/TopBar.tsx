export default function TopBar() {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" />
        <span className="brand-name">weeragenda</span>
      </div>
      <nav className="topbar-meta">
        <span>
          <span className="status-dot" />
          open-meteo · live
        </span>
        <a href="#instructions">Installatie</a>
        <a
          href="https://open-meteo.com"
          target="_blank"
          rel="noreferrer noopener"
        >
          Bron
        </a>
      </nav>
    </header>
  );
}
