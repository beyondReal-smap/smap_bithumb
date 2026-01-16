import "./globals.css";

export const metadata = {
  title: "CryptoLive - 실시간 암호화폐 대시보드",
  description: "BTC, ETH, XRP, SOL, DOGE 등 주요 가상자산의 실시간 시세 및 시장 현황을 한눈에 확인하세요.",
  keywords: "cryptocurrency, bitcoin, ethereum, crypto dashboard, 암호화폐, 비트코인, 이더리움, 실시간 시세",
  authors: [{ name: "CryptoLive" }],
  openGraph: {
    title: "CryptoLive - 실시간 암호화폐 대시보드",
    description: "주요 가상자산의 실시간 시세 및 시장 현황",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
