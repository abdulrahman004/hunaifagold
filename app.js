const PURCHASE_INR = 29100;
const PURCHASE_USD_INR = 95.15; // Frankfurter reference rate for 2026-08-07
const WEIGHT_GRAMS = 2;
const purchaseUsd = PURCHASE_INR / PURCHASE_USD_INR;

const byId = (id) => document.getElementById(id);
const inr = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const usd = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
const readableDate = (date) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(`${date}T12:00:00Z`));

let publishedRate = null;
let publishedDate = null;
let exchangeRate = null;
let exchangeDate = null;
let manualRate = null;

function render() {
  const rate = manualRate ?? publishedRate;
  const status = byId('rate-status');
  if (rate === null) {
    byId('value-inr').textContent = '—';
    byId('value-usd').textContent = '—';
    byId('profit-usd').textContent = '—';
    status.textContent = 'Rates unavailable';
    status.className = 'status error';
    byId('rate-meta').textContent = 'Could not load the published gold rate. Enter a local 22K rate or refresh later.';
    return;
  }
  const valueInr = rate * WEIGHT_GRAMS;
  byId('value-inr').textContent = inr(valueInr);
  if (exchangeRate !== null) {
    const valueUsd = valueInr / exchangeRate;
    const profitUsd = valueUsd - purchaseUsd;
    const profitPct = (profitUsd / purchaseUsd) * 100;
    byId('value-usd').textContent = usd(valueUsd);
    byId('profit-usd').textContent = `${profitUsd >= 0 ? '+' : '−'}${usd(Math.abs(profitUsd))}`;
    byId('profit-detail').textContent = `${profitUsd >= 0 ? '+' : '−'}${Math.abs(profitPct).toFixed(1)}% vs ${usd(purchaseUsd)} original cost`;
    byId('fx-detail').textContent = `$1 = ₹${exchangeRate.toFixed(2)} · ${readableDate(exchangeDate)}`;
  } else {
    byId('value-usd').textContent = '—';
    byId('profit-usd').textContent = '—';
    byId('fx-detail').textContent = 'Exchange rate unavailable';
    byId('profit-detail').textContent = 'Available when the exchange rate loads';
  }
  status.textContent = manualRate === null ? 'Published rate' : 'Your local quote';
  status.className = 'status';
  const goldText = manualRate === null
    ? `22K India benchmark: ${inr(rate)} per gram (${readableDate(publishedDate)}). This is an indicative rate for Hyderabad, not a Malabar buyback quote.`
    : `Your 22K Hyderabad quote: ${inr(rate)} per gram. The dollar estimate uses the latest reference FX rate.`;
  byId('rate-meta').textContent = `${goldText} ${exchangeRate === null ? 'USD/INR reference rate unavailable. ' : 'Gold and FX rates may be published on different days. '}Actual sale proceeds can differ.`;
}

async function loadRates() {
  byId('purchase-usd').textContent = usd(purchaseUsd);
  await Promise.allSettled([(async () => {
    const goldResponse = await fetch('https://snapdata.dev/api/v1/gold/in/latest.json', { cache: 'no-store' });
    if (!goldResponse.ok) throw new Error('Gold rate unavailable');
    const gold = await goldResponse.json();
    const observation = gold.observations?.find((item) => item.instrument === 'XAU.22K' && Number.isFinite(item.value) && item.value > 0);
    if (!observation) throw new Error('Unexpected gold rate data');
    publishedRate = observation.value;
    publishedDate = observation.date;
  })(), (async () => {
    const fxResponse = await fetch('https://api.frankfurter.dev/v2/rate/usd/inr', { cache: 'no-store' });
    if (!fxResponse.ok) throw new Error('Exchange rate unavailable');
    const fx = await fxResponse.json();
    if (fx.base !== 'USD' || fx.quote !== 'INR' || !Number.isFinite(fx.rate) || fx.rate <= 0) throw new Error('Unexpected exchange rate data');
    exchangeRate = fx.rate;
    exchangeDate = fx.date;
  })()]);
  render();
}

byId('rate-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const value = Number(byId('custom-rate').value);
  if (!Number.isFinite(value) || value <= 0 || value > 1000000) {
    byId('custom-rate').setCustomValidity('Enter a valid rate per gram.');
    byId('custom-rate').reportValidity();
    return;
  }
  byId('custom-rate').setCustomValidity('');
  manualRate = value;
  byId('reset-rate').hidden = false;
  render();
});
byId('custom-rate').addEventListener('input', () => byId('custom-rate').setCustomValidity(''));
byId('reset-rate').addEventListener('click', () => {
  manualRate = null;
  byId('custom-rate').value = '';
  byId('reset-rate').hidden = true;
  render();
});

loadRates();
