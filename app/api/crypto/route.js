import { NextResponse } from "next/server";

const CRYPTO_LIST = [
    { id: "bitcoin", symbol: "BTC", upbitMarket: "KRW-BTC" },
    { id: "ethereum", symbol: "ETH", upbitMarket: "KRW-ETH" },
    { id: "ripple", symbol: "XRP", upbitMarket: "KRW-XRP" },
    { id: "solana", symbol: "SOL", upbitMarket: "KRW-SOL" },
    { id: "dogecoin", symbol: "DOGE", upbitMarket: "KRW-DOGE" },
    { id: "cardano", symbol: "ADA", upbitMarket: "KRW-ADA" },
    { id: "avalanche-2", symbol: "AVAX", upbitMarket: "KRW-AVAX" },
    { id: "chainlink", symbol: "LINK", upbitMarket: "KRW-LINK" },
];

const COINGECKO_IDS = CRYPTO_LIST.map((c) => c.id).join(",");

export async function GET() {
    try {
        const [coingeckoRes, bithumbRes, upbitRes] = await Promise.allSettled([
            fetch(
                `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COINGECKO_IDS}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`,
                { next: { revalidate: 5 } } // 5초 캐싱
            ),
            fetch("https://api.bithumb.com/public/ticker/ALL_KRW", { cache: "no-store" }),
            fetch(
                `https://api.upbit.com/v1/ticker?markets=${CRYPTO_LIST.map((c) => c.upbitMarket).join(",")}`,
                { cache: "no-store" }
            ),
        ]);

        let coingeckoData = [];
        let bithumbData = {};
        let upbitData = [];

        if (coingeckoRes.status === "fulfilled" && coingeckoRes.value.ok) {
            coingeckoData = await coingeckoRes.value.json();
        }

        if (bithumbRes.status === "fulfilled" && bithumbRes.value.ok) {
            const bithumbJson = await bithumbRes.value.json();
            if (bithumbJson.status === "0000") {
                bithumbData = bithumbJson.data;
            }
        }

        if (upbitRes.status === "fulfilled" && upbitRes.value.ok) {
            upbitData = await upbitRes.value.json();
        }

        return NextResponse.json({
            coingecko: coingeckoData,
            bithumb: bithumbData,
            upbit: upbitData,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("API Route Error:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}
