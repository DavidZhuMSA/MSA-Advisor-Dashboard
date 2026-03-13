"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

function getHealthColor(score) {
  if (score == null) return "var(--text-muted)";
  if (score >= 70) return "var(--color-green)";
  if (score >= 50) return "var(--color-yellow)";
  if (score >= 30) return "var(--color-orange)";
  return "var(--color-red)";
}

function getRiskBadgeClass(risk) {
  switch (risk) {
    case "Red": return "badge badge-red";
    case "Orange": return "badge badge-orange";
    case "Yellow": return "badge badge-yellow";
    case "Green": return "badge badge-green";
    default: return "badge badge-neutral";
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatCurrency(num) {
  if (num == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(num);
}

function Skeleton({ width, height }) {
  return <div className="skeleton" style={{ width: width || "100%", height: height || "20px" }} />;
}

export default function ClientDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { status } = useSession();
  const [client, setClient] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch(`/api/clients/${id}`)
      .then((r) => {
        if (r.status === 401) {
          router.replace("/login");
          return {};
        }
        return r.json();
      })
      .then((data) => {
        setClient(data.client);
        setSnapshots(data.snapshots || []);
        setSubmissions(data.submissions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, status, router]);

  if (loading) {
    return (
      <>
        <div className="back-link" onClick={() => router.push("/")}>← Back to Command Center</div>
        <Skeleton width="300px" height="36px" />
        <div className="score-cards" style={{ marginTop: 24 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="score-card">
              <Skeleton width="80px" height="12px" />
              <Skeleton width="60px" height="48px" />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (!client) {
    return (
      <div className="empty-state">
        <p>Client not found</p>
        <button className="quick-link-btn" onClick={() => router.push("/")}>← Back</button>
      </div>
    );
  }

  const chartData = [...snapshots].reverse();
  const maxRevenue = Math.max(...chartData.map((s) => s.revenueCollected), 1);

  return (
    <>
      <a className="back-link" onClick={() => router.push("/")} style={{ cursor: "pointer" }}>
        ← Back to Command Center
      </a>

      {/* Header */}
      <div className="detail-header">
        <div className="detail-header-left">
          <h1>{client.name}</h1>
          <div className="detail-header-meta">
            <span className="badge badge-module">{client.module}</span>
            <span className={getRiskBadgeClass(client.riskClassification)}>
              {client.riskClassification} Risk
            </span>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              {client.company}
            </span>
          </div>
        </div>
        <div className="detail-header-right">
          {client.slackChannelId && (
            <a
              href={`https://app.slack.com/client/T/${client.slackChannelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="quick-link-btn"
            >
              💬 Slack
            </a>
          )}
          {client.url && (
            <a href={client.url} target="_blank" rel="noopener noreferrer" className="quick-link-btn">
              📋 Notion
            </a>
          )}
          {client.email && (
            <a href={`mailto:${client.email}`} className="quick-link-btn">✉️ Email</a>
          )}
          {client.phone && (
            <a href={`tel:${client.phone}`} className="quick-link-btn">📞 Call</a>
          )}
        </div>
      </div>

      {/* Score Cards */}
      <div className="score-cards">
        <div className="score-card">
          <div className="score-card-label">Health Score</div>
          <div className="score-card-value" style={{ color: getHealthColor(client.healthScore) }}>
            {client.healthScore ?? "—"}
          </div>
          <div className="score-card-sub">out of 100</div>
        </div>
        <div className="score-card">
          <div className="score-card-label">Risk Score</div>
          <div className="score-card-value" style={{
            color: client.riskScore >= 60 ? "var(--color-red)" : client.riskScore >= 30 ? "var(--color-yellow)" : "var(--color-green)",
          }}>
            {client.riskScore ?? "—"}
          </div>
          <div className="score-card-sub">{client.riskTrajectory}</div>
        </div>
        <div className="score-card">
          <div className="score-card-label">Velocity</div>
          <div className="score-card-value" style={{
            color: client.velocityClassification === "Accelerating" ? "var(--color-green)" : client.velocityClassification === "Stalled" ? "var(--color-red)" : "var(--text-primary)",
            fontSize: "1.6rem",
          }}>
            {client.velocityClassification}
          </div>
          <div className="score-card-sub">growth pace</div>
        </div>
        <div className="score-card">
          <div className="score-card-label">Value Created</div>
          <div className="score-card-value" style={{ color: "var(--msa-orange)" }}>
            {client.valueCreationScore ?? "—"}
          </div>
          <div className="score-card-sub">multiplier</div>
        </div>
      </div>

      {/* Client Info Row */}
      <div className="kpi-grid" style={{ marginBottom: "32px" }}>
        <div className="kpi-card">
          <div className="kpi-label">Baseline Revenue</div>
          <div className="kpi-value" style={{ fontSize: "1.4rem" }}>
            {formatCurrency(client.baselineRevenue)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Current Revenue</div>
          <div className="kpi-value" style={{ fontSize: "1.4rem", color: "var(--color-green)" }}>
            {formatCurrency(client.currentRevenue)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Onboarded</div>
          <div className="kpi-value" style={{ fontSize: "1.1rem" }}>
            {formatDate(client.onboardingDate)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Next Best Action</div>
          <div className="kpi-value" style={{ fontSize: "1rem", color: "var(--msa-orange)" }}>
            {client.nextBestAction}
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="section">
        <div className="section-title">Revenue Performance</div>
        {chartData.length > 0 ? (
          <div className="perf-chart">
            {chartData.map((snap, i) => {
              const height = maxRevenue > 0 ? (snap.revenueCollected / maxRevenue) * 100 : 0;
              return (
                <div key={snap.id || i} className="perf-bar-group">
                  <div className="perf-bar-value">{formatCurrency(snap.revenueCollected)}</div>
                  <div className="perf-bar" style={{ height: `${Math.max(height, 3)}%` }} />
                  <div className="perf-bar-label">
                    {snap.weekOf ? new Date(snap.weekOf).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : `W${i + 1}`}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state"><p>No performance snapshots yet</p></div>
        )}
      </div>

      {/* Snapshot Detail Table */}
      {snapshots.length > 0 && (
        <div className="section">
          <div className="section-title">Weekly Snapshot Details</div>
          <div className="table-container">
            <div className="client-table-wrapper">
              <table className="client-table">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Revenue</th>
                    <th>Pipeline</th>
                    <th>Calls Booked</th>
                    <th>Calls Held</th>
                    <th>Deals Closed</th>
                    <th>Execution</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{formatDate(s.weekOf)}</td>
                      <td>{formatCurrency(s.revenueCollected)}</td>
                      <td>{formatCurrency(s.pipelineValue)}</td>
                      <td>{s.callsBooked}</td>
                      <td>{s.callsHeld}</td>
                      <td>{s.dealsClosed}</td>
                      <td>
                        <span className={`badge ${s.executionFrequency === "Daily" ? "badge-green" : s.executionFrequency === "None" ? "badge-red" : "badge-yellow"}`}>
                          {s.executionFrequency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Architecture Assets */}
      <div className="section">
        <div className="section-title">Architecture Submissions ({submissions.length} assets)</div>
        {submissions.length > 0 ? (
          <div className="arch-grid">
            {submissions.map((sub) => (
              <a
                key={sub.id}
                href={`https://notion.so/${sub.id.replace(/-/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="arch-card arch-card-link"
              >
                <div className="arch-card-name">
                  {sub.name}
                  <span className="arch-link-icon">↗</span>
                </div>
                <div className="arch-card-meta">
                  {sub.assetType !== "—" && (
                    <span className="badge badge-module" style={{ marginRight: "8px" }}>{sub.assetType}</span>
                  )}
                  {formatDate(sub.submittedAt)}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="empty-state"><p>No architecture submissions yet</p></div>
        )}
      </div>
    </>
  );
}
