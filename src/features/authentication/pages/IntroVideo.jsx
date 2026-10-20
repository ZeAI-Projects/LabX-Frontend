import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

export const IntroVideo = () => {
  const navigate = useNavigate();
  const [reduceMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const continueToWelcome = () => {
    navigate('/', { replace: true });
  };

  if (reduceMotion) return <Navigate to="/" replace />;

  return (
    <main
      aria-label="Welcome animation"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      <video
        autoPlay
        muted
        playsInline
        onEnded={continueToWelcome}
        onError={continueToWelcome}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      >
        <source src="/videos/labx-intro.mp4" type="video/mp4" onError={continueToWelcome} />
      </video>

      <button
        type="button"
        onClick={continueToWelcome}
        aria-label="Skip welcome animation"
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          padding: '10px 18px',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          borderRadius: '9999px',
          background: 'rgba(0, 0, 0, 0.55)',
          color: '#fff',
          fontWeight: 800,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}
      >
        Skip
      </button>
    </main>
  );
};
