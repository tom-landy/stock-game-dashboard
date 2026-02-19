const STORAGE_KEY = "stockGameDashboardV2";
const START_DATE = "2026-01-30";
const START_CAPITAL_GBP = 100;
const PEOPLE = ["Tom", "Joe", "Nic"];

const state = {
  portfolios: {
    Tom: [],
    Joe: [],
    Nic: [
      {
        id: id(),
        asset: "Franklin FTSE India",
        ticker: "FRIN",
        weight: 25,
        buyPrice: 1,
        currentPrice: 1,
        buyDate: START_DATE
      },
      {
        id: id(),
        asset: "HSBC MSCI China",
        ticker: "HMCH",
        weight: 25,
        buyPrice: 1,
        currentPrice: 1,
        buyDate: START_DATE
      },
      {
        id: id(),
        asset: "Invesco FTSE All-World",
        ticker: "FWRG",
        weight: 25,
        buyPrice: 1,
        currentPrice: 1,
        buyDate: START_DATE
      },
      {
        id: id(),
        asset: "Vanguard S&P 500",
        ticker: "VUAG",
        weight: 25,
        buyPrice: 1,
        currentPrice: 1,
        buyDate: START_DATE
      }
    ]
  }
};

const columnsRoot = document.getElementById("columnsRoot");
const statusEl = document.getElementById("status");

function id() {
  return Math.random().toString(36).slice(2, 10);
}

function money(v) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2
  }).format(v);
}

function pct(v) {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.portfolios && typeof parsed.portfolios === "object") {
      for (const p of PEOPLE) {
        state.portfolios[p] = Array.isArray(parsed.portfolios[p]) ? parsed.portfolios[p] : [];
      }
    }
  } catch {
    setStatus("Could not read saved data.");
  }
}

function writeStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function defaultPortfolios() {
  // Each person starts with GBP 100 split by portfolio weights.
  return {
    Tom: [
      {
        id: id(),
        asset: "Invesco EURO STOXX 50",
        ticker: "SX5S",
        weight: 50,
        buyPrice: 1,
        currentPrice: 1,
        buyDate: START_DATE
      },
      {
        id: id(),
        asset: "SPDR S&P 500",
        ticker: "SPXL",
        weight: 50,
        buyPrice: 1,
        currentPrice: 1,
        buyDate: START_DATE
      }
    ],
    Joe: [
      {
        id: id(),
        asset: "HSBC EURO STOXX 50",
        ticker: "H50A",
        weight: 20,
        buyPrice: 1,
        currentPrice: 1,
        buyDate: START_DATE
      },
      {
        id: id(),
        asset: "J.P. Morgan GBP Ultra-Short Income",
        ticker: "JGST",
        weight: 20,
        buyPrice: 1,
        currentPrice: 1,
        buyDate: START_DATE
      },
      {
        id: id(),
        asset: "iShares UK Dividend",
        ticker: "IUKD",
        weight: 15,
        buyPrice: 1,
        currentPrice: 1,
        buyDate: START_DATE
      },
      {
        id: id(),
        asset: "JPM Global High Yield Corporate Bond Multi-Factor",
        ticker: "JHYP",
        weight: 15,
        buyPrice: 1,
        currentPrice: 1,
        buyDate: START_DATE
      },
      {
        id: id(),
        asset: "VanEck Morningstar Developed Market Dividend Leaders",
        ticker: "TDGB",
        weight: 15,
        buyPrice: 1,
        currentPrice: 1,
        buyDate: START_DATE
      },
      {
        id: id(),
        asset: "Xtrackers FTSE 100 Income",
        ticker: "XUKX",
        weight: 15,
        buyPrice: 1,
        currentPrice: 1,
        buyDate: START_DATE
      }
    ],
    Nic: [
      {
        id: id(),
        asset: "Franklin FTSE India",
        ticker: "FRIN",
        weight: 25,
        buyPrice: 1,
        currentPrice: 1,
        buyDate: START_DATE
      },
      {
        id: id(),
        asset: "HSBC MSCI China",
        ticker: "HMCH",
        weight: 25,
        buyPrice: 1,
        currentPrice: 1,
        buyDate: START_DATE
      },
      {
        id: id(),
        asset: "Invesco FTSE All-World",
        ticker: "FWRG",
        weight: 25,
        buyPrice: 1,
        currentPrice: 1,
        buyDate: START_DATE
      },
      {
        id: id(),
        asset: "Vanguard S&P 500",
        ticker: "VUAG",
        weight: 25,
        buyPrice: 1,
        currentPrice: 1,
        buyDate: START_DATE
      }
    ]
  };
}

function ensureData() {
  const hasAny = PEOPLE.some((p) => state.portfolios[p].length > 0);
  if (!hasAny) {
    state.portfolios = defaultPortfolios();
    writeStore();
  }
}

function aggregateStats(holdings) {
  const totalWeight = holdings.reduce((s, h) => s + h.weight, 0);
  if (!totalWeight) {
    return {
      startValue: 0,
      currentValue: 0,
      plDollar: 0,
      plPercent: 0
    };
  }

  let startValue = 0;
  let currentValue = 0;

  for (const h of holdings) {
    const startPrice = h.buyPrice > 0 ? h.buyPrice : 1;
    const nowPrice = h.currentPrice > 0 ? h.currentPrice : startPrice;
    const allocation = START_CAPITAL_GBP * (h.weight / totalWeight);
    startValue += allocation;
    currentValue += allocation * (nowPrice / startPrice);
  }

  const plDollar = currentValue - startValue;
  const plPercent = startValue ? (plDollar / startValue) * 100 : 0;

  return { startValue, currentValue, plDollar, plPercent };
}

function buildPath(points, width, height, pad = 8) {
  if (!points.length) return "";
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = Math.max(max - min, 0.01);

  return points
    .map((p, i) => {
      const x = pad + (i / Math.max(points.length - 1, 1)) * (width - pad * 2);
      const y = height - pad - ((p.value - min) / range) * (height - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function monthTicks() {
  const start = new Date(`${START_DATE}T00:00:00`);
  const now = new Date();
  const points = [];
  let cursor = new Date(start);

  while (cursor <= now) {
    points.push(cursor.toISOString().slice(0, 10));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  if (points[points.length - 1] !== now.toISOString().slice(0, 10)) {
    points.push(now.toISOString().slice(0, 10));
  }

  return points;
}

function fallbackSeries(holdings) {
  const ticks = monthTicks();
  const stats = aggregateStats(holdings);
  const drift = stats.plPercent;

  return ticks.map((date, i) => {
    const t = i / Math.max(ticks.length - 1, 1);
    return { date, value: drift * t };
  });
}

async function fetchQuote(symbol) {
  const url = `/api/quote?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Quote HTTP ${res.status}`);
  if (!data || typeof data.c !== "number" || data.c <= 0) {
    throw new Error("Invalid quote");
  }
  return { price: data.c, resolvedSymbol: data._resolvedSymbol || symbol };
}

async function checkApiHealth() {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data && data.ok);
  } catch {
    return false;
  }
}

async function fetchCandles(symbol) {
  const url = `/api/candles?symbol=${encodeURIComponent(symbol)}&start=${encodeURIComponent(START_DATE)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Candle HTTP ${res.status}`);
  if (!data || data.s !== "ok" || !Array.isArray(data.c) || !Array.isArray(data.t)) {
    throw new Error("No candle data");
  }
  const out = [];
  for (let i = 0; i < data.c.length; i += 1) {
    const close = data.c[i];
    const ts = data.t[i];
    if (typeof close !== "number" || close <= 0) continue;
    out.push({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      close
    });
  }
  return { candles: out, resolvedSymbol: data._resolvedSymbol || symbol };
}

async function updateLivePrices() {
  let ok = 0;
  let fail = 0;
  const failed = [];

  for (const person of PEOPLE) {
    for (const h of state.portfolios[person]) {
      try {
        const [quote, candles] = await Promise.all([
          fetchQuote(h.ticker),
          fetchCandles(h.ticker)
        ]);
        h.currentPrice = quote.price;
        if (candles.candles.length > 0) {
          h.buyPrice = candles.candles[0].close;
        }
        ok += 1;
      } catch (err) {
        fail += 1;
        failed.push(`${h.ticker} (${err.message})`);
      }
    }
  }

  writeStore();
  const failMsg = fail ? ` Failed tickers: ${failed.slice(0, 4).join(" | ")}${failed.length > 4 ? " ..." : ""}` : "";
  setStatus(`Live price refresh finished. Updated: ${ok}, failed: ${fail}.${failMsg}`);
  render();
}

async function buildSeriesForPerson(person) {
  const holdings = state.portfolios[person];
  if (holdings.length === 0) return [];

  const totalWeight = holdings.reduce((sum, h) => sum + h.weight, 0) || 1;
  const byDate = new Map();
  let success = 0;

  for (const h of holdings) {
    try {
      const { candles } = await fetchCandles(h.ticker);
      if (!candles.length) continue;
      success += 1;

      const base = candles[0].close;
      for (const c of candles) {
        const contribution = (h.weight / totalWeight) * ((c.close / base) - 1) * 100;
        byDate.set(c.date, (byDate.get(c.date) || 0) + contribution);
      }
    } catch {
      // Ignore individual ticker failures and continue.
    }
  }

  if (success === 0 || byDate.size === 0) {
    return fallbackSeries(holdings);
  }

  const sorted = [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return sorted;
}

function renderColumn(person, series) {
  const cls = person.toLowerCase();
  const holdings = state.portfolios[person];
  const stats = aggregateStats(holdings);
  const path = buildPath(series, 360, 130);
  const toneClass = stats.plPercent >= 0 ? "up" : "down";

  const holdingsHtml = holdings.length
    ? holdings
        .map((h) => {
          const ret = ((h.currentPrice - h.buyPrice) / h.buyPrice) * 100;
          const retClass = ret >= 0 ? "up" : "down";
          return `
            <article class="holding">
              <div class="holding-top">
                <div class="asset">${h.asset}</div>
                <div>${h.weight}%</div>
              </div>
              <div class="sub">${h.ticker} • Start (${h.buyDate}): ${money(h.buyPrice)}</div>
              <div class="price-input">
                <input data-price-id="${h.id}" data-person="${person}" type="number" step="0.0001" min="0.0001" value="${h.currentPrice.toFixed(4)}" />
                <span class="${retClass}">${pct(ret)}</span>
              </div>
            </article>
          `;
        })
        .join("")
    : `<p class="muted">No holdings yet for ${person}. Add Nic later.</p>`;

  return `
    <section class="column ${cls}">
      <div>
        <h2>${person}</h2>
        <div class="meta">Started with ${money(START_CAPITAL_GBP)} on January 30, 2026</div>
      </div>

      <div class="kpis">
        <div class="kpi">
          <div class="label">Start Value</div>
          <div class="value">${money(stats.startValue)}</div>
        </div>
        <div class="kpi">
          <div class="label">Current Value</div>
          <div class="value">${money(stats.currentValue)}</div>
        </div>
        <div class="kpi">
          <div class="label">P/L ($)</div>
          <div class="value ${toneClass}">${money(stats.plDollar)}</div>
        </div>
        <div class="kpi">
          <div class="label">P/L (%)</div>
          <div class="value ${toneClass}">${pct(stats.plPercent)}</div>
        </div>
      </div>

      <div class="chart-wrap">
        <p class="chart-title">Graph: current cost vs Jan 30, 2026 start cost</p>
        <svg class="chart" viewBox="0 0 360 130" preserveAspectRatio="none" role="img" aria-label="${person} performance graph">
          <line class="axis-line" x1="8" y1="65" x2="352" y2="65"></line>
          <path class="path ${cls}" d="${path}"></path>
        </svg>
      </div>

      <div class="holdings">
        ${holdingsHtml}
      </div>
    </section>
  `;
}

async function render() {
  const seriesMap = {};
  for (const person of PEOPLE) {
    seriesMap[person] = await buildSeriesForPerson(person);
  }

  columnsRoot.innerHTML = PEOPLE.map((p) => renderColumn(p, seriesMap[p])).join("");

  columnsRoot.querySelectorAll("[data-price-id]").forEach((input) => {
    input.addEventListener("change", (ev) => {
      const el = ev.currentTarget;
      const person = el.dataset.person;
      const rowId = el.dataset.priceId;
      const val = Number(el.value);
      if (!person || !rowId || !Number.isFinite(val) || val <= 0) return;
      const item = state.portfolios[person].find((h) => h.id === rowId);
      if (!item) return;
      item.currentPrice = val;
      writeStore();
      render();
    });
  });
}

document.getElementById("loadProvided").addEventListener("click", async () => {
  state.portfolios = defaultPortfolios();
  writeStore();
  await render();

  const healthy = await checkApiHealth();
  if (!healthy) {
    setStatus("Portfolios loaded. Live API is unreachable. Start server.py and open http://127.0.0.1:8787 (not file://).");
    return;
  }

  setStatus("Portfolios loaded. Refreshing live quotes and trend data...");
  await updateLivePrices();
  await render();
});

document.getElementById("clearAll").addEventListener("click", async () => {
  state.portfolios = { Tom: [], Joe: [], Nic: [] };
  writeStore();
  setStatus("All columns cleared.");
  await render();
});

async function init() {
  if (window.location.protocol === "file:") {
    setStatus("Open this app via http://127.0.0.1:8787. Live data will fail on file:// pages.");
  }
  readStore();
  ensureData();
  await render();
}

init();
