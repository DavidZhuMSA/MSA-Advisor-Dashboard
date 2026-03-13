"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

function getRiskBadgeClass(risk) {
  switch (risk) {
    case "Red": return "badge badge-red";
    case "Orange": return "badge badge-orange";
    case "Yellow": return "badge badge-yellow";
    case "Green": return "badge badge-green";
    default: return "badge badge-neutral";
  }
}

function getVelocityBadgeClass(v) {
  switch (v) {
    case "Accelerating": return "badge badge-green";
    case "On-Pace": return "badge badge-module";
    case "Slowing": return "badge badge-yellow";
    case "Stalled": return "badge badge-red";
    default: return "badge badge-neutral";
  }
}

function getHealthColor(score) {
  if (score == null) return "var(--text-muted)";
  if (score >= 70) return "var(--color-green)";
  if (score >= 50) return "var(--color-yellow)";
  if (score >= 30) return "var(--color-orange)";
  return "var(--color-red)";
}

const riskOrder = { Red: 0, Orange: 1, Yellow: 2, Green: 3, "—": 4 };

function Skeleton({ width, height }) {
  return (
    <div
      className="skeleton"
      style={{ width: width || "100%", height: height || "20px" }}
    />
  );
}

export default function CommandCenter() {
  const { data: session, status } = useSession();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionItems, setActionItems] = useState(null);
  const [sortKey, setSortKey] = useState("risk");
  const [sortDir, setSortDir] = useState("asc");
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/clients")
      .then((r) => {
        if (r.status === 401) {
          router.replace("/login");
          return { clients: [] };
        }
        return r.json();
      })
      .then((data) => {
        setClients(data.clients || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch("/api/action-items")
      .then((r) => r.json())
      .then((data) => setActionItems(data))
      .catch(() => {});
  }, [status, router]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "health" || key === "value" ? "desc" : "asc");
    }
  }

  function getSortIndicator(key) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  const filtered = useMemo(() => {
    let list = [...clients];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.module?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let va, vb;
      switch (sortKey) {
        case "risk":
          va = riskOrder[a.riskClassification] ?? 4;
          vb = riskOrder[b.riskClassification] ?? 4;
          break;
        case "health":
          va = a.healthScore ?? -1;
          vb = b.healthScore ?? -1;
          break;
        case "velocity":
          const velOrder = { Accelerating: 0, "On-Pace": 1, Slowing: 2, Stalled: 3, "—": 4 };
          va = velOrder[a.velocityClassification] ?? 4;
          vb = velOrder[b.velocityClassification] ?? 4;
          break;
        case "value":
          va = a.valueCreationScore ?? -1;
          vb = b.valueCreationScore ?? -1;
          break;
        case "name":
          va = a.name?.toLowerCase() || "";
          vb = b.name?.toLowerCase() || "";
          return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
        case "module":
          const modOrder = { FL: 0, M: 1, S: 2, A: 3 };
          va = modOrder[a.module] ?? 4;
          vb = modOrder[b.module] ?? 4;
          break;
        default:
          va = riskOrder[a.riskClassification] ?? 4;
          vb = riskOrder[b.riskClassification] ?? 4;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });

    return list;
  }, [clients, search, sortKey, sortDir]);

  // KPIs
  const activeCount = clients.length;
  const avgHealth =
    activeCount > 0
      ? Math.round(clients.reduce((s, c) => s + (c.healthScore || 0), 0) / activeCount)
      : 0;
  const redCount = clients.filter((c) => c.riskClassification === "Red").length;
  const orangeCount = clients.filter((c) => c.riskClassification === "Orange").length;
  const avgValue =
    activeCount > 0
      ? (clients.reduce((s, c) => s + (c.valueCreationScore || 0), 0) / activeCount).toFixed(1)
      : "0";

  // Show loading state while checking auth or loading data
  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <>
        <div className="page-header">
          <h1>Command Center</h1>
          <p>Loading your client portfolio…</p>
        </div>
        <div className="kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="kpi-card">
              <Skeleton width="80px" height="12px" />
              <Skeleton width="60px" height="36px" />
            </div>
          ))}
        </div>
        <div className="table-container">
          <div className="table-header">
            <Skeleton width="140px" height="16px" />
          </div>
          <div style={{ padding: "16px 24px" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height="48px" />
            ))}
          </div>
        </div>
      </>
    );
  }

  // Don't render if unauthenticated (redirect is happening)
  if (status === "unauthenticated") return null;

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Command Center</h1>
          <p>Real-time overview of your client portfolio</p>
        </div>
        <a
          href="https://tally.so/r/eqAva0"
          target="_blank"
          rel="noopener noreferrer"
          className="onboard-btn"
        >
          + Onboard Client
        </a>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Active Clients</div>
          <div className="kpi-value accent">{activeCount}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Health Score</div>
          <div className="kpi-value" style={{ color: getHealthColor(avgHealth) }}>
            {avgHealth}
          </div>
          <div className="kpi-sub">out of 100</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">At-Risk Clients</div>
          <div className={`kpi-value ${redCount > 0 ? "red" : orangeCount > 0 ? "accent" : "green"}`}>
            {redCount + orangeCount}
          </div>
          <div className="kpi-sub">
            {redCount > 0 ? `${redCount} red, ${orangeCount} orange` : orangeCount > 0 ? `${orangeCount} orange` : "all clear"}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Value Created</div>
          <div className="kpi-value">{avgValue}×</div>
          <div className="kpi-sub">multiplier</div>
        </div>
      </div>

      {/* Architecture Reviews */}
      {actionItems?.pendingSubmissions?.length > 0 && (
        <div className="action-items-section">
          <div className="section-title" style={{ marginBottom: "16px" }}>
            Architecture Reviews
            <span className="action-count">{actionItems.pendingSubmissions.length}</span>
          </div>
          <div className="action-items-grid">
            {actionItems.pendingSubmissions.map((sub) => (
              <a
                key={sub.id}
                href={`https://notion.so/${sub.id.replace(/-/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`action-item ${sub.completionStatus === "Flagged" ? "action-flagged" : "action-pending"}`}
              >
                <div className="action-item-icon">
                  {sub.completionStatus === "Flagged" ? "🚩" : "📐"}
                </div>
                <div className="action-item-content">
                  <div className="action-item-title">{sub.name}</div>
                  <div className="action-item-meta">
                    {sub.clientName} · {sub.completionStatus}
                  </div>
                </div>
                <span className="arch-link-icon">↗</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Attention Needed - Overdues */}
      {(actionItems?.overdueSnapshots?.length > 0 || actionItems?.overdueArchitecture?.length > 0) && (
        <div className="action-items-section">
          <div className="section-title" style={{ marginBottom: "16px" }}>
            Attention Needed
            <span className="action-count" style={{ background: "var(--color-orange)" }}>
              {(actionItems.overdueSnapshots?.length || 0) + (actionItems.overdueArchitecture?.length || 0)}
            </span>
          </div>
          <div className="action-items-grid">
            {actionItems.overdueSnapshots?.map((c) => (
              <div
                key={`snap-${c.id}`}
                className="action-item action-overdue"
                onClick={() => router.push(`/client/${c.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="action-item-icon">📊</div>
                <div className="action-item-content">
                  <div className="action-item-title">Performance Snapshot Overdue</div>
                  <div className="action-item-meta">
                    {c.name} · {c.daysSince} days ago
                  </div>
                </div>
              </div>
            ))}
            {actionItems.overdueArchitecture?.map((c) => (
              <div
                key={`arch-${c.id}`}
                className="action-item action-overdue"
                onClick={() => router.push(`/client/${c.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="action-item-icon">📐</div>
                <div className="action-item-content">
                  <div className="action-item-title">Architecture Submission Overdue</div>
                  <div className="action-item-meta">
                    {c.name} · {c.daysSince} days ago
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Client Table */}
      <div className="table-container">
        <div className="table-header">
          <h3>Client Portfolio</h3>
          <div className="table-actions">
            <input
              type="text"
              className="search-input"
              placeholder="Search clients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="table-count">{filtered.length} clients</span>
          </div>
        </div>
        <div className="client-table-wrapper">
          <table className="client-table">
            <thead>
              <tr>
                <th className="sortable-th" onClick={() => handleSort("name")}>
                  Client{getSortIndicator("name")}
                </th>
                <th className="sortable-th" onClick={() => handleSort("module")}>
                  Module{getSortIndicator("module")}
                </th>
                <th className="sortable-th" onClick={() => handleSort("health")}>
                  Health{getSortIndicator("health")}
                </th>
                <th className="sortable-th" onClick={() => handleSort("risk")}>
                  Risk{getSortIndicator("risk")}
                </th>
                <th className="sortable-th" onClick={() => handleSort("velocity")}>
                  Velocity{getSortIndicator("velocity")}
                </th>
                <th className="sortable-th" onClick={() => handleSort("value")}>
                  Value{getSortIndicator("value")}
                </th>
                <th>Next Best Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    {search ? "No clients match your search" : "No clients found"}
                  </td>
                </tr>
              ) : (
                filtered.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => router.push(`/client/${client.id}`)}
                  >
                    <td>
                      <div className="client-name-cell">
                        <span className="client-name">{client.name}</span>
                        <span className="client-company">{client.company}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-module">{client.module}</span>
                    </td>
                    <td>
                      <div className="health-bar-wrapper">
                        <span className="health-value" style={{ color: getHealthColor(client.healthScore) }}>
                          {client.healthScore ?? "—"}
                        </span>
                        <div className="health-bar">
                          <div
                            className="health-bar-fill"
                            style={{
                              width: `${client.healthScore || 0}%`,
                              backgroundColor: getHealthColor(client.healthScore),
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={getRiskBadgeClass(client.riskClassification)}>
                        {client.riskClassification}
                      </span>
                    </td>
                    <td>
                      <span className={getVelocityBadgeClass(client.velocityClassification)}>
                        {client.velocityClassification}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>
                        {client.valueCreationScore ?? "—"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                        {client.nextBestAction}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
