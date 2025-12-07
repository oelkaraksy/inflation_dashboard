// -----------------------------
//filenames from gethub (place your CSVs in /data/)
const FILES = {
  inflationDetails: 'https://github.com/oelkaraksy/inflation_dashboard/blob/43c63f04d3733dbb7d0a7edbd5e972ce52e96acf/October_Inflation_Data.csv',
  annualHistory: 'https://github.com/oelkaraksy/inflation_dashboard/blob/43c63f04d3733dbb7d0a7edbd5e972ce52e96acf/Annual_Inflation_Historical_Data.csv',
  monthlyHistory: 'https://github.com/oelkaraksy/inflation_dashboard/blob/43c63f04d3733dbb7d0a7edbd5e972ce52e96acf/Monthly_Inflation_Historical_Data.csv'
};


// -----------------------------
// Robust CSV parser (handles quoted fields and commas inside quotes)
function parseCSVString(csv) {
  const rows = [];
  const lines = csv.split(/\r?\n/);
  for (let raw of lines) {
    if (raw.trim() === '') continue;
    const row = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === '"' ) {
        if (inQuotes && raw[i+1] === '"') { cur += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        row.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    row.push(cur);
    rows.push(row.map(v => v.trim()));
  }
  return rows;
}

// -----------------------------
// Attempt to fetch text; returns null on 404 or error
async function fetchTextOrNull(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    return null;
  }
}



// -----------------------------

function toNumber(s) {
  if (s === null || s === undefined) return NaN;
  if (typeof s === 'number') return s;
  const cleaned = (''+s).replace(/%/g, '').replace(/,/g, '').trim();
  if (cleaned === '') return NaN;
  return parseFloat(cleaned);
}


// -----------------------------

function parseInflationDetails(rows){
const items=[];
for(let i=1;i<rows.length;i++){
const r=rows[i]; if(r.length<5) continue;
items.push({
type:r[0], item:r[1],
weight: toNumber(r[2])||0,
annual: toNumber(r[3])||0,
monthly: toNumber(r[4])||0
});
}
return items;
}


// -----------------------------

function parseHistorical(rows) {
  const arr = [];
  for (let r of rows) {
    if (r.length < 2) continue;
    const date = r[0];
    const value = toNumber(r[1]);
    if (isNaN(value)) continue;
    arr.push({ date, rate: value });
  }
  return arr;
}

// -----------------------------

const leaderLinesPlugin = {
  id: 'leaderLines',
  afterDraw: (chart) => {
    if (chart.config.type !== 'doughnut' && chart.config.type !== 'pie') return;
    const ctx = chart.ctx;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data || meta.data.length === 0) return;

    const cx = meta.data[0].x;
    const cy = meta.data[0].y;
    const radius = meta.data[0].outerRadius;

    ctx.save();
    ctx.font = '12px Inter, Arial';
    ctx.textBaseline = 'middle';

    const drawLabels = (chart.data && chart.data.shortLabels && chart.data.shortLabels.length)
      ? chart.data.shortLabels
      : chart.data.labels;

    meta.data.forEach((arc, i) => {
      const startAngle = arc.startAngle;
      const endAngle = arc.endAngle;
      const angle = (startAngle + endAngle) / 2;


      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;

      const lineOutDist = radius + 18;
      const lx = cx + Math.cos(angle) * lineOutDist;
      const ly = cy + Math.sin(angle) * lineOutDist;

      const labelXOffset = (Math.cos(angle) >= 0) ? 10 : -10;
      const textAlign = (Math.cos(angle) >= 0) ? 'left' : 'right';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, py);
      const midx = cx + Math.cos(angle) * (radius + 8);
      const midy = cy + Math.sin(angle) * (radius + 8);
      ctx.lineTo(midx, midy);
      ctx.lineTo(lx, ly);
      ctx.stroke();


      ctx.fillStyle = '#111827';
      ctx.textAlign = textAlign;
      const labelText = drawLabels[i] || chart.data.labels[i] || '';
      const valueText = (chart.data.datasets && chart.data.datasets[0] && typeof chart.data.datasets[0].data[i] !== 'undefined')
        ? ` — ${chart.data.datasets[0].data[i].toFixed(1)}%`
        : '';
      ctx.fillText(labelText + valueText, lx + labelXOffset, ly);
    });

    ctx.restore();
  }
};


// -----------------------------
// Render functions
function createSummaryCards(allItem, prevAnnualEntry, prevMonthlyEntry, latestAnnualEntry, latestMonthlyEntry) {
  const container = document.getElementById('flashcards');


  const annualYear = latestAnnualEntry ? latestAnnualEntry.date : '—';
  const monthlyMonthYear = latestMonthlyEntry ? latestMonthlyEntry.date : '—';

  
  const latestAnnual = latestAnnualEntry ? latestAnnualEntry.rate * 100 : NaN;
  const latestMonthly = latestMonthlyEntry ? latestMonthlyEntry.rate * 100 : NaN;

  
  const prevAnnual = prevAnnualEntry ? prevAnnualEntry.rate * 100 : null;
  const prevMonthly = prevMonthlyEntry ? prevMonthlyEntry.rate * 100 : null;

  function fmt(v) { 
    return isNaN(v) ? '—' : v.toFixed(1) + '%'; 
  }

  container.innerHTML = `
    <div class="card">
      <div class="big-number">Annual Inflation Rate </div>
      <div class="big-number">${annualYear}</div>
      <div class="big-big-number">${fmt(latestAnnual)}</div>
      <div class="small">Last read: ${prevAnnual !== null ? prevAnnual.toFixed(1) + '%' : 'Missing'}</div>
    </div>

    <div class="card">
      <div class="big-number">Monthly Inflation Rate </div>
      <div class="big-number">${monthlyMonthYear}</div>
      <div class="big-big-number">${fmt(latestMonthly)}</div>
      <div class="small">Last read: ${prevMonthly !== null ? prevMonthly.toFixed(1) + '%' : 'Missing'}</div>
    </div>
  `;
}



function renderCategoryCards(mainCategories) {
  const container = document.getElementById('category-cards');
  container.innerHTML = '';
  mainCategories.forEach(cat => {
    const el = document.createElement('div');
    el.className = 'category-card';
    el.style.borderTopColor = cat.color || '#2563EB';
    el.innerHTML = `
      <div style="
      display:flex;
      justify-content:space-between;
      align-items:center"
      >
      <strong>${cat.item}</strong>
        <div class="small">Weight: ${cat.weight.toFixed(1)}%</div>
      </div>
      
      <div style="display:flex;gap:12px;margin-top:8px;align-items:center">
        <div style="flex:1">
          <div class="big-number" style="color:${cat.annual>=0? 'var(--success)': 'var(--danger)'}">${cat.annual.toFixed(2)}</div>
          <div class="small">Annual</div>
        </div>
        <div style="width:1px;height:38px;background:#eee"></div>
        <div style="flex:1">
          <div class="big-number" style="color:${cat.monthly>=0? 'var(--success)': 'var(--danger)'}">${cat.monthly.toFixed(2)}</div>
          <div class="small">Monthly</div>
        </div>
      </div>
      <div class="subitems" aria-hidden="true">
      <!-- replace this block by the next block-->
       <!-- <div class="small" style="font-weight:700;margin-bottom:6px;display:flex;justify-content:space-between">
  <div style="flex:1">Sub-item</div>
  <div style="flex:1;display:flex;justify-content:center;gap:40px">
    <div style="text-align:center">Annual</div>
    <div style="text-align:center">Monthly</div>
  </div>
</div> -->
      <!--start-->
       <div class="small" style="font-weight:700;margin-bottom:6px;display:flex;justify-content:space-between">
  <div style="flex:1"></div>
  <div style="flex:1;display:flex;justify-content:center;gap:40px">
    <div style="text-align:center">Annual</div>
    <div style="text-align:center">Monthly</div>
  </div>
</div>
<!--end -->
        ${cat.subItems && cat.subItems.length ? cat.subItems.map(s => `
          <div style="
            display:flex;
            justify-content:space-between;
            padding:6px 0;
            border-top:1px solid #f3f4f6;
            background-color: ${/sub category/i.test(s.type) ? '#cce4ff': 'transparent'};
            font-weight: ${/sub category/i.test(s.type) ? '700' : '400'};
            border-radius:4px;
          ">
            <div style="flex:1;max-width:70%">${s.item}</div>
            <div style="flex:1;display:flex;justify-content:center;gap:40px">
              <div style="text-align:center">${s.annual.toFixed(1)}</div>
              <div style="text-align:center">${s.monthly.toFixed(1)}</div>
            </div>
          </div>
        `).join('') : '<div class="small">No sub-items</div>'}
      </div>
    `;
    container.appendChild(el);
  });
}



// hena btzbt alwan el pie
function renderPie(mainCategories) {
  const labels = mainCategories.map(c => c.item);
  const shortLabels = labels.map(l => {
    const parts = ('' + l).split(/\s+/).filter(Boolean);
    return parts.length <= 2 ? parts.join(' ') : parts.slice(0, 2).join(' ');
  });
  const data = mainCategories.map(c => c.weight);
  const monotonePalette = [
  "#003C73",
  "#005A9E",
  "#0070C0",
  "#338ACD",
  "#66A3DA",
  "#99BDE6",
  "#C2D8F2",
];

const colors = mainCategories.map((_, i) => 
  monotonePalette[i % monotonePalette.length]
);


  const ctx = document.getElementById('weightsPieChart').getContext('2d');
  if (window.pieChart) window.pieChart.destroy();

  window.pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      shortLabels,
      datasets:[{
        data,
        backgroundColor: colors,
        borderColor: '#fff',
        borderWidth: 1
      }]
    },
    
    options:{
  responsive:true,
  maintainAspectRatio:false, 
  radius: '100%', 
  cutout: '0%', 
  plugins:{
    legend:{ display:false },
    datalabels: {
      color: '#fff',
      font: { weight: 'bold', size: 14 },
      formatter: (value) => value.toFixed(1) + '%',
      anchor: 'end', 
      align: 'start'
    },
        tooltip: {
          enabled: true,
          callbacks: {
            title: function(ctx) {
              return ctx[0] ? ctx[0].chart.data.labels[ctx[0].dataIndex] : '';
            },
            label: function(ctx) {
              const fullLabel = ctx.chart.data.labels[ctx.dataIndex];
              const val = ctx.chart.data.datasets[0].data[ctx.dataIndex];
              return `${fullLabel}: ${val.toFixed(1)}%`;
            }
          }
        }
      }
    },
    plugins: [ChartDataLabels] 
  });
}



function renderLineChart(data, canvasId, rangeInputId, rangeLabelId) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  const fullLabels = data.map(d => d.date);
  const fullRates = data.map(d => d.rate);

  let chart = null;

  const draw = (months) => {
    const N = Math.min(months, fullLabels.length);
    const start = fullLabels.length - N;
    const labels = fullLabels.slice(start);
    const rates = fullRates.slice(start);

    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = rates;
      chart.update();
      return;
    }

    chart = new Chart(ctx, {
      type:'line',
      data:{
        labels,
        datasets:[{
          label: canvasId,
          data: rates,
          borderColor:'#2563EB',
          backgroundColor:'rgba(37,99,235,0.08)',
          fill:true,
          tension:0.2,
          pointRadius:2,
          borderWidth:2
        }]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        scales:{
          x:{grid:{display:false}, ticks:{maxRotation:0}},
          y:{ticks:{callback: v => (v*100).toFixed(1) + '%'}} 
        },
        plugins:{
          legend:{display:false},
          tooltip:{
            enabled:true,
            callbacks:{
              label: function(ctx) {
                const val = ctx.raw * 100; 
                return val.toFixed(1) + '%';
              }
            }
          }
        }
      }
    });
  };

  // initial draw
  draw(parseInt(document.getElementById(rangeInputId.replace('-range','-range')?.id) || 36) || 36);

  // connect range input
  const range = document.getElementById(rangeInputId);
  const label = document.getElementById(rangeLabelId);
  if (range) {
    const update = () => {
      const m = Math.min(range.max, range.value, fullLabels.length);
      range.max = fullLabels.length;
      draw(parseInt(m));
      if (label) label.textContent = `Last ${Math.min(m, fullLabels.length)} months`;
    };
    range.addEventListener('input', update);
    update();
  }
}


// -----------------------------
// Helpers: group oct items into main categories and subitems
function buildHierarchy(items) {
  const mainCategories = [];
  let currentMain = null;

  items.forEach(row => {
    if (row.type.startsWith("main category")) {
      currentMain = {
        item: row.item,
        weight: row.weight,
        annual: row.annual,
        monthly: row.monthly,
        subItems: []
      };
      mainCategories.push(currentMain);
    }
    else if (row.type.startsWith("sub category") || row.type.startsWith("sub item")) {
      if (currentMain) {
        currentMain.subItems.push(row);
      }
    }
  });

  return mainCategories;
}


// -----------------------------
// Main init
(async function init(){
const [annualText, monthlyText] = await Promise.all([
fetchTextOrNull(FILES.annualHistory),
fetchTextOrNull(FILES.monthlyHistory)
]);


const annualRows = annualText ? parseCSVString(annualText) : [];
const monthlyRows = monthlyText ? parseCSVString(monthlyText) : [];


const annualData = parseHistorical(annualRows.slice(1));
const monthlyData = parseHistorical(monthlyRows.slice(1));


// renamed file
let detailsText = await fetchTextOrNull(FILES.inflationDetails);
if(!detailsText){ console.error("Inflation details CSV missing"); return; }


const detailRows = parseCSVString(detailsText);
const inflationItems = parseInflationDetails(detailRows);
const mainCategories = buildHierarchy(inflationItems);


const allItems = inflationItems.find(i=>/all items/i.test(i.item)) || {annual:0,monthly:0};


const latestAnnual = annualData[annualData.length-1] || null;
const latestMonthly = monthlyData[monthlyData.length-1] || null;

const prevAnnual = annualData[annualData.length-2] || null;
const prevMonthly = monthlyData[monthlyData.length-2] || null;

createSummaryCards(allItems, prevAnnual, prevMonthly, latestAnnual, latestMonthly);

renderCategoryCards(mainCategories);
renderPie(mainCategories);


if(annualData.length) renderLineChart(annualData,'annualLineChart','annual-range','annual-range-value');
if(monthlyData.length) renderLineChart(monthlyData,'monthlyLineChart','monthly-range','monthly-range-value');
})();

