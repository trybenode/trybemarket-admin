/**
 * Dashboard export: one report object built from what the dashboard has
 * already loaded, downloadable as JSON (as-is) or as a printable PDF.
 *
 * The PDF libraries are imported on click, so they never load for admins who
 * don't export.
 */

const PERIOD_LABELS = {
  daily: 'Today so far',
  weekly: 'Last 7 days, including today',
  monthly: 'Last 30 days, including today',
  alltime: 'Since tracking began',
};

const SEGMENT_LABELS = {
  activated_active: 'Active Sellers',
  activated_dormant: 'Dormant Sellers',
  never_activated: 'Never Listed',
  subscribed: 'Active Subscribers',
  churned: 'Churned',
};

const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : null);
const toIso = (d) => (d instanceof Date && !isNaN(d) ? d.toISOString() : null);

export function buildDashboardReport({
  stats,
  analytics,
  webTraffic,
  activities,
  campusName,
}) {
  const funnel = analytics?.funnel ?? [];
  const registered = funnel[0]?.count ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    campusFilter: campusName || 'All campuses',
    notes: [
      'Overview and web traffic always cover all campuses.',
      'Weekly transacting pairs, key metrics, activation funnel, demand gaps and user segments follow the campus filter.',
    ],
    overview: {
      totalUsers: stats?.users?.total ?? null,
      totalSchools: stats?.schools?.total ?? null,
      totalProducts: stats?.products?.total ?? null,
      totalServices: stats?.services?.total ?? null,
      activePaidSubscribers: analytics?.activePaidSubscribers ?? null,
    },
    webTraffic: webTraffic?.summary
      ? {
          period: webTraffic.period,
          range: PERIOD_LABELS[webTraffic.period] ?? webTraffic.period,
          pageViews: webTraffic.summary.pageViews ?? null,
          uniqueVisitors: webTraffic.summary.uniqueVisitors ?? null,
          sessions: webTraffic.summary.sessions ?? null,
          topPages: webTraffic.pages ?? [],
        }
      : null,
    weeklyTransactingPairs: analytics
      ? { thisWeek: analytics.wtp ?? null, trend: analytics.wtpTrend ?? [] }
      : null,
    keyMetrics: analytics
      ? {
          activationRatePercent: funnel.length > 1 ? percent(funnel[1].count, registered) : null,
          listingToMessageRatePercent: analytics.listingToMessageRate ?? null,
          fourWeekSellerRetentionPercent: analytics.retentionRate ?? null,
        }
      : null,
    activationFunnel: funnel.map((stage) => ({
      stage: stage.stage,
      count: stage.count,
      percentOfRegistered: percent(stage.count, registered),
    })),
    demandGaps: analytics
      ? {
          searchesTracked: analytics.searchesTracked ?? null,
          zeroResultSearches: analytics.zeroResultSearches ?? [],
        }
      : null,
    userSegments: analytics?.segments
      ? Object.entries(SEGMENT_LABELS).map(([key, label]) => ({
          segment: label,
          count: analytics.segments[key] ?? 0,
        }))
      : [],
    recentActivity: (activities ?? []).map((a) => ({
      type: a.type,
      name: a.name,
      action: a.action,
      at: toIso(a.timestamp),
    })),
  };
}

function fileName(report, extension) {
  const date = report.generatedAt.slice(0, 10);
  const campus = report.campusFilter === 'All campuses'
    ? ''
    : `-${report.campusFilter.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  return `trybemarket-dashboard-${date}${campus}.${extension}`;
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadDashboardJson(report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  saveBlob(blob, fileName(report, 'json'));
}

// The PDF's built-in fonts only cover basic Latin. Strip accents
// ("Olúwaférànmí" → "Oluwaferanmi") and drop anything else unsupported
// (emoji etc.), rather than letting it print as garbage.
const pdfText = (value) => {
  if (value === null || value === undefined) return '-';
  const original = String(value);
  const cleaned = original
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
  // Text written entirely in another script would vanish; flag it instead.
  return cleaned || (original.trim() ? '(unsupported characters)' : '');
};
const num = (value) => (value === null || value === undefined ? '-' : Number(value).toLocaleString('en-US'));
const pct = (value) => (value === null || value === undefined ? '-' : `${value}%`);

export async function downloadDashboardPdf(report) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('TrybeMarket Dashboard Report', margin, y + 10);
  y += 30;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(pdfText(`Generated ${new Date(report.generatedAt).toLocaleString('en-GB')}  |  Campus filter: ${report.campusFilter}`), margin, y);
  y += 14;
  report.notes.forEach((note) => {
    doc.text(pdfText(note), margin, y);
    y += 12;
  });
  doc.setTextColor(0);
  y += 6;

  const section = (title, head, body, note) => {
    if (y > pageHeight - 120) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(pdfText(title), margin, y + 12);
    y += 18;
    if (note) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(pdfText(note), margin, y + 8);
      doc.setTextColor(0);
      y += 14;
    }
    autoTable(doc, {
      startY: y,
      head: [head.map(pdfText)],
      body: body.length ? body.map((row) => row.map(pdfText)) : [[pdfText('No data'), ...head.slice(1).map(() => '')]],
      margin: { left: margin, right: margin },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [245, 245, 250] },
    });
    y = doc.lastAutoTable.finalY + 22;
  };

  const o = report.overview;
  section('Overview (all campuses)', ['Metric', 'Value'], [
    ['Total users', num(o.totalUsers)],
    ['Total schools', num(o.totalSchools)],
    ['Total products', num(o.totalProducts)],
    ['Total services', num(o.totalServices)],
    ['Active paid subscribers', num(o.activePaidSubscribers)],
  ]);

  const w = report.webTraffic;
  section('Web traffic (all campuses)', ['Metric', 'Value'], w ? [
    ['Period', w.range],
    ['Page views', num(w.pageViews)],
    ['Unique visitors', num(w.uniqueVisitors)],
    ['Sessions', num(w.sessions)],
  ] : [], w ? null : 'Web traffic was not loaded when this report was generated.');
  if (w?.topPages?.length) {
    section('Top pages', ['Page', 'Views'], w.topPages.map((p) => [p.page, num(p.views)]));
  }

  const wtp = report.weeklyTransactingPairs;
  section('Weekly transacting pairs', ['Week', 'Buyer-seller pairs'],
    (wtp?.trend ?? []).map((t) => [t.week, num(t.pairs)]),
    'Unique buyer-seller conversations started each week.');

  const k = report.keyMetrics;
  section('Key metrics', ['Metric', 'Value'], k ? [
    ['Activation rate (new sign-ups in 30d who got KYC verified)', pct(k.activationRatePercent)],
    ['Listing -> message rate (30d)', pct(k.listingToMessageRatePercent)],
    ['4-week seller retention', pct(k.fourWeekSellerRetentionPercent)],
  ] : []);

  section('Activation funnel', ['Stage', 'People', '% of registered'],
    report.activationFunnel.map((s) => [s.stage, num(s.count), pct(s.percentOfRegistered)]),
    'People who signed up in the last 30 days, and how many of them reached each step.');

  const g = report.demandGaps;
  section('Demand gaps (last 30 days)', ['Search', 'Times searched'],
    (g?.zeroResultSearches ?? []).map((s) => [s.query, num(s.count)]),
    g ? `Searches tracked: ${num(g.searchesTracked)}. Listed: searches that returned no results.` : null);

  section('User segments', ['Segment', 'Users'], report.userSegments.map((s) => [s.segment, num(s.count)]));

  section('Recent activity', ['When', 'Who / what', 'Activity'],
    report.recentActivity.map((a) => [
      a.at ? new Date(a.at).toLocaleString('en-GB') : '-',
      a.name,
      a.action,
    ]));

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Page ${i} of ${pages}`, doc.internal.pageSize.getWidth() - margin, pageHeight - 20, { align: 'right' });
  }

  doc.save(fileName(report, 'pdf'));
}
