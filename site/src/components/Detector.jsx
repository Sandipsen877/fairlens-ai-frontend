import { useEffect, useMemo, useRef, useState } from 'react';
import {
  classifyDI,
  classifyEO,
  classifyFS,
  formatBytes,
  formatTimestamp,
} from '../lib/classify.js';
import { exportDashboardAsPdf } from '../lib/exportPdf.js';

const API_URL = "https://unbiased-ai-backend-g1ef.onrender.com/api/upload/analyze";

/* ---------------- Dropzone (unchanged) ---------------- */
function Dropzone({ files, onFilesChange, onClear }) {
  const inputRef = useRef(null);
  const elRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const onClick = (e) => {
    if (e.target.closest('.dz-clear')) return;
    inputRef.current?.click();
  };

  const handleFiles = (fileList) => {
    const validFiles = [];
    for (const f of fileList) {
      if (f.name.toLowerCase().endsWith('.csv')) validFiles.push(f);
    }
    onFilesChange(validFiles.length ? validFiles : []);
  };

  const onChange = (e) => {
    const newFiles = e.target.files;
    if (newFiles?.length) handleFiles(newFiles);
  };

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles?.length) handleFiles(droppedFiles);
  };

  const cls = ['dropzone'];
  if (dragging) cls.push('dragging');
  if (files?.length) cls.push('has-file');

  return (
    <div className={cls.join(' ')} ref={elRef} onClick={onClick}
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <input ref={inputRef} type="file" accept=".csv,text/csv" multiple hidden onChange={onChange} />
      <div className="dz-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M14 3v6h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      {(!files || files.length === 0) && (
        <div className="dz-body">
          <div className="dz-title">Drop your <strong>.csv</strong> datasets</div>
          <div className="dz-sub">or click to browse (multiple allowed)</div>
        </div>
      )}
      {files && files.length > 0 && (
        <div className="dz-file">
          <span className="dz-file-name">
            {files.length === 1
              ? `${files[0].name} · ${formatBytes(files[0].size)}`
              : `${files.length} CSV files selected`}
          </span>
          <button type="button" className="dz-clear" aria-label="Remove all files"
            onClick={(e) => { e.stopPropagation(); if (inputRef.current) inputRef.current.value = ''; onClear(); }}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Small helpers (MetaChip, TimestampChip) ---------------- */
function MetaChip({ label, value }) {
  return <span className="meta-chip">{label} <strong>{String(value)}</strong></span>;
}

function TimestampChip({ date }) {
  return (
    <span className="meta-chip meta-chip-time">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15.5 14" />
      </svg>
      <span>Generated</span>
      <strong>{formatTimestamp(date)}</strong>
    </span>
  );
}

/* ---------------- Dashboard (REWORKED) ---------------- */
function Dashboard({ result, fallbackTimestamp, onDownload, pdfBusy, pdfLabel, dashboardRef }) {
  const stamp = result?.timestamp ? new Date(result.timestamp) : fallbackTimestamp;

  // Overall risk
  const overallRisk = result?.overallRisk ?? 'Unknown';
  const riskLevelMap = { High: 'bad', Medium: 'warn', Low: 'good' };
  const verdictLevel = riskLevelMap[overallRisk] || 'bad';
  const verdictTitle =
    verdictLevel === 'good' ? 'Low risk — model appears fair' :
    verdictLevel === 'warn' ? 'Medium risk — further investigation needed' :
    'High risk — significant bias detected';

  // Fairness metrics per feature
  const attributes = result?.attributes ?? [];

  // Assessments per feature
  const assessments = result?.assessments ?? [];

  // Mitigation data
  const mitigation = result?.mitigation ?? null;

  // Model info
  const modelName = result?.modelName;
  const modelAccuracy = result?.modelAccuracy;

  return (
    <div className="detector-output" ref={dashboardRef}>
      <div className="dashboard-head">
        <div>
          <div className="dash-eyebrow">Fairness audit · Live report</div>
          <h3 className="dash-title">Bias Analysis Dashboard</h3>
        </div>
        <div className="dash-head-right">
          <div className="result-meta">
            <TimestampChip date={stamp} />
            {modelName && <MetaChip label="Model" value={modelName} />}
            {modelAccuracy != null && <MetaChip label="Accuracy" value={(modelAccuracy * 100).toFixed(0) + '%'} />}
          </div>
          <button
            type="button" className={`btn-download${pdfBusy ? ' is-busy' : ''}`}
            aria-label="Download report as PDF" disabled={pdfBusy} onClick={onDownload}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="btn-download-label">{pdfLabel}</span>
          </button>
        </div>
      </div>

      {/* Overall verdict card */}
      <div className="dash-grid">
        <div className={`dash-card span-4 verdict ${verdictLevel}`}>
          <div className="verdict-icon">{verdictLevel === 'good' ? '✓' : '!'}</div>
          <div className="verdict-body">
            <div className="verdict-title">{verdictTitle}</div>
            <div className="verdict-text">Overall risk level: <strong>{overallRisk}</strong></div>
          </div>
        </div>

        {/* Per‑feature fairness metrics */}
        {attributes.map((attr) => (
          <div key={attr.name} className="dash-card span-2">
            <div className="chart-head">
              <h4>Fairness — {attr.name}</h4>
              <span className="muted">
                Disadvantaged: {attr.disadvantaged ?? '—'} · Advantaged: {attr.advantaged ?? '—'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <div className="metric-label">DP Diff</div>
                <div className="metric-value" style={{ fontSize: '22px' }}>{attr.dpDiff.toFixed(3)}</div>
                <div className="metric-hint">threshold &lt; 0.1</div>
              </div>
              <div>
                <div className="metric-label">DI Ratio</div>
                <div className="metric-value" style={{ fontSize: '22px' }}>{attr.diRatio.toFixed(3)}</div>
                <div className="metric-hint">target ≥ 0.8</div>
              </div>
              <div>
                <div className="metric-label">EO Diff</div>
                <div className="metric-value" style={{ fontSize: '22px' }}>{attr.eoDiff.toFixed(3)}</div>
                <div className="metric-hint">threshold &lt; 0.1</div>
              </div>
            </div>
            {attr.groups && attr.groups.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <div className="metric-label" style={{ marginBottom: '6px' }}>Positive rates by group</div>
                {attr.groups.map((g) => (
                  <div key={g.name} className="bar-group">
                    <div className="bar-track">
                      <div className="bar bar-dyn" style={{ width: `${g.rate * 100}%` }} />
                    </div>
                    <div className="bar-label">{g.name}: {(g.rate * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Assessments per feature */}
        {assessments.length > 0 && (
          <div className="dash-card span-4">
            <div className="chart-head">
              <h4>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="head-icon">
                  <path d="M9 12l2 2 4-4" />
                  <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
                </svg>
                Assessment &amp; Recommended Actions
              </h4>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
              {assessments.map((asm) => (
                <div key={asm.attribute} style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {asm.attribute}
                    <span className={`mit-sev mit-sev-${asm.riskLevel.toLowerCase() === 'high' ? 'high' : asm.riskLevel.toLowerCase() === 'medium' ? 'medium' : 'low'}`}>
                      {asm.riskLevel}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-mute)', marginBottom: '12px' }}>
                    <div>Disadvantaged: <strong>{asm.disadvantagedGroup}</strong></div>
                    <div>Advantaged: <strong>{asm.advantagedGroup}</strong></div>
                  </div>
                  {asm.issues?.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div className="metric-label" style={{ marginBottom: '4px' }}>Issues</div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-mute)' }}>
                        {asm.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                      </ul>
                    </div>
                  )}
                  {asm.actions?.length > 0 && (
                    <div>
                      <div className="metric-label" style={{ marginBottom: '4px' }}>Suggested actions</div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-mute)' }}>
                        {asm.actions.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mitigation card */}
        {mitigation && (
          <div className="dash-card span-4" style={{ background: 'rgba(74,222,128,.04)', borderColor: 'rgba(74,222,128,.25)' }}>
            <div className="chart-head">
              <h4>Mitigation Applied</h4>
              <span className="muted">Post‑processing fairness improvement</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '12px' }}>
              <div>
                <div className="metric-label">Technique</div>
                <div style={{ fontWeight: 600, fontSize: '16px', marginTop: '4px' }}>{mitigation.technique}</div>
              </div>
              <div>
                <div className="metric-label">Accuracy before</div>
                <div style={{ fontWeight: 600, fontSize: '16px', marginTop: '4px' }}>{(mitigation.accuracyBefore * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="metric-label">Accuracy after</div>
                <div style={{ fontWeight: 600, fontSize: '16px', marginTop: '4px' }}>{(mitigation.accuracyAfter * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="metric-label">Accuracy change</div>
                <div style={{ fontWeight: 600, fontSize: '16px', marginTop: '4px', color: mitigation.accuracyAfter >= mitigation.accuracyBefore ? 'var(--green)' : 'var(--amber)' }}>
                  {((mitigation.accuracyAfter - mitigation.accuracyBefore) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Transform API response ---------- */
function transformApiResponse(data) {
  const report = data?.data?.report;
  if (!report) return null;

  const fairness = report.fairness ?? {};
  const assessments = fairness.assessments ?? {};
  const mitigation = report.mitigation ?? {};

  // Build per‑attribute metrics
  const attributes = Object.entries(fairness.metrics ?? {}).map(([key, m]) => ({
    name: key,
    dpDiff: m.demographic_parity_difference,
    diRatio: m.disparate_impact_ratio,
    eoDiff: m.equalized_odds_difference,
    disadvantaged: assessments[key]?.disadvantaged_group ?? '—',
    advantaged: assessments[key]?.advantaged_group ?? '—',
    groups: Object.entries(m.group_positive_rates ?? {}).map(([group, rate]) => ({
      name: group,
      rate,
    })),
  }));

  // Assessments list
  const assessmentList = Object.entries(assessments).map(([attr, a]) => ({
    attribute: attr,
    riskLevel: a.risk_level ?? 'Unknown',
    issues: a.issues ?? [],
    disadvantagedGroup: a.disadvantaged_group ?? '—',
    advantagedGroup: a.advantaged_group ?? '—',
    actions: a.suggested_actions ?? [],
  }));

  // Mitigation (simplified)
  const mitigationData = mitigation.technique ? {
    technique: mitigation.technique,
    accuracyBefore: mitigation.accuracy_before,
    accuracyAfter: mitigation.accuracy_after,
  } : null;

  return {
    overallRisk: fairness.overall_risk ?? 'Unknown',
    modelName: report.model?.name,
    modelAccuracy: report.model?.accuracy,
    datasetRows: null, // optional
    attributes,
    assessments: assessmentList,
    mitigation: mitigationData,
    timestamp: Date.now(),
  };
}

/* ---------------- Detector (main component) ---------------- */
export default function Detector() {
  const [files, setFiles] = useState([]);
  const [formMsg, setFormMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [result, setResult] = useState(null);
  const [fallbackTimestamp, setFallbackTimestamp] = useState(new Date());

  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfLabel, setPdfLabel] = useState('Download PDF');

  const dashboardRef = useRef(null);
  const canAnalyse = useMemo(() => files.length > 0 && !loading, [files, loading]);

  const handleFilesChange = (newFiles) => { setFiles(newFiles); setFormMsg(null); };
  const clearFiles = () => setFiles([]);

  const analyse = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setShowDashboard(true);
    setFallbackTimestamp(new Date());

    requestAnimationFrame(() => {
      dashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    const fd = new FormData();
    files.forEach((file) => fd.append('file', file, file.name));
    try {
      const res = await fetch(API_URL, { method: 'POST', body: fd });
      if (res.ok) {
        const json = await res.json();
        const transformed = transformApiResponse(json);
        setResult(transformed);
      } else {
        const errorText = await res.text();
        setFormMsg({ text: `Server error: ${errorText}`, kind: 'error' });
      }
    } catch (err) {
      setFormMsg({ text: 'Network error — is the backend running?', kind: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const flashLabel = (text) => {
    setPdfLabel(text); setPdfBusy(true);
    setTimeout(() => { setPdfLabel('Download PDF'); setPdfBusy(false); }, 1600);
  };

  const handleDownload = async () => {
    if (pdfBusy) return;
    setPdfBusy(true); setPdfLabel('Preparing');
    try {
      await exportDashboardAsPdf(dashboardRef.current);
      setPdfLabel('Download PDF');
    } catch (err) {
      console.error('PDF export failed:', err);
      flashLabel('Export failed — retry');
      return;
    } finally { setPdfBusy(false); }
  };

  return (
    <section id="detector" className="section section-alt">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">02 — Live audit</span>
          <h2>The Bias Detector.</h2>
          <p className="lead">
            Upload one or more CSV datasets. We send them to the fairness engine,
            compute four bias metrics across protected cohorts, and return a regulator‑ready dashboard.
          </p>
        </div>

        <div className="detector">
          <aside className="detector-controls">
            <div className="control-group">
              <label>CSV Datasets</label>
              <Dropzone files={files} onFilesChange={handleFilesChange} onClear={clearFiles} />
            </div>

            <button className="btn btn-primary btn-block" disabled={!canAnalyse} onClick={analyse}>
              <span className="btn-label">{loading ? 'Analysing…' : 'Analyse files'}</span>
              {loading && (
                <span className="btn-spinner">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity=".25" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              )}
            </button>

            {formMsg && (
              <div className={`form-msg${formMsg.kind === 'info' ? ' info' : ''}`}>{formMsg.text}</div>
            )}
          </aside>

          {showDashboard && (
            <Dashboard
              result={result}
              fallbackTimestamp={fallbackTimestamp}
              onDownload={handleDownload}
              pdfBusy={pdfBusy}
              pdfLabel={pdfLabel}
              dashboardRef={dashboardRef}
            />
          )}
        </div>
      </div>
    </section>
  );
    }
