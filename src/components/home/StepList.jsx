const STEPS = [
  {
    n: 1,
    title: 'Create an account',
    desc: 'Sign up for free in seconds.',
  },
  {
    n: 2,
    title: 'Create or join a group',
    desc: 'Start a new mess or enter your group\'s code.',
  },
  {
    n: 3,
    title: 'Track and manage',
    desc: 'Log meals, add bazar costs and deposits, then download the monthly report.',
  },
];

const StepList = () => (
  <section className="py-20 px-5" style={{ background: 'var(--surface)', fontFamily: 'var(--font-body)' }}>
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-14">
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(28px,4vw,40px)',
          fontWeight: 800,
          letterSpacing: '-0.015em',
          lineHeight: 1.1,
          color: 'var(--text)',
          marginBottom: 12,
        }}>
          Start in 3 steps
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 16, maxWidth: '44ch', margin: '0 auto' }}>
          No complicated setup. Just sign up, join your group, and start managing.
        </p>
      </div>

      {/* Desktop: 3 columns + connecting line */}
      <div className="hidden md:grid grid-cols-3 gap-0 relative">
        {/* connector line */}
        <div className="absolute top-8 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px"
          style={{ background: 'var(--color-accent-1)', zIndex: 0 }} />

        {STEPS.map((s) => (
          <div key={s.n} className="flex flex-col items-center text-center px-6 relative z-10">
            {/* numbered circle */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-5 shrink-0"
              style={{ background: 'var(--color-primary)', boxShadow: '0 4px 16px rgba(92,112,87,0.22)' }}
            >
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 22,
                color: 'var(--on-primary)',
              }}>{s.n}</span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>
              {s.title}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6, maxWidth: '22ch', margin: '0 auto' }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Mobile: vertical stack + line */}
      <div className="md:hidden flex flex-col gap-0 relative">
        {/* vertical line */}
        <div className="absolute left-7 top-8 bottom-8 w-px"
          style={{ background: 'var(--color-accent-1)', zIndex: 0 }} />

        {STEPS.map((s) => (
          <div key={s.n} className="flex items-start gap-5 py-5 relative z-10">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-primary)', boxShadow: '0 4px 12px rgba(92,112,87,0.2)' }}
            >
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 20, color: 'var(--on-primary)' }}>
                {s.n}
              </span>
            </div>
            <div className="pt-2">
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 4 }}>
                {s.title}
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default StepList;
