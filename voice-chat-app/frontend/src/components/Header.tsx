import './Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <span className="header-icon">🎙️</span>
        <h1 className="header-title">Voice Chat</h1>
        <span className="header-subtitle">Multi-Agent Voice Assistant</span>
      </div>
    </header>
  );
}
