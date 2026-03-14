// Direct Notion REST API calls — avoids SDK v5 breaking changes
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = "2022-06-28";

async function notionFetch(endpoint, body = null) {
  const options = {
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.method = "POST";
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`https://api.notion.com/v1${endpoint}`, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion API error ${res.status}: ${err}`);
  }
  return res.json();
}

// Helper: extract plain text from Notion rich_text array
function getText(arr) {
  if (!arr || arr.length === 0) return "";
  return arr.map((t) => t.plain_text).join("");
}

// Helper: parse a single client page into a clean object
function parseClient(page) {
  const p = page.properties;
  return {
    id: page.id,
    url: page.url,
    name: getText(p.client_name?.title),
    company: getText(p.company_name?.rich_text),
    email: p.client_email?.email || null,
    phone: p.client_phone?.phone_number || null,
    status: p.status?.select?.name || "Unknown",
    module: p.current_module?.select?.name || "—",
    healthScore: p.health_score?.number ?? null,
    riskScore: p.risk_score?.number ?? null,
    riskClassification: p.risk_classification?.select?.name || "—",
    velocityClassification: p.velocity_classification?.select?.name || "—",
    valueCreationScore: p.value_creation_score?.number ?? null,
    nextBestAction: p.next_best_action?.select?.name || "—",
    riskTrajectory: p.risk_trajectory?.select?.name || "—",
    baselineRevenue: p.baseline_revenue?.number ?? 0,
    currentRevenue: p.current_revenue?.number ?? 0,
    onboardingDate: p.onboarding_date?.date?.start || null,
    moduleStartDate: p.module_start_date?.date?.start || null,
    slackChannelId: getText(p.slack_channel_id?.rich_text),
    advisorId: p.advisor_id?.relation?.[0]?.id || null,
    daysSinceLastArchitecture:
      p.days_since_last_architecture?.formula?.type === "number"
        ? p.days_since_last_architecture.formula.number
        : null,
    daysSinceLastSnapshot:
      p.days_since_last_snapshot?.formula?.type === "number"
        ? p.days_since_last_snapshot.formula.number
        : null,
    architectureMaturityIndex:
      p.architecture_maturity_index?.rollup?.number ?? 0,
  };
}

// Helper: parse a performance snapshot
function parseSnapshot(page) {
  const p = page.properties;
  return {
    id: page.id,
    weekOf: p.week_of?.date?.start || null,
    revenueCollected: p.revenue_collected?.number ?? 0,
    pipelineValue: p.pipeline_value?.number ?? 0,
    callsBooked: p.calls_booked?.number ?? 0,
    callsHeld: p.calls_held?.number ?? 0,
    dealsClosed: p.deals_closed?.number ?? 0,
    executionFrequency: p.execution_frequency?.select?.name || "None",
    delegationStatus: p.delegation_status?.select?.name || "N/A",
    governanceActive: p.governance_active?.checkbox || false,
  };
}

// Helper: parse an architecture submission
function parseArchSubmission(page) {
  const p = page.properties;
  return {
    id: page.id,
    name:
      getText(p.submission_name?.title) ||
      getText(p.Name?.title) ||
      "Untitled",
    submittedAt: p.submitted_date?.date?.start || page.created_time,
    assetType: p.asset_type?.select?.name || "—",
    completionStatus: p.completion_status?.select?.name || "Submitted",
    clientId: p.client?.relation?.[0]?.id || null,
    module: p.module?.select?.name || "—",
    assetContent: p.asset_content?.url || null,
    contextNotes: getText(p.context_notes?.rich_text),
    finalizedConfirmed: p.finalized_confirmed?.checkbox || false,
  };
}

// ─── Exported query functions ───────────────────────────────

export async function getActiveClients() {
  const data = await notionFetch(
    `/databases/${process.env.NOTION_CLIENT_MASTER_DB}/query`,
    {
      filter: {
        property: "status",
        select: { equals: "Active" },
      },
      sorts: [{ property: "risk_score", direction: "descending" }],
    }
  );
  return data.results.map(parseClient);
}

export async function getClientById(clientId) {
  const page = await notionFetch(`/pages/${clientId}`);
  return parseClient(page);
}

export async function getPerformanceSnapshots(clientId) {
  const data = await notionFetch(
    `/databases/${process.env.NOTION_PERFORMANCE_DB}/query`,
    {
      filter: {
        property: "client",
        relation: { contains: clientId },
      },
      sorts: [{ property: "week_of", direction: "descending" }],
      page_size: 12,
    }
  );
  return data.results.map(parseSnapshot);
}

export async function getArchitectureSubmissions(clientId) {
  const data = await notionFetch(
    `/databases/${process.env.NOTION_ARCHITECTURE_DB}/query`,
    {
      filter: {
        property: "client",
        relation: { contains: clientId },
      },
      sorts: [{ timestamp: "created_time", direction: "descending" }],
    }
  );
  return data.results.map(parseArchSubmission);
}

export async function getPendingSubmissions() {
  const data = await notionFetch(
    `/databases/${process.env.NOTION_ARCHITECTURE_DB}/query`,
    {
      filter: {
        or: [
          { property: "completion_status", select: { equals: "Submitted" } },
          { property: "completion_status", select: { equals: "Flagged" } },
        ],
      },
      sorts: [{ timestamp: "created_time", direction: "descending" }],
    }
  );
  return data.results.map(parseArchSubmission);
}
