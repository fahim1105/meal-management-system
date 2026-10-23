import { Link } from 'react-router';

const CtaPanel = () => (
  <section className="py-16 px-5" style={{ background: 'var(--bg)', fontFamily: 'var(--font-body)' }}>
    <div className="max-w-3xl mx-auto">
      <div
        className="rounded-[24px] px-8 py-14 md:px-14 md:py-16 text-center"
        style={{ background: 'var(--deep)' }}
      >
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 800,
          fontSize: 'clamp(26px,4vw,38px)',
          letterSpacing: '-0.015em',
          lineHeight: 1.15,
          color: '#FFFFFF',
          marginBottom: 14,
        }}>
          Ready to simplify your mess?
        </h2>
        <p style={{
          color: 'rgba(255,255,255,0.65)',
          fontSize: 16,
          lineHeight: 1.65,
          maxWidth: '48ch',
          margin: '0 auto 32px',
        }}>
          Join the groups already using Mess Manager to track meals and manage money.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/register"
            className="hg-focus inline-flex items-center justify-center gap-2 font-600 rounded-[var(--radius-sm)] px-7 py-3 transition-all duration-150 hover:opacity-90 active:scale-95"
            style={{
              background: 'var(--color-accent-2)',
              color: 'var(--deep)',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Create free account
          </Link>
          <Link
            to="/login"
            className="hg-focus inline-flex items-center justify-center gap-2 font-600 rounded-[var(--radius-sm)] px-7 py-3 transition-all duration-150 hover:bg-white/10 active:scale-95"
            style={{
              border: '1.5px solid var(--color-accent-2)',
              color: 'var(--color-accent-2)',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  </section>
);

export default CtaPanel;
