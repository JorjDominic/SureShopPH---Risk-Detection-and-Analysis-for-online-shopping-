import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { logoutUser } from '../../services/authService';
import AdminHeader from '../../components/AdminHeader';
import AdminSubNav, { TRAINING_TABS } from '../../components/AdminSubNav';
import DashboardFooter from '../../components/DashboardFooter';
import '../../styles/dashboard.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const SAMPLE_MINIMUM = 200;
const MOCK_TOTAL = 47;
const MOCK_SUSPICIOUS = 24;
const MOCK_CREDIBLE = 23;
const LOW_QUALITY_CHAR_THRESHOLD = 10;
const NEAR_DUP_THRESHOLD = 0.7;

// ─── Guideline examples ──────────────────────────────────────────────────────
const CREDIBLE_EXAMPLES = [
  'Dumating after 3 days. Size medium fit perfectly, color matches the photo. Zipper medyo stiff pero ok sa price.',
  'Hindi ko inasahan na ganito kaganda yung tela. Mag-oorder ulit. Minus 1 star kasi late ng 2 days.',
  'Okay naman yung quality for the price. 250 lang. Medyo maliit yung sizing so size up.',
  'Legit yung seller. Naka-bubble wrap, walang damage. 4/5 kasi kulang yung freebies.',
  'Second time ko nang bumili. Consistent quality. Recommended for budget buyers.',
];

const SUSPICIOUS_EXAMPLES = [
  'goods',
  'LEGIT SELLER HIGHLY RECOMMEND!!!',
  'sulit na sulit bilhin na agad!',
  'ok',
  'Free shipping, mabilis dumating, 5 stars!',
];

const SUBMIT_CHECKLIST = [
  'Does it mention a specific detail (size, color, delivery time)?',
  'Is it natural language, not promotional?',
  'Is it longer than one word or phrase?',
  'Would a real buyer write this?',
];

// ─── Mock data ────────────────────────────────────────────────────────────────
const INITIAL_SAMPLES = [
  {
    id: 's1',
    text: 'Grabe ang ganda ng item! Legit seller, dumating in 2 days. Highly recommend! Sulit na sulit ang bayad ko.',
    label: 'credible',
    notes: 'Clear positive tone, specific delivery detail.',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's2',
    text: 'PRANK LANG TO!! Hindi talaga ito legit na seller hahaha joke lang mga lodi. Like and share para sa free item!!!',
    label: 'suspicious',
    notes: 'Engagement-bait pattern, no real purchase intent.',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's3',
    text: 'Subok na! Original talaga. May warranty pa. Tatlong beses na akong nag-order dito, hindi pa nila ako binibigo.',
    label: 'credible',
    notes: 'Repeat buyer signal, warranty mention.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's4',
    text: 'LIMITADO LANG! Mag-order na agad bago maubusan! SCAM ALERT sa ibang sellers, kami lang ang tunay! GCash only!',
    label: 'suspicious',
    notes: 'Urgency + exclusivity manipulation. GCash-only flag.',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's5',
    text: 'Hindi ko feel yung packaging kaya 4 stars lang. Pero yung item mismo okay naman. Matagal lang dumating — almost 3 weeks.',
    label: 'credible',
    notes: 'Balanced critique, credible delivery complaint.',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's6',
    text: 'Free iPhone 15 kung mag-share ka ng post na ito sa 10 friends! Legit to, nanalo na ako! I-redeem sa link sa bio!!!',
    label: 'suspicious',
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

// Normalize a review string for comparison (lowercase, trim, collapse whitespace).
function normalizeText(s) {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// Tokenize into a Set of unique alphanumeric words (length >= 2).
function tokenize(s) {
  const norm = normalizeText(s);
  if (!norm) return new Set();
  const tokens = norm
    .split(/[^a-z0-9ñ]+/i)
    .filter((w) => w.length >= 2);
  return new Set(tokens);
}

// Return ratio (0..1) of shared words: |A∩B| / |A∪B| (Jaccard).
function wordOverlapRatio(a, b) {
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  A.forEach((w) => { if (B.has(w)) inter += 1; });
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

// Count duplicates inside a samples array (pairs of identical normalized text).
function countDuplicates(samples) {
  const seen = new Map();
  let dupes = 0;
  for (const s of samples) {
    const key = normalizeText(s.text);
    if (!key) continue;
    if (seen.has(key)) dupes += 1;
    else seen.set(key, true);
  }
  return dupes;
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

// ─── Health Pill ──────────────────────────────────────────────────────────────
function HealthPill({ ok, redWhenBad = false, okLabel, badLabel, title }) {
  const tone = ok ? 'green' : redWhenBad ? 'red' : 'yellow';
  const palette = {
    green: { bg: 'rgba(22,163,74,0.12)', fg: '#166534', dot: '#16a34a' },
    yellow: { bg: 'rgba(234,179,8,0.14)', fg: '#92400e', dot: '#eab308' },
    red: { bg: 'rgba(220,38,38,0.12)', fg: '#b91c1c', dot: '#dc2626' },
  }[tone];
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.4rem 0.8rem',
        borderRadius: 999,
        fontSize: '0.78rem',
        fontWeight: 700,
        fontFamily: 'var(--font-accent)',
        background: palette.bg,
        color: palette.fg,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: palette.dot,
          boxShadow: `0 0 0 3px ${palette.bg}`,
        }}
      />
      <span style={{ color: 'var(--ss-dashboard-muted)', fontWeight: 600 }}>{title}:</span>
      {ok ? okLabel : badLabel}
    </span>
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
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'suspicious' | 'credible'

  // Submit form
  const [reviewText, setReviewText] = useState('');
  const [selectedLabel, setSelectedLabel] = useState(null); // null | 'suspicious' | 'credible'
  const [notes, setNotes] = useState('');
  const [submitBusy, setSubmitBusy] = useState(false);

  // Guidelines panel
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);

  // Duplicate detection (debounced)
  // status: 'none' | 'exact' | 'near'
  const [dupStatus, setDupStatus] = useState('none');

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
    if (dupStatus === 'exact') return;

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
  const suspiciousCount = samples.filter((s) => s.label === 'suspicious').length;
  const credibleCount = samples.filter((s) => s.label === 'credible').length;
  const total = suspiciousCount + credibleCount;
  // "Balanced" only when dataset is large enough AND neither class is below 30%
  const isBalanced =
    total >= SAMPLE_MINIMUM &&
    total > 0 &&
    suspiciousCount / total >= 0.3 &&
    credibleCount / total >= 0.3;
  const isImbalanced = suspiciousCount > 0 && credibleCount > 0 && !isBalanced && Math.abs(suspiciousCount - credibleCount) > Math.min(suspiciousCount, credibleCount) * 0.5;

  // ─── Dataset Health (mock) ────────────────────────────────────────────────
  // Minimum size — uses MOCK_TOTAL so the indicator reflects the documented
  // "47 / 200" mock state until a real backend is wired.
  const healthMinSizeOk = MOCK_TOTAL >= SAMPLE_MINIMUM;

  // Balance — neither label below 30% of the (mock) total.
  const mockTotal = MOCK_SUSPICIOUS + MOCK_CREDIBLE;
  const healthBalanceOk =
    mockTotal > 0 &&
    MOCK_SUSPICIOUS / mockTotal >= 0.3 &&
    MOCK_CREDIBLE / mockTotal >= 0.3;

  // Low quality — count short rows in the in-memory samples list.
  const lowQualityCount = samples.filter(
    (s) => normalizeText(s.text).length < LOW_QUALITY_CHAR_THRESHOLD,
  ).length;
  const healthQualityOk = lowQualityCount === 0;

  // Duplicates — exact-text duplicates inside the in-memory list.
  const duplicateCount = countDuplicates(samples);
  const healthDupesOk = duplicateCount === 0;

  // Aggregate health
  const healthAnyRed = !healthMinSizeOk; // only the size pill is red-eligible
  const healthAllGreen = healthMinSizeOk && healthBalanceOk && healthQualityOk && healthDupesOk;
  const healthOnlyYellow = !healthAnyRed && !healthAllGreen;

  // Debounced duplicate detection on reviewText
  useEffect(() => {
    const text = reviewText.trim();
    if (!text) {
      setDupStatus('none');
      return undefined;
    }
    const handle = setTimeout(() => {
      const norm = normalizeText(text);
      // Exact match
      const exact = samples.some((s) => normalizeText(s.text) === norm);
      if (exact) {
        setDupStatus('exact');
        return;
      }
      // Near-duplicate via word overlap
      const near = samples.some((s) => wordOverlapRatio(text, s.text) > NEAR_DUP_THRESHOLD);
      setDupStatus(near ? 'near' : 'none');
    }, 300);
    return () => clearTimeout(handle);
  }, [reviewText, samples]);

  if (authLoading) return <div className="ss-dashboard-page" aria-busy="true" />;
  if (!user) return <Navigate to="/login" replace />;

  const role = user.app_metadata?.role || user.user_metadata?.role;
  if (role !== 'admin') return <Navigate to="/userdashboard" replace />;

  return (
    <div className="ss-dashboard-page">
      {/* Toast layer */}
      <Toast toasts={toasts} />

      <AdminHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />

      <main className="ss-dashboard-main">

        <AdminSubNav eyebrow="Admin › Training" tabs={TRAINING_TABS} />

        {/* ── Page Header ──────────────────────────────────────────── */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <h2 style={{ color: 'var(--ss-dashboard-text)', fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', fontSize: '1.85rem' }}>
                  Labeling Tool
                </h2>
                <p style={{ color: 'var(--ss-dashboard-muted)', fontSize: '0.9rem', marginTop: '0.3rem', maxWidth: 560 }}>
                  Curate and label review samples to train the SureShopPH NLP model. Submit
                  Filipino/Taglish reviews as credible or suspicious signals to build the training dataset.
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
                          <span style={{ color: '#ea580c' }}>{MOCK_SUSPICIOUS}</span>
                          <span style={{ color: 'var(--ss-dashboard-muted)', fontWeight: 400, fontSize: '1rem' }}> suspicious · </span>
                          <span style={{ color: '#16a34a' }}>{MOCK_CREDIBLE}</span>
                          <span style={{ color: 'var(--ss-dashboard-muted)', fontWeight: 400, fontSize: '1rem' }}> credible</span>
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
                        background: isImbalanced
                          ? 'rgba(234,179,8,0.14)'
                          : isBalanced
                            ? 'rgba(22,163,74,0.12)'
                            : 'rgba(100,116,139,0.13)',
                        color: isImbalanced ? '#92400e' : isBalanced ? '#166534' : '#475569',
                      }}
                    >
                      <i
                        className={`fas ${
                          isImbalanced
                            ? 'fa-triangle-exclamation'
                            : isBalanced
                              ? 'fa-check'
                              : 'fa-hourglass-half'
                        }`}
                        style={{ fontSize: '0.7rem' }}
                      />
                      {isImbalanced ? 'Imbalanced' : isBalanced ? 'Balanced' : 'Too few samples'}
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

        {/* ── Dataset Health Bar ───────────────────────────────────── */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="ss-dashboard-panel" style={{ padding: '1rem 1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <i className="fas fa-heart-pulse" style={{ color: 'var(--ss-dashboard-teal)' }} />
                <p className="ss-dashboard-eyebrow" style={{ margin: 0 }}>Dataset Health</p>
              </div>

              {/* Pill row */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.55rem',
                  marginBottom: '0.75rem',
                }}
              >
                <HealthPill
                  ok={healthMinSizeOk}
                  redWhenBad
                  okLabel="Ready"
                  badLabel={`${MOCK_TOTAL} / ${SAMPLE_MINIMUM} samples`}
                  title="Minimum Size"
                />
                <HealthPill
                  ok={healthBalanceOk}
                  okLabel="Balanced"
                  badLabel="Imbalanced (>70/30)"
                  title="Label Balance"
                />
                <HealthPill
                  ok={healthQualityOk}
                  okLabel="Clean"
                  badLabel={`${lowQualityCount} low-quality`}
                  title="Low Quality"
                />
                <HealthPill
                  ok={healthDupesOk}
                  okLabel="No duplicates"
                  badLabel={`${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'}`}
                  title="Duplicates"
                />
              </div>

              {/* Summary line */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  padding: '0.45rem 0.85rem',
                  borderRadius: 10,
                  background: healthAnyRed
                    ? 'rgba(220,38,38,0.1)'
                    : healthOnlyYellow
                      ? 'rgba(234,179,8,0.12)'
                      : 'rgba(22,163,74,0.12)',
                  color: healthAnyRed
                    ? '#b91c1c'
                    : healthOnlyYellow
                      ? '#92400e'
                      : '#166534',
                }}
              >
                <i
                  className={`fas ${
                    healthAnyRed
                      ? 'fa-circle-xmark'
                      : healthOnlyYellow
                        ? 'fa-triangle-exclamation'
                        : 'fa-circle-check'
                  }`}
                />
                {healthAnyRed
                  ? 'Not ready — resolve issues first'
                  : healthOnlyYellow
                    ? 'Can train but quality may affect results'
                    : 'Dataset ready to train'}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                  <p className="ss-dashboard-eyebrow" style={{ margin: 0 }}>Signal</p>
                  <button
                    type="button"
                    onClick={() => setGuidelinesOpen((v) => !v)}
                    aria-expanded={guidelinesOpen}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.32rem 0.7rem',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: guidelinesOpen ? 'rgba(14,165,164,0.12)' : 'transparent',
                      color: guidelinesOpen ? 'var(--ss-dashboard-teal)' : 'var(--ss-dashboard-muted)',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-accent)',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    📋 {guidelinesOpen ? 'Hide Guidelines' : 'View Guidelines'}
                    <i className={`fas fa-chevron-${guidelinesOpen ? 'up' : 'down'}`} style={{ fontSize: '0.65rem' }} />
                  </button>
                </div>
                <h3 style={{ color: 'var(--ss-dashboard-text)', fontFamily: 'var(--font-display)', marginBottom: '1.25rem', fontSize: '1.15rem' }}>
                  Add Review Signal
                </h3>

                {/* Collapsible Guidelines Panel */}
                {guidelinesOpen && (
                  <div
                    style={{
                      marginBottom: '1.1rem',
                      padding: '1rem',
                      borderRadius: 14,
                      background: 'rgba(148,163,184,0.07)',
                      border: '1px solid rgba(148,163,184,0.18)',
                      display: 'grid',
                      gap: '0.9rem',
                    }}
                  >
                    {/* Credible examples */}
                    <div>
                      <p style={{ margin: 0, marginBottom: '0.45rem', fontSize: '0.74rem', fontWeight: 800, fontFamily: 'var(--font-accent)', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#16a34a' }}>
                        ✓ Credible signals
                      </p>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
                        {CREDIBLE_EXAMPLES.map((ex, i) => (
                          <li
                            key={`cred-${i}`}
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--ss-dashboard-text)',
                              padding: '0.45rem 0.65rem',
                              background: 'rgba(22,163,74,0.06)',
                              borderLeft: '3px solid #16a34a',
                              borderRadius: 6,
                              lineHeight: 1.5,
                            }}
                          >
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Suspicious examples */}
                    <div>
                      <p style={{ margin: 0, marginBottom: '0.45rem', fontSize: '0.74rem', fontWeight: 800, fontFamily: 'var(--font-accent)', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ea580c' }}>
                        ⚠️ Suspicious signals
                      </p>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
                        {SUSPICIOUS_EXAMPLES.map((ex, i) => (
                          <li
                            key={`susp-${i}`}
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--ss-dashboard-text)',
                              padding: '0.45rem 0.65rem',
                              background: 'rgba(234,88,12,0.06)',
                              borderLeft: '3px solid #ea580c',
                              borderRadius: 6,
                              lineHeight: 1.5,
                            }}
                          >
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Checklist */}
                    <div>
                      <p style={{ margin: 0, marginBottom: '0.45rem', fontSize: '0.74rem', fontWeight: 800, fontFamily: 'var(--font-accent)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ss-dashboard-text)' }}>
                        Check before submitting
                      </p>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.3rem' }}>
                        {SUBMIT_CHECKLIST.map((item, i) => (
                          <li
                            key={`chk-${i}`}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.5rem',
                              fontSize: '0.78rem',
                              color: 'var(--ss-dashboard-muted)',
                              lineHeight: 1.5,
                            }}
                          >
                            <i className="far fa-square" style={{ marginTop: '0.18rem', color: 'var(--ss-dashboard-teal)', flexShrink: 0, fontSize: '0.85rem' }} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Footer note */}
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.74rem',
                        color: 'var(--ss-dashboard-muted)',
                        fontStyle: 'italic',
                        lineHeight: 1.5,
                        paddingTop: '0.5rem',
                        borderTop: '1px dashed rgba(148,163,184,0.25)',
                      }}
                    >
                      You're providing a training signal, not a verdict. Users always see a risk score (0–100), never a label.
                    </p>
                  </div>
                )}

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
                    <p
                      style={{
                        fontSize: '0.74rem',
                        color: 'var(--ss-dashboard-muted)',
                        opacity: 0.75,
                        marginTop: '0.25rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <kbd
                        style={{
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)',
                          background: 'rgba(148,163,184,0.18)',
                          border: '1px solid rgba(148,163,184,0.3)',
                          borderRadius: 5,
                          padding: '0.05rem 0.35rem',
                          color: 'inherit',
                          lineHeight: 1.6,
                        }}
                      >
                        Ctrl+Enter
                      </kbd>
                      to submit
                    </p>

                    {/* Duplicate warning */}
                    {dupStatus !== 'none' && (
                      <div
                        role="alert"
                        style={{
                          marginTop: '0.5rem',
                          display: 'flex',
                          gap: '0.5rem',
                          alignItems: 'flex-start',
                          padding: '0.55rem 0.75rem',
                          borderRadius: 10,
                          background: dupStatus === 'exact' ? 'rgba(220,38,38,0.1)' : 'rgba(234,179,8,0.12)',
                          border: `1px solid ${dupStatus === 'exact' ? 'rgba(220,38,38,0.3)' : 'rgba(234,179,8,0.35)'}`,
                          color: dupStatus === 'exact' ? '#b91c1c' : '#92400e',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          lineHeight: 1.45,
                        }}
                      >
                        <i className="fas fa-triangle-exclamation" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                        <span>
                          {dupStatus === 'exact'
                            ? 'This exact review already exists in the dataset. Submitting it will create a duplicate.'
                            : 'This review is very similar to an existing sample. Consider adding it only if it provides a meaningfully different example.'}
                        </span>
                      </div>
                    )}
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
                      {/* Suspicious button */}
                      <button
                        type="button"
                        onClick={() => setSelectedLabel(selectedLabel === 'suspicious' ? null : 'suspicious')}
                        aria-pressed={selectedLabel === 'suspicious'}
                        style={{
                          padding: '0.65rem 0.5rem',
                          borderRadius: 14,
                          border: `2px solid ${selectedLabel === 'suspicious' ? '#ea580c' : 'rgba(148,163,184,0.22)'}`,
                          background: selectedLabel === 'suspicious' ? 'rgba(234,88,12,0.1)' : 'transparent',
                          color: selectedLabel === 'suspicious' ? '#ea580c' : 'var(--ss-dashboard-muted)',
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
                        ⚠️ Suspicious
                      </button>

                      {/* Credible button */}
                      <button
                        type="button"
                        onClick={() => setSelectedLabel(selectedLabel === 'credible' ? null : 'credible')}
                        aria-pressed={selectedLabel === 'credible'}
                        style={{
                          padding: '0.65rem 0.5rem',
                          borderRadius: 14,
                          border: `2px solid ${selectedLabel === 'credible' ? '#16a34a' : 'rgba(148,163,184,0.22)'}`,
                          background: selectedLabel === 'credible' ? 'rgba(22,163,74,0.1)' : 'transparent',
                          color: selectedLabel === 'credible' ? '#16a34a' : 'var(--ss-dashboard-muted)',
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
                        ✓ Credible
                      </button>
                    </div>
                    {!selectedLabel && (
                      <p style={{ fontSize: '0.74rem', color: 'var(--ss-dashboard-muted)', marginTop: '0.3rem' }}>
                        Select a signal before submitting
                      </p>
                    )}
                  </div>

                  {/* Signal hint */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.55rem',
                      padding: '0.75rem 0.9rem',
                      borderRadius: 12,
                      background: 'rgba(148,163,184,0.07)',
                      border: '1px solid rgba(148,163,184,0.15)',
                    }}
                  >
                    <i
                      className="fas fa-circle-info"
                      style={{ color: 'var(--ss-dashboard-teal)', marginTop: '0.1rem', flexShrink: 0, fontSize: '0.85rem' }}
                    />
                    <p style={{ fontSize: '0.76rem', color: 'var(--ss-dashboard-muted)', lineHeight: 1.55, margin: 0 }}>
                      You are providing a training signal, not a final verdict. Mark reviews that show
                      patterns of manipulation, spam, or low credibility as{' '}
                      <strong style={{ color: '#ea580c' }}>Suspicious</strong>. Mark reviews with
                      specific, balanced, authentic detail as{' '}
                      <strong style={{ color: '#16a34a' }}>Credible</strong>. The model learns from
                      these signals to estimate risk probability — users always see a score (0–100), never a label.
                    </p>
                  </div>

                  {/* Notes */}
                  <div>
                    <label
                      htmlFor="train-notes"
                      style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.84rem', color: 'var(--ss-dashboard-text)' }}
                    >
                      Notes <span style={{ color: 'var(--ss-dashboard-muted)', fontWeight: 400 }}>(optional)</span>
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
                    disabled={submitBusy || !reviewText.trim() || !selectedLabel || dupStatus === 'exact'}
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
                    className="ss-train-tab-pill"
                    style={{
                      display: 'flex',
                      gap: '0.35rem',
                      background: 'rgba(148,163,184,0.1)',
                      borderRadius: 12,
                      padding: '0.3rem',
                    }}
                  >
                    {(['all', 'suspicious', 'credible']).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setFilterTab(tab)}
                        style={{
                          padding: '0.38rem 0.85rem',
                          borderRadius: 9,
                          border: 'none',
                          background: filterTab === tab ? 'var(--ss-train-tab-bg)' : 'transparent',
                          color: filterTab === tab
                            ? tab === 'suspicious' ? '#ea580c' : tab === 'credible' ? '#16a34a' : 'var(--ss-dashboard-text)'
                            : 'var(--ss-dashboard-muted)',
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
                        {tab === 'suspicious' && `⚠️ Suspicious (${samples.filter((s) => s.label === 'suspicious').length})`}
                        {tab === 'credible' && `✓ Credible (${samples.filter((s) => s.label === 'credible').length})`}
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
                    <table className="ss-dashboard-table" style={{ minWidth: 580 }}>
                      <thead>
                        <tr>
                          <th style={{ width: '40%' }}>Text</th>
                          <th>Signal</th>
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
                                  background: sample.label === 'suspicious' ? 'rgba(234,88,12,0.1)' : 'rgba(22,163,74,0.1)',
                                  color: sample.label === 'suspicious' ? '#c2410c' : '#166534',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {sample.label === 'suspicious' ? '⚠️ Suspicious' : '✓ Credible'}
                              </span>
                            </td>

                            {/* Notes */}
                            <td style={{ maxWidth: 180 }}>
                              <span
                                title={sample.notes || undefined}
                                style={{
                                  display: 'block',
                                  fontSize: '0.8rem',
                                  color: 'var(--ss-dashboard-muted)',
                                  fontStyle: sample.notes ? 'normal' : 'italic',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  cursor: sample.notes ? 'help' : 'default',
                                }}
                              >
                                {sample.notes || '—'}
                              </span>
                            </td>

                            {/* Date */}
                            <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--ss-dashboard-muted)' }}>
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
          className="ss-train-sticky-bar"
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 40,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
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
                  disabled={healthAnyRed}
                  ref={trainBtnRef}
                  aria-describedby="train-tooltip"
                  className="ss-dashboard-btn ss-dashboard-btn-primary"
                  style={{
                    minHeight: 44,
                    opacity: healthAnyRed ? 0.52 : 1,
                    cursor: healthAnyRed ? 'not-allowed' : 'pointer',
                    filter: healthAnyRed ? 'grayscale(0.3)' : 'none',
                  }}
                >
                  <i
                    className={`fas ${
                      healthAnyRed
                        ? 'fa-lock'
                        : healthOnlyYellow
                          ? 'fa-triangle-exclamation'
                          : 'fa-brain'
                    }`}
                    style={{ marginRight: '0.5rem' }}
                  />
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
                      background: healthAnyRed
                        ? '#7f1d1d'
                        : healthOnlyYellow
                          ? '#78350f'
                          : '#0f172a',
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
                    <i
                      className={`fas ${
                        healthAnyRed
                          ? 'fa-lock'
                          : healthOnlyYellow
                            ? 'fa-triangle-exclamation'
                            : 'fa-circle-check'
                      }`}
                      style={{ marginRight: '0.4rem', fontSize: '0.7rem' }}
                    />
                    {healthAnyRed
                      ? `Need ${SAMPLE_MINIMUM} samples minimum (you have ${MOCK_TOTAL})`
                      : healthOnlyYellow
                        ? 'Quality issues detected — training may be affected'
                        : 'Ready to train'}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -5,
                        right: 16,
                        width: 10,
                        height: 10,
                        background: healthAnyRed
                          ? '#7f1d1d'
                          : healthOnlyYellow
                            ? '#78350f'
                            : '#0f172a',
                        transform: 'rotate(45deg)',
                        borderRadius: 2,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </main>

      <DashboardFooter />

      {/* Inline keyframes + dark mode vars */}
      <style>{`
        @keyframes ssTrainToastIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes ssTrainSkelPulse {
          0%, 100% { background-position: 200% 0; }
          50%       { background-position: -200% 0; }
        }
        :root {
          --ss-train-tab-bg: #fff;
        }
        .ss-train-sticky-bar {
          background: rgba(255,255,255,0.96);
          border-top: 1px solid rgba(148,163,184,0.18);
        }
        body.ss-theme-dark {
          --ss-train-tab-bg: rgba(30,41,59,0.92);
        }
        body.ss-theme-dark .ss-train-sticky-bar {
          background: rgba(15,23,42,0.96);
          border-top-color: rgba(148,163,184,0.22);
        }
        body.ss-theme-dark .ss-train-tab-pill {
          background: rgba(148,163,184,0.12);
        }
      `}</style>
    </div>
  );
}

export default AdminTraining;
