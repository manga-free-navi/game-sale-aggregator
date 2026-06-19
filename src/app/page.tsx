'use client';

import dynamic from 'next/dynamic';

// ハイドレーションミスマッチを防止するため、メインアプリをSSR無効で動的ロード
const MainApp = dynamic(() => import('../components/MainApp'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '70vh',
        color: '#f8fafc',
        backgroundColor: '#0b0f19',
        fontSize: '1.2rem',
        fontWeight: 600
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '3.5rem',
          height: '3.5rem',
          background: 'linear-gradient(135deg, #39ff14 0%, #00f2fe 100%)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          color: '#0b0f19',
          fontSize: '1.5rem',
          boxShadow: '0 0 15px rgba(57, 255, 20, 0.35)'
        }}>G</div>
        <span>ゲーム情報をロード中...</span>
      </div>
    </div>
  ),
});

export default function Home() {
  return <MainApp />;
}
