"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";

// 8개 주요 가상자산 정의
const CRYPTO_LIST = [
  { id: "bitcoin", symbol: "BTC", nameKo: "비트코인", bithumbSymbol: "BTC", upbitMarket: "KRW-BTC", icon: "₿" },
  { id: "ethereum", symbol: "ETH", nameKo: "이더리움", bithumbSymbol: "ETH", upbitMarket: "KRW-ETH", icon: "Ξ" },
  { id: "ripple", symbol: "XRP", nameKo: "리플", bithumbSymbol: "XRP", upbitMarket: "KRW-XRP", icon: "✕" },
  { id: "solana", symbol: "SOL", nameKo: "솔라나", bithumbSymbol: "SOL", upbitMarket: "KRW-SOL", icon: "◎" },
  { id: "dogecoin", symbol: "DOGE", nameKo: "도지코인", bithumbSymbol: "DOGE", upbitMarket: "KRW-DOGE", icon: "Ð" },
  { id: "cardano", symbol: "ADA", nameKo: "에이다", bithumbSymbol: "ADA", upbitMarket: "KRW-ADA", icon: "₳" },
  { id: "avalanche-2", symbol: "AVAX", nameKo: "아발란체", bithumbSymbol: "AVAX", upbitMarket: "KRW-AVAX", icon: "▲" },
  { id: "chainlink", symbol: "LINK", nameKo: "체인링크", bithumbSymbol: "LINK", upbitMarket: "KRW-LINK", icon: "⬡" },
];

const COINGECKO_IDS = CRYPTO_LIST.map((c) => c.id);

// 숫자 포맷팅 함수
const formatNumber = (num, decimals = 2) => {
  if (!num || isNaN(num)) return "0";
  if (num >= 1e12) return (num / 1e12).toFixed(decimals) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(decimals) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(decimals) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(decimals) + "K";
  return num.toLocaleString("ko-KR", { maximumFractionDigits: decimals });
};

const formatPrice = (price, symbol) => {
  if (!price || isNaN(price)) return "0";
  if (price >= 1000000) {
    return price.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  }
  if (price >= 1000) {
    return price.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  }
  return price.toLocaleString("ko-KR", {
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 4 : 2,
  });
};

// 시드 기반 난수 생성기 (hydration 에러 방지)
const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const generateChartBars = (priceChange, coinId = "default") => {
  const bars = [];
  const baseHeight = 20;
  const variation = priceChange > 0 ? 15 : -15;
  const baseSeed = hashString(coinId);

  for (let i = 0; i < 24; i++) {
    const randomVariation = seededRandom(baseSeed + i) * 20 - 10;
    const trend = (i / 24) * variation;
    const height = Math.max(4, baseHeight + trend + randomVariation);
    bars.push(height);
  }
  return bars;
};

export default function Home() {
  const [cryptoData, setCryptoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [totalMarketCap, setTotalMarketCap] = useState(0);
  const [total24hVolume, setTotal24hVolume] = useState(0);

  const fetchCryptoData = useCallback(async () => {
    try {
      // 병렬로 모든 API 호출
      const [coingeckoRes, bithumbRes, upbitRes] = await Promise.allSettled([
        // CoinGecko API (글로벌 데이터)
        fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COINGECKO_IDS.join(
            ","
          )}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`
        ),
        // 빗썸 API
        fetch("https://api.bithumb.com/public/ticker/ALL_KRW"),
        // 업비트 API
        fetch(
          `https://api.upbit.com/v1/ticker?markets=${CRYPTO_LIST.map((c) => c.upbitMarket).join(",")}`
        ),
      ]);

      let coingeckoData = [];
      let bithumbData = {};
      let upbitData = [];

      // CoinGecko 데이터 파싱
      if (coingeckoRes.status === "fulfilled" && coingeckoRes.value.ok) {
        coingeckoData = await coingeckoRes.value.json();
      }

      // 빗썸 데이터 파싱
      if (bithumbRes.status === "fulfilled" && bithumbRes.value.ok) {
        const bithumbJson = await bithumbRes.value.json();
        if (bithumbJson.status === "0000") {
          bithumbData = bithumbJson.data;
        }
      }

      // 업비트 데이터 파싱
      if (upbitRes.status === "fulfilled" && upbitRes.value.ok) {
        upbitData = await upbitRes.value.json();
      }

      // 데이터 통합
      const processedData = CRYPTO_LIST.map((crypto) => {
        // CoinGecko 데이터 찾기
        const geckoInfo = coingeckoData.find((c) => c.id === crypto.id) || {};

        // 빗썸 데이터 찾기
        const bithumbInfo = bithumbData[crypto.bithumbSymbol] || {};
        const bithumbVolume24h = parseFloat(bithumbInfo.acc_trade_value_24H) || 0;

        // 업비트 데이터 찾기
        const upbitInfo = upbitData.find((u) => u.market === crypto.upbitMarket) || {};
        const upbitVolume24h = parseFloat(upbitInfo.acc_trade_price_24h) || 0;

        // 한국 거래소 가격 (빗썸 기준)
        const krwPrice = parseFloat(bithumbInfo.closing_price) || 0;
        const priceChange24h = parseFloat(bithumbInfo.fluctate_rate_24H) ||
          geckoInfo.price_change_percentage_24h || 0;

        return {
          id: crypto.id,
          name: geckoInfo.name || crypto.symbol,
          nameKo: crypto.nameKo,
          symbol: crypto.symbol,
          icon: crypto.icon,
          image: geckoInfo.image || null,
          currentPriceUsd: geckoInfo.current_price || 0,
          currentPriceKrw: krwPrice,
          priceChange24h: priceChange24h,
          marketCap: geckoInfo.market_cap || 0,
          // 거래소별 거래량
          bithumbVolume24h: bithumbVolume24h,
          upbitVolume24h: upbitVolume24h,
          totalKrVolume24h: bithumbVolume24h + upbitVolume24h,
          // 글로벌 거래량
          globalVolume24h: geckoInfo.total_volume || 0,
          high24h: parseFloat(bithumbInfo.max_price) || geckoInfo.high_24h || 0,
          low24h: parseFloat(bithumbInfo.min_price) || geckoInfo.low_24h || 0,
          chartBars: generateChartBars(priceChange24h, crypto.id),
        };
      });

      setCryptoData(processedData);
      setTotalMarketCap(processedData.reduce((sum, coin) => sum + coin.marketCap, 0));
      setTotal24hVolume(processedData.reduce((sum, coin) => sum + coin.totalKrVolume24h, 0));
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error("Error fetching crypto data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 5000);
    return () => clearInterval(interval);
  }, [fetchCryptoData]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>실시간 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <span className={styles.errorIcon}>⚠️</span>
          <h2 className={styles.errorTitle}>데이터 로딩 실패</h2>
          <p className={styles.errorMessage}>{error}</p>
          <button className={styles.retryButton} onClick={fetchCryptoData}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const avgChange =
    cryptoData.length > 0
      ? cryptoData.reduce((sum, coin) => sum + coin.priceChange24h, 0) / cryptoData.length
      : 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerBadge}>
          <span className={styles.liveDot}></span>
          실시간 업데이트
        </div>
        <h1 className={styles.title}>CryptoLive</h1>
        <p className={styles.subtitle}>
          주요 가상자산 8종의 실시간 시세 및 거래소별 거래량을 확인하세요
        </p>
      </header>

      {/* Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>총 시가총액</div>
          <div className={styles.statValue}>${formatNumber(totalMarketCap)}</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>국내 24H 거래량</div>
          <div className={styles.statValue}>₩{formatNumber(total24hVolume)}</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>평균 변동률</div>
          <div
            className={`${styles.statValue} ${avgChange >= 0 ? styles.statValueUp : styles.statValueDown
              }`}
          >
            {avgChange >= 0 ? "+" : ""}
            {avgChange.toFixed(2)}%
          </div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>추적 종목</div>
          <div className={styles.statValue}>{cryptoData.length}개</div>
        </div>
      </div>

      {/* Exchange Legend */}
      <div className={styles.exchangeLegend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDotUpbit}></span>
          업비트
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDotBithumb}></span>
          빗썸
        </div>
      </div>

      {/* Crypto Grid */}
      <div className={styles.cryptoGrid}>
        {cryptoData.map((coin) => (
          <div key={coin.id} className={styles.cryptoCard}>
            <div className={styles.cardHeader}>
              <div className={styles.coinInfo}>
                {coin.image ? (
                  <img
                    src={coin.image}
                    alt={coin.name}
                    className={styles.coinIconImage}
                  />
                ) : (
                  <div className={styles.coinIcon}>{coin.icon}</div>
                )}
                <div className={styles.coinDetails}>
                  <span className={styles.coinName}>{coin.nameKo}</span>
                  <span className={styles.coinSymbol}>{coin.symbol}</span>
                </div>
              </div>
              <div
                className={`${styles.changeTag} ${coin.priceChange24h >= 0 ? styles.changeUp : styles.changeDown
                  }`}
              >
                {coin.priceChange24h >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(coin.priceChange24h).toFixed(2)}%
              </div>
            </div>

            <div className={styles.priceSection}>
              <div className={styles.currentPrice}>
                ₩{formatPrice(coin.currentPriceKrw)}
              </div>
              {coin.currentPriceUsd > 0 && (
                <div className={styles.priceUsd}>
                  ${formatPrice(coin.currentPriceUsd)}
                </div>
              )}
            </div>

            <div className={styles.miniChart}>
              {coin.chartBars.map((height, index) => (
                <div
                  key={index}
                  className={styles.chartBar}
                  style={{
                    height: `${height}px`,
                    background:
                      coin.priceChange24h >= 0
                        ? "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)"
                        : "linear-gradient(180deg, #ef4444 0%, #dc2626 100%)",
                  }}
                />
              ))}
            </div>

            {/* 거래소별 거래량 */}
            <div className={styles.exchangeVolumes}>
              <div className={styles.volumeHeader}>24시간 거래량</div>
              <div className={styles.volumeRow}>
                <div className={styles.volumeItem}>
                  <span className={styles.exchangeBadgeUpbit}>업비트</span>
                  <span className={styles.volumeValue}>
                    ₩{formatNumber(coin.upbitVolume24h)}
                  </span>
                </div>
                <div className={styles.volumeItem}>
                  <span className={styles.exchangeBadgeBithumb}>빗썸</span>
                  <span className={styles.volumeValue}>
                    ₩{formatNumber(coin.bithumbVolume24h)}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <div className={styles.statBoxLabel}>시가총액</div>
                <div className={styles.statBoxValue}>
                  ${formatNumber(coin.marketCap)}
                </div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statBoxLabel}>글로벌 거래량</div>
                <div className={styles.statBoxValue}>
                  ${formatNumber(coin.globalVolume24h)}
                </div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statBoxLabel}>24H 최고가</div>
                <div className={styles.statBoxValue}>
                  ₩{formatPrice(coin.high24h)}
                </div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statBoxLabel}>24H 최저가</div>
                <div className={styles.statBoxValue}>
                  ₩{formatPrice(coin.low24h)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Update Info */}
      <div className={styles.updateInfo}>
        <span className={styles.updateDot}></span>
        마지막 업데이트:{" "}
        {lastUpdate
          ? lastUpdate.toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
          : "-"}{" "}
        (5초마다 자동 갱신)
      </div>
    </div>
  );
}
