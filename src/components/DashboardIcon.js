// Modular DashboardIcon for reuse
function DashboardIcon({ type }) {
  const icons = {
    shield: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5 4.5 5.6v5.95c0 4.87 3.18 9.28 7.5 10.95 4.32-1.67 7.5-6.08 7.5-10.95V5.6L12 2.5Zm0 2.04 5.5 2.27v4.74c0 3.91-2.36 7.39-5.5 8.81-3.14-1.42-5.5-4.9-5.5-8.81V6.81L12 4.54Zm-1.18 10.78-2.65-2.65-1.42 1.41 4.07 4.08 6.51-6.51-1.41-1.42-5.1 5.09Z" />
      </svg>
    ),
    scan: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7a3 3 0 0 1 3-3h3v2H7a1 1 0 0 0-1 1v3H4V7Zm10-3h3a3 3 0 0 1 3 3v3h-2V7a1 1 0 0 0-1-1h-3V4ZM4 14h2v3a1 1 0 0 0 1 1h3v2H7a3 3 0 0 1-3-3v-3Zm14 0h2v3a3 3 0 0 1-3 3h-3v-2h3a1 1 0 0 0 1-1v-3Zm-9-3h6v2H9v-2Z" />
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.75c.46 0 .88.24 1.1.65l8 14a1.25 1.25 0 0 1-1.1 1.85H4a1.25 1.25 0 0 1-1.1-1.85l8-14c.22-.41.64-.65 1.1-.65Zm0 5.25a1 1 0 0 0-1 1v4.25a1 1 0 1 0 2 0V10a1 1 0 0 0-1-1Zm0 8a1.12 1.12 0 1 0 0-2.24A1.12 1.12 0 0 0 12 17Z" />
      </svg>
    ),
    spark: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 2 1.92 5.08L19 9l-5.08 1.92L12 16l-1.92-5.08L5 9l5.08-1.92L12 2Zm7 12 1 2.65L22.65 18 20 19l-1 2.65L18 19l-2.65-1L18 16.65 19 14Zm-14 1 1.2 3.2L9.4 19.4 6.2 20.6 5 23.8 3.8 20.6.6 19.4l3.2-1.2L5 15Z" />
      </svg>
    ),
    user: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.35-8 5.25 0 .69.56 1.25 1.25 1.25h13.5c.69 0 1.25-.56 1.25-1.25C20 16.35 16.42 14 12 14Z" />
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11 4a1 1 0 1 0 0 2h5a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-5a1 1 0 1 0 0 2h5a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3h-5Zm-1.29 3.29a1 1 0 0 1 1.41 1.42L9.83 10H15a1 1 0 1 1 0 2H9.83l1.29 1.29a1 1 0 0 1-1.41 1.42l-3-3a1 1 0 0 1 0-1.42l3-3Z" />
      </svg>
    ),
    trend: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 17.5a1 1 0 0 1-1-1v-9a1 1 0 1 1 2 0v6.59l3.8-3.79a1 1 0 0 1 1.4 0l2.3 2.29 4.79-4.79H16.5a1 1 0 1 1 0-2H21a1 1 0 0 1 1 1v4.5a1 1 0 1 1-2 0V8.71l-5.5 5.5a1 1 0 0 1-1.4 0l-2.3-2.3L7 15.71V16.5a1 1 0 0 1-1 1Z" />
      </svg>
    ),
    lock: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 10V8a4 4 0 1 1 8 0v2h.75A2.25 2.25 0 0 1 19 12.25v6.5A2.25 2.25 0 0 1 16.75 21h-9.5A2.25 2.25 0 0 1 5 18.75v-6.5A2.25 2.25 0 0 1 7.25 10H8Zm2 0h4V8a2 2 0 1 0-4 0v2Zm2 3a1.5 1.5 0 0 0-.75 2.8V17a.75.75 0 0 0 1.5 0v-1.2A1.5 1.5 0 0 0 12 13Z" />
      </svg>
    )
  };
  return <span className="ss-dashboard-icon-svg">{icons[type] || icons.shield}</span>;
}

export default DashboardIcon;
