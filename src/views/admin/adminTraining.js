import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { logoutUser } from '../../services/authService';
import AdminHeader from '../../components/AdminHeader';
import DashboardFooter from '../../components/DashboardFooter';
import '../../styles/dashboard.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const SAMPLE_MINIMUM = 200;
const MOCK_TOTAL = 47;
const MOCK_FAKE = 24;
const MOCK_REAL = 23;

// ─── Mock data ────────────────────────────────────────────────────────────────
const INITIAL_SAMPLES = [
  {
    id: 's1',
    text: 'Grabe ang ganda ng item! Legit seller, dumating in 2 days. Highly recommend! Sulit na sulit ang bayad ko.',
    label: 'genuine',
    notes: 'Clear positive tone, specific delivery detail.',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's2',
    text: 'PRANK LANG TO!! Hindi talaga ito legit na seller hahaha joke lang mga lodi. Like and share para sa free item!!!',
    label: 'fake',
    notes: 'Engagement-bait pattern, no real purchase intent.',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's3',
    text: 'Subok na! Original talaga. May warranty pa. Tatlong beses na akong nag-order dito, hindi pa nila ako binibigo.',
    label: 'genuine',
    notes: 'Repeat buyer signal, warranty mention.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's4',
    text: 'LIMITADO LANG! Mag-order na agad bago maubusan! SCAM ALERT sa ibang sellers, kami lang ang tunay! GCash only!',
    label: 'fake',
    notes: 'Urgency + exclusivity manipulation. GCash-only flag.',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's5',
    text: 'Hindi ko feel yung packaging kaya 4 stars lang. Pero yung item mismo okay naman. Matagal lang dumating — almost 3 weeks.',
    label: 'genuine',
    notes: 'Balanced critique, credible delivery complaint.',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's6',
    text: 'Free iPhone 15 kung mag-share ka ng post na ito sa 10 friends! Legit to, nanalo na ako! I-redeem sa link sa bio!!!',
    label: 'fake',
    notes: 'Classic share-bait giveaway scam.',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const TRAINING_HISTORY = [
  {
    id: 'h1',
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    samples: 120,
    accuracy: 81.4,
    trainedBy: 'admin@sureshopph.com',
  },
  {
    id: 'h2',
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    samples: 156,
    accuracy: 84.7,
    trainedBy: 'admin@sureshopph.com',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''} ago`;
}

function formatAbsDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        pointerEvents: 'none',
      }}
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            minWidth: 220,
            padding: '0.75rem 1.1rem',
            borderRadius: 14,
            background: t.type === 'error'
              ? 'rgba(220,38,38,0.96)'
              : 'linear-gradient(135deg,#0ea5a4,#2563eb)',
            color: '#fff',
            fontSize: '0.88rem',
            fontWeight: 600,
            boxShadow: '0 12px 32px -12px rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            animation: 'ssTrainToastIn 0.32s cubic-bezier(0.34,1.4,0.64,1) both',
          }}
        >
          <i className={`fas ${t.type === 'error' ? 'fa-circle-exclamation' : t.icon ?? 'fa-circle-check'}`} />
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ width = '100%', height = 18, radius = 8, style = {} }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg,rgba(148,163,184,0.14) 25%,rgba(148,163,184,0.28) 50%,rgba(148,163,184,0.14) 75%)',
        backgroundSize: '200% 100%',
        animation: 'ssTrainSkelPulse 1.6s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function AdminTraining() {
  const navigate = useNavigate();

  // Auth
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [logoutBusy, setLogoutBusy] = useState(false);

  // Page loading skeleton
  const [pageReady, setPageReady] = useState(false);

  // Sample table
  const [samples, setSamples] = useState(INITIAL_SAMPLES);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'fake' | 'genuine'

  // Submit form
  const [reviewText, setReviewText] = useState('');
  const [selectedLabel, setSelectedLabel] = useState(null); // null | 'fake' | 'genuine'
  const [notes, setNotes] = useState('');
  const [submitBusy, setSubmitBusy] = useState(false);

  // History panel
  const [historyOpen, setHistoryOpen] = useState(false);

  // Train model tooltip visible
  const [trainTipVisible, setTrainTipVisible] = useState(false);
  const trainBtnRef = useRef(null);

  // Toasts
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((message, type = 'success', icon) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type, icon }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  // Auth check + fake load delay
  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data: authData }) => {
      if (!active) return;
      setUser(authData?.user ?? null);
      setAuthLoading(false);

      // Simulate content load (mock — no real call)
      setTimeout(() => { if (active) setPageReady(true); }, 800);
    });

    return () => { active = false; };
  }, []);

  const handleLogout = async () => {
    setLogoutBusy(true);
    await logoutUser();
    navigate('/login');
  };

  // Ctrl+Enter submit
  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!reviewText.trim()) return;
    if (!selectedLabel) return;

    setSubmitBusy(true);
    await new Promise((r) => setTimeout(r, 420)); // fake async

    const newSample = {
      id: `s${Date.now()}`,
      text: reviewText.trim(),
      label: selectedLabel,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    setSamples((prev) => [newSample, ...prev]);
    setReviewText('');
    setSelectedLabel(null);
    setNotes('');
    setSubmitBusy(false);
    addToast('Sample added', 'success', 'fa-plus-circle');
  };

  const handleDelete = (id) => {
    setSamples((prev) => prev.filter((s) => s.id !== id));
    addToast('Sample deleted', 'success', 'fa-trash');
  };

  const filteredSamples = filterTab === 'all'
    ? samples
    : samples.filter((s) => s.label === filterTab);

  // Derived stats
  const fakeCount = samples.filter((s) => s.label === 'fake').length;
  const realCount = samples.filter((s) => s.label === 'genuine').length;
  const isImbalanced = fakeCount > 0 && realCount > 0 && Math.abs(fakeCount - realCount) > Math.min(fakeCount, realCount) * 0.5;

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const role = user.app_metadata?.role || user.user_metadata?.role;
  if (role !== 'admin') return <Navigate to="/userdashboard" replace />;

  return (
    <div className="ss-dashboard-page">
      {/* Toast layer */}
      <Toast toasts={toasts} />

      <AdminHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />

      <main className="ss-dashboard-main">

        {/* ── Page Header ──────────────────────────────────────────── */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Admin › AI Model</p>
                <h2 style={{ color: 'var(--ss-dashboard-text)', fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', fontSize: '1.85rem' }}>
                  Model Training
                </h2>
                <p style={{ color: 'var(--ss-dashboard-muted)', fontSize: '0.9rem', marginTop: '0.3rem', maxWidth: 560 }}>
                  Curate and label review samples to train the SureShopPH NLP model. Submit annotated
                  Filipino/Taglish reviews as genuine or fake to build the training dataset.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Bar ────────────────────────────────────────────── */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="ss-dashboard-stats-grid">

              {/* Card 1 — Total Samples */}
              <div className="ss-dashboard-stat-card tone-teal" style={{ borderRadius: 24, padding: '1.35rem' }}>
                {!pageReady ? (
                  <div style={{ display: 'grid', gap: '0.7rem' }}>
                    <Skeleton height={14} width="55%" />
                    <Skeleton height={32} width="40%" />
                    <Skeleton height={11} radius={999} />
                    <Skeleton height={13} width="70%" />
                  </div>
                ) : (
                  <>
                    <div className="ss-dashboard-stat-top">
                      <div>
                        <p>Total Samples</p>
                        <h3 style={{ color: 'var(--ss-dashboard-text)' }}>{MOCK_TOTAL}</h3>
                      </div>
                      <div className="ss-dashboard-stat-icon" style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,var(--ss-dashboard-teal),var(--ss-dashboard-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fas fa-database" style={{ fontSize: '1.1rem' }} />
                      </div>
                    </div>
                    <div className="ss-dashboard-meter" style={{ margin: '0.6rem 0 0.5rem' }}>
                      <span style={{ width: `${(MOCK_TOTAL / SAMPLE_MINIMUM) * 100}%`, background: 'linear-gradient(90deg,var(--ss-dashboard-teal),var(--ss-dashboard-blue))' }} />
                    </div>
                    <small style={{ color: 'var(--ss-dashboard-muted)', fontSize: '0.79rem' }}>
                      <strong style={{ color: 'var(--ss-dashboard-text)' }}>{MOCK_TOTAL}</strong> / {SAMPLE_MINIMUM} minimum needed
                    </small>
                  </>
                )}
              </div>

              {/* Card 2 — Dataset Balance */}
              <div className="ss-dashboard-stat-card" style={{ borderRadius: 24, padding: '1.35rem', borderColor: isImbalanced ? 'rgba(234,179,8,0.3)' : undefined }}>
                {!pageReady ? (
                  <div style={{ display: 'grid', gap: '0.7rem' }}>
                    <Skeleton height={14} width="55%" />
                    <Skeleton height={28} width="80%" />
                    <Skeleton height={22} width="50%" radius={999} />
                  </div>
                ) : (
                  <>
                    <div className="ss-dashboard-stat-top">
                      <div>
                        <p>Dataset Balance</p>
                        <h3 style={{ color: 'var(--ss-dashboard-text)', fontSize: '1.35rem', marginTop: '0.2rem' }}>
                          <span style={{ color: '#dc2626' }}>{MOCK_FAKE}</span>
                          <span style={{ color: 'var(--ss-dashboard-muted)', fontWeight: 400, fontSize: '1rem' }}> fake · </span>
                          <span style={{ color: '#16a34a' }}>{MOCK_REAL}</span>
                          <span style={{ color: 'var(--ss-dashboard-muted)', fontWeight: 400, fontSize: '1rem' }}> real</span>
                        </h3>
                      </div>
                      <div className="ss-dashboard-stat-icon" style={{ width: 44, height: 44, borderRadius: 14, background: isImbalanced ? 'linear-gradient(135deg,#eab308,#f97316)' : 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`fas ${isImbalanced ? 'fa-scale-unbalanced' : 'fa-scale-balanced'}`} style={{ fontSize: '1.1rem' }} />
                      </div>
                    </div>
                    <span
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.28rem 0.7rem', borderRadius: 999, fontSize: '0.74rem', fontWeight: 800,
                        fontFamily: 'var(--font-accent)', letterSpacing: '0.04em', textTransform: 'uppercase',
                        background: isImbalanced ? 'rgba(234,179,8,0.14)' : 'rgba(22,163,74,0.12)',
                        color: isImbalanced ? '#92400e' : '#166534',
                      }}
                    >
                      <i className={`fas ${isImbalanced ? 'fa-triangle-exclamation' : 'fa-check'}`} style={{ fontSize: '0.7rem' }} />
                      {isImbalanced ? 'Imbalanced' : 'Balanced'}
                    </span>
                  </>
                )}
              </div>

              {/* Card 3 — Model Status */}
              <div className="ss-dashboard-stat-card" style={{ borderRadius: 24, padding: '1.35rem' }}>
                {!pageReady ? (
                  <div style={{ display: 'grid', gap: '0.7rem' }}>
                    <Skeleton height={14} width="55%" />
                    <Skeleton height={28} width="60%" />
                    <Skeleton height={22} width="45%" radius={999} />
                  </div>
                ) : (
                  <>
                    <div className="ss-dashboard-stat-top">
                      <div>
                        <p>Model Status</p>
                      </div>
                      <div className="ss-dashboard-stat-icon" style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#64748b,#475569)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fas fa-robot" style={{ fontSize: '1.1rem' }} />
                      </div>
                    </div>
                    <span
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.28rem 0.7rem', borderRadius: 999, fontSize: '0.74rem', fontWeight: 800,
                        fontFamily: 'var(--font-accent)', letterSpacing: '0.04em', textTransform: 'uppercase',
                        background: 'rgba(100,116,139,0.14)', color: '#475569',
                      }}
                    >
                      <i className="fas fa-circle" style={{ fontSize: '0.45rem' }} />
                      Not trained yet
                    </span>
                    <small style={{ display: 'block', marginTop: '0.55rem', color: 'var(--ss-dashboard-muted)', fontSize: '0.79rem' }}>
                      Collect {SAMPLE_MINIMUM - MOCK_TOTAL} more samples to enable training
                    </small>
                  </>
                )}
              </div>

              {/* Card 4 — Last Trained */}
              <div className="ss-dashboard-stat-card" style={{ borderRadius: 24, padding: '1.35rem' }}>
                {!pageReady ? (
                  <div style={{ display: 'grid', gap: '0.7rem' }}>
                    <Skeleton height={14} width="55%" />
                    <Skeleton height={28} width="40%" />
                    <Skeleton height={13} width="65%" />
                  </div>
                ) : (
                  <>
                    <div className="ss-dashboard-stat-top">
                      <div>
                        <p>Last Trained</p>
                        <h3 style={{ color: 'var(--ss-dashboard-text)', fontSize: '1.6rem' }}>Never</h3>
                      </div>
                      <div className="ss-dashboard-stat-icon" style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fas fa-clock-rotate-left" style={{ fontSize: '1.1rem' }} />
                      </div>
                    </div>
                    <small style={{ color: 'var(--ss-dashboard-muted)', fontSize: '0.79rem' }}>
                      No successful training run recorded
                    </small>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* ── Two-column layout: Form + Table ──────────────────────── */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.7fr)',
                gap: '1.25rem',
                alignItems: 'start',
              }}
            >

              {/* ── Submit Form ──────────────────────────────────── */}
              <div className="ss-dashboard-panel" style={{ position: 'sticky', top: 88 }}>
                <p className="ss-dashboard-eyebrow" style={{ marginBottom: '0.4rem' }}>Annotate</p>
                <h3 style={{ color: 'var(--ss-dashboard-text)', fontFamily: 'var(--font-display)', marginBottom: '1.25rem', fontSize: '1.15rem' }}>
                  Add Training Sample
                </h3>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.1rem' }}>

                  {/* Review text */}
                  <div>
                    <label
                      htmlFor="train-review-text"
                      style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.84rem', color: 'var(--ss-dashboard-text)' }}
                    >
                      Review Text <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      id="train-review-text"
                      className="udb-form-input"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      onKeyDown={handleTextareaKeyDown}
                      required
                      rows={4}
                      placeholder="Paste a Filipino/Taglish review here…"
                      style={{ resize: 'vertical', minHeight: 110 }}
                    />
                    <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      Ctrl+Enter to submit
                    </p>
                  </div>

                  {/* Label toggle */}
                  <div>
                    <p style={{ marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.84rem', color: 'var(--ss-dashboard-text)' }}>
                      Label <span style={{ color: '#ef4444' }}>*</span>
                    </p>
                    <div
                      role="group"
                      aria-label="Select label"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.6rem',
                      }}
                    >
                      {/* Fake button */}
                      <button
                        type="button"
                        onClick={() => setSelectedLabel(selectedLabel === 'fake' ? null : 'fake')}
                        aria-pressed={selectedLabel === 'fake'}
                        style={{
                          padding: '0.65rem 0.5rem',
                          borderRadius: 14,
                          border: `2px solid ${selectedLabel === 'fake' ? '#dc2626' : 'rgba(148,163,184,0.22)'}`,
                          background: selectedLabel === 'fake' ? 'rgba(220,38,38,0.1)' : 'transparent',
                          color: selectedLabel === 'fake' ? '#dc2626' : 'var(--ss-dashboard-muted)',
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          fontFamily: 'var(--font-accent)',
                        }}
                      >
                        🚩 Fake / Spam
                      </button>

                      {/* Genuine button */}
                      <button
                        type="button"
                        onClick={() => setSelectedLabel(selectedLabel === 'genuine' ? null : 'genuine')}
                        aria-pressed={selectedLabel === 'genuine'}
                        style={{
                          padding: '0.65rem 0.5rem',
                          borderRadius: 14,
                          border: `2px solid ${selectedLabel === 'genuine' ? '#16a34a' : 'rgba(148,163,184,0.22)'}`,
                          background: selectedLabel === 'genuine' ? 'rgba(22,163,74,0.1)' : 'transparent',
                          color: selectedLabel === 'genuine' ? '#16a34a' : 'var(--ss-dashboard-muted)',
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          fontFamily: 'var(--font-accent)',
                        }}
                      >
                        ✅ Genuine
                      </button>
                    </div>
                    {!selectedLabel && (
                      <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                        Select a label before submitting
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label
                      htmlFor="train-notes"
                      style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.84rem', color: 'var(--ss-dashboard-text)' }}
                    >
                      Notes <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <textarea
                      id="train-notes"
                      className="udb-form-input"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Why did you choose this label?"
                      style={{ resize: 'vertical', minHeight: 60 }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitBusy || !reviewText.trim() || !selectedLabel}
                    className="ss-dashboard-btn ss-dashboard-btn-primary"
                    style={{ minHeight: 44, width: '100%' }}
                  >
                    {submitBusy
                      ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '0.45rem' }} />Adding…</>
                      : <><i className="fas fa-plus" style={{ marginRight: '0.45rem' }} />Add Sample</>
                    }
                  </button>
                </form>
              </div>

              {/* ── Sample Table ──────────────────────────────────── */}
              <div className="ss-dashboard-panel">
                {/* Filter tabs */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <p className="ss-dashboard-eyebrow" style={{ marginBottom: '0.25rem' }}>Dataset</p>
                    <h3 style={{ color: 'var(--ss-dashboard-text)', fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
                      Training Samples
                    </h3>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.35rem',
                      background: 'rgba(148,163,184,0.1)',
                      borderRadius: 12,
                      padding: '0.3rem',
                    }}
                  >
                    {(['all', 'fake', 'genuine']).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setFilterTab(tab)}
                        style={{
                          padding: '0.38rem 0.85rem',
                          borderRadius: 9,
                          border: 'none',
                          background: filterTab === tab ? '#fff' : 'transparent',
                          color: filterTab === tab
                            ? tab === 'fake' ? '#dc2626' : tab === 'genuine' ? '#16a34a' : 'var(--ss-dashboard-text)'
                            : '#64748b',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-accent)',
                          letterSpacing: '0.03em',
                          textTransform: 'capitalize',
                          boxShadow: filterTab === tab ? '0 1px 4px rgba(15,23,42,0.1)' : 'none',
                          transition: 'all 0.18s ease',
                        }}
                      >
                        {tab === 'all' && `All (${samples.length})`}
                        {tab === 'fake' && `🚩 Fake (${samples.filter((s) => s.label === 'fake').length})`}
                        {tab === 'genuine' && `✅ Genuine (${samples.filter((s) => s.label === 'genuine').length})`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skeleton rows */}
                {!pageReady ? (
                  <div style={{ display: 'grid', gap: '0.8rem' }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{ padding: '1rem', borderRadius: 16, background: 'rgba(148,163,184,0.07)', display: 'grid', gap: '0.5rem' }}>
                        <Skeleton height={14} width="90%" />
                        <Skeleton height={12} width="40%" />
                        <Skeleton height={10} width="60%" />
                      </div>
                    ))}
                  </div>
                ) : filteredSamples.length === 0 ? (
                  <div className="udb-empty-state">
                    <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: '0.75rem' }} />
                    <h3>No samples yet</h3>
                    <p>Add some annotated reviews using the form to build the training dataset.</p>
                  </div>
                ) : (
                  <div className="ss-dashboard-table-wrap">
                    <table className="ss-dashboard-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40%' }}>Text</th>
                          <th>Label</th>
                          <th>Notes</th>
                          <th>Date</th>
                          <th style={{ width: 56 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSamples.map((sample) => (
                          <tr key={sample.id}>
                            {/* Text — truncated, full on hover */}
                            <td>
                              <span
                                title={sample.text}
                                style={{
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: 260,
                                  fontSize: '0.84rem',
                                  color: 'var(--ss-dashboard-text)',
                                  cursor: 'help',
                                }}
                              >
                                {sample.text.length > 100 ? sample.text.slice(0, 100) + '…' : sample.text}
                              </span>
                            </td>

                            {/* Label badge */}
                            <td>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.3rem 0.65rem',
                                  borderRadius: 999,
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  fontFamily: 'var(--font-accent)',
                                  textTransform: 'uppercase',
                                  background: sample.label === 'fake' ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)',
                                  color: sample.label === 'fake' ? '#b91c1c' : '#166534',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {sample.label === 'fake' ? '🚩 Fake' : '✅ Genuine'}
                              </span>
                            </td>

                            {/* Notes */}
                            <td>
                              <span style={{ fontSize: '0.8rem', color: 'var(--ss-dashboard-muted)', fontStyle: sample.notes ? 'normal' : 'italic' }}>
                                {sample.notes || '—'}
                              </span>
                            </td>

                            {/* Date */}
                            <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#94a3b8' }}>
                              {relativeTime(sample.createdAt)}
                            </td>

                            {/* Delete */}
                            <td>
                              <button
                                type="button"
                                onClick={() => handleDelete(sample.id)}
                                title="Delete sample"
                                style={{
                                  padding: '0.35rem 0.6rem',
                                  borderRadius: 10,
                                  border: '1px solid rgba(220,38,38,0.18)',
                                  background: 'rgba(220,38,38,0.06)',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  transition: 'background 0.18s ease, transform 0.18s ease',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.14)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.06)'; e.currentTarget.style.transform = 'scale(1)'; }}
                              >
                                <i className="fas fa-trash-can" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* ── Training History ─────────────────────────────────────── */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="ss-dashboard-panel">
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  gap: '1rem',
                }}
                aria-expanded={historyOpen}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 14, background: 'linear-gradient(135deg,rgba(14,165,164,0.14),rgba(37,99,235,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ss-dashboard-teal-dark)', flexShrink: 0 }}>
                    <i className="fas fa-history" />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p className="ss-dashboard-eyebrow" style={{ marginBottom: '0.1rem' }}>Archive</p>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ss-dashboard-text)', fontSize: '1.05rem' }}>
                      Training History
                    </span>
                  </div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ss-dashboard-muted)', transition: 'color 0.2s' }}>
                  {historyOpen ? 'Hide history' : 'Show history'}
                  <i className={`fas fa-chevron-${historyOpen ? 'up' : 'down'}`} style={{ fontSize: '0.75rem', transition: 'transform 0.25s ease', transform: historyOpen ? 'rotate(180deg)' : 'none' }} />
                </span>
              </button>

              {historyOpen && (
                <div style={{ marginTop: '1.25rem' }}>
                  {!pageReady ? (
                    <div style={{ display: 'grid', gap: '0.7rem' }}>
                      <Skeleton height={44} radius={14} />
                      <Skeleton height={44} radius={14} />
                    </div>
                  ) : (
                    <div className="ss-dashboard-table-wrap">
                      <table className="ss-dashboard-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Samples</th>
                            <th>Accuracy</th>
                            <th>Trained By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {TRAINING_HISTORY.map((run) => (
                            <tr key={run.id}>
                              <td style={{ whiteSpace: 'nowrap', fontSize: '0.84rem' }}>{formatAbsDate(run.date)}</td>
                              <td>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ss-dashboard-text)', fontSize: '0.9rem' }}>
                                  {run.samples}
                                </span>
                              </td>
                              <td>
                                <span
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                    padding: '0.28rem 0.65rem', borderRadius: 999,
                                    background: run.accuracy >= 85 ? 'rgba(22,163,74,0.1)' : 'rgba(249,115,22,0.1)',
                                    color: run.accuracy >= 85 ? '#166534' : '#c2410c',
                                    fontSize: '0.78rem', fontWeight: 800,
                                    fontFamily: 'var(--font-accent)',
                                  }}
                                >
                                  <i className={`fas ${run.accuracy >= 85 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} style={{ fontSize: '0.7rem' }} />
                                  {run.accuracy}%
                                </span>
                              </td>
                              <td style={{ fontSize: '0.82rem', color: 'var(--ss-dashboard-muted)' }}>{run.trainedBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sticky Train Model Bar ───────────────────────────────── */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 40,
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(148,163,184,0.18)',
            padding: '0.85rem 0',
          }}
        >
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--ss-dashboard-text)', margin: 0 }}>
                  Model Training
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--ss-dashboard-muted)', margin: 0, marginTop: '0.1rem' }}>
                  {MOCK_TOTAL} / {SAMPLE_MINIMUM} samples collected — need {SAMPLE_MINIMUM - MOCK_TOTAL} more to enable training
                </p>
              </div>

              {/* Train button with tooltip */}
              <div
                style={{ position: 'relative', display: 'inline-flex' }}
                onMouseEnter={() => setTrainTipVisible(true)}
                onMouseLeave={() => setTrainTipVisible(false)}
                onFocus={() => setTrainTipVisible(true)}
                onBlur={() => setTrainTipVisible(false)}
              >
                <button
                  type="button"
                  disabled
                  ref={trainBtnRef}
                  aria-describedby="train-tooltip"
                  className="ss-dashboard-btn ss-dashboard-btn-primary"
                  style={{
                    minHeight: 44,
                    opacity: 0.52,
                    cursor: 'not-allowed',
                    filter: 'grayscale(0.3)',
                  }}
                >
                  <i className="fas fa-brain" style={{ marginRight: '0.5rem' }} />
                  Train Model
                </button>
                {trainTipVisible && (
                  <div
                    id="train-tooltip"
                    role="tooltip"
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 10px)',
                      right: 0,
                      background: '#0f172a',
                      color: '#f1f5f9',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      padding: '0.5rem 0.85rem',
                      borderRadius: 10,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 8px 24px -8px rgba(15,23,42,0.5)',
                      pointerEvents: 'none',
                      zIndex: 100,
                    }}
                  >
                    <i className="fas fa-lock" style={{ marginRight: '0.4rem', fontSize: '0.7rem' }} />
                    Need {SAMPLE_MINIMUM} samples minimum (you have {MOCK_TOTAL})
                    <div style={{ position: 'absolute', bottom: -5, right: 16, width: 10, height: 10, background: '#0f172a', transform: 'rotate(45deg)', borderRadius: 2 }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </main>

      <DashboardFooter />

      {/* Inline keyframes */}
      <style>{`
        @keyframes ssTrainToastIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes ssTrainSkelPulse {
          0%, 100% { background-position: 200% 0; }
          50%       { background-position: -200% 0; }
        }
        body.ss-theme-dark .ss-train-sticky-bar {
          background: rgba(15,23,42,0.96);
          border-top-color: rgba(148,163,184,0.22);
        }
      `}</style>
    </div>
  );
}

export default AdminTraining;
