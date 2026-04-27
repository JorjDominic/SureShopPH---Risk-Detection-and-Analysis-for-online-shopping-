import { useEffect, useRef } from 'react';

function SignOutModal({ isOpen, onConfirm, onCancel, busy }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };

    document.addEventListener('keydown', onKey);
    cancelRef.current?.focus();

    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, busy, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="ss-signout-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ss-signout-title"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}
    >
      <div className="ss-signout-modal">
        <div className="ss-signout-icon-wrap" aria-hidden="true">
          <i className="fas fa-sign-out-alt"></i>
        </div>
        <h2 id="ss-signout-title" className="ss-signout-title">Sign out?</h2>
        <p className="ss-signout-message">
          You will be signed out of your SureShop account. Any unsaved progress will be lost.
        </p>
        <div className="ss-signout-actions">
          <button
            ref={cancelRef}
            type="button"
            className="ss-signout-btn-cancel"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ss-signout-btn-confirm"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className="ss-signout-spinner" aria-hidden="true" />
                Signing out&hellip;
              </>
            ) : (
              <>
                <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
                Sign out
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignOutModal;
