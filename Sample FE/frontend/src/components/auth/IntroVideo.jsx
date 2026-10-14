import React from 'react';
import { useNavigate } from 'react-router-dom';

export const IntroVideo = () => {
  const navigate = useNavigate();

  const continueToRegister = () => {
    navigate('/register', { replace: true });
  };

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
        onEnded={continueToRegister}
        onError={continueToRegister}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      >
        <source src="/videos/labx-intro.mp4" type="video/mp4" />
      </video>

      <button
        type="button"
        onClick={continueToRegister}
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
