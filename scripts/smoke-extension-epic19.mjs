import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function loadOrchestrator() {
  const moduleUrl = pathToFileURL(resolve("packages/core/src/autonomous-orchestrator.mjs")).href;
  return import(moduleUrl);
}

async function main() {
  const { ORCHESTRATION_STRATEGIES, createAutonomousExecutionPlan, parseAutonomousGoal, buildAutonomousDiscoveryUrl } =
    await loadOrchestrator();

  const conversationalLeadGoal = parseAutonomousGoal("I want info for home services in Miami latest");
  assert(conversationalLeadGoal.wantsExtract, "conversational lead goal should infer extraction intent");
  assert(conversationalLeadGoal.wantsLocalLeads, "home services hint should map to local leads intent");
  assert(conversationalLeadGoal.wantsFresh, "latest hint should enable fresh intent");
  const conversationalLeadPlan = createAutonomousExecutionPlan({
    goal: conversationalLeadGoal,
    startUrl: "",
    activeUrl: "",
    activeTool: "list",
    simpleMode: true
  });
  assert(
    conversationalLeadPlan.strategy === ORCHESTRATION_STRATEGIES.MAPS_AUTOPILOT,
    "local leads conversational intent should route to maps autopilot"
  );
  assert(
    String(conversationalLeadPlan.targetUrl || "").includes("google.com/maps/search/"),
    "maps autopilot plan should build google maps discovery target"
  );

  const freshNewsGoal = parseAutonomousGoal("latest ai market news");
  const freshNewsDiscovery = buildAutonomousDiscoveryUrl(freshNewsGoal);
  assert(freshNewsGoal.wantsFresh, "latest text should set wantsFresh");
  assert(freshNewsDiscovery.includes("google.com/search?q="), "fresh non-maps goal should use google search");
  assert(freshNewsDiscovery.includes("tbs=qdr:d"), "fresh non-maps goal should include recency query filter");

  const exportGoal = parseAutonomousGoal("export json");
  const exportPlan = createAutonomousExecutionPlan({
    goal: exportGoal,
    startUrl: "https://example.com",
    activeUrl: "https://example.com",
    activeTool: "list",
    simpleMode: true
  });
  assert(exportGoal.exportFormat === "json", "export goal should parse json format");
  assert(exportPlan.strategy === ORCHESTRATION_STRATEGIES.EXPORT_ONLY, "export-only command should route to export strategy");

  const accessGoal = parseAutonomousGoal("enable all access");
  const accessPlan = createAutonomousExecutionPlan({
    goal: accessGoal,
    startUrl: "",
    activeUrl: "https://example.com",
    activeTool: "list",
    simpleMode: true
  });
  assert(accessPlan.strategy === ORCHESTRATION_STRATEGIES.ACCESS_ONLY, "access command should route to access strategy");

  const emailGoal = parseAutonomousGoal("find contact emails for https://example.com");
  const emailPlan = createAutonomousExecutionPlan({
    goal: emailGoal,
    startUrl: "",
    activeUrl: "",
    activeTool: "list",
    simpleMode: true
  });
  assert(emailGoal.wantsEmail, "email command should set wantsEmail");
  assert(emailPlan.strategy === ORCHESTRATION_STRATEGIES.PAGE_AUTOPILOT, "email command should route to page autopilot");

  const pointGoal = parseAutonomousGoal("point and follow this page");
  const pointPlan = createAutonomousExecutionPlan({
    goal: pointGoal,
    startUrl: "https://example.com/list",
    activeUrl: "https://example.com/list",
    activeTool: "list",
    simpleMode: true
  });
  assert(pointPlan.strategy === ORCHESTRATION_STRATEGIES.POINT_FOLLOW_GUIDED, "point-follow command should route to guided strategy");

  const genericGoal = parseAutonomousGoal("find businesses in austin texas");
  const genericPlan = createAutonomousExecutionPlan({
    goal: genericGoal,
    startUrl: "",
    activeUrl: "https://example.com/search",
    activeTool: "list",
    simpleMode: true
  });
  assert(genericGoal.wantsExtract, "generic business discovery intent should infer extraction");
  assert(
    genericPlan.strategy === ORCHESTRATION_STRATEGIES.LIST_AUTODETECT_AUTOPILOT,
    "generic business discovery should route to list autodetect autopilot"
  );

  const targetedGoal = parseAutonomousGoal("extract 120 results for saas companies in texas");
  const targetedPlan = createAutonomousExecutionPlan({
    goal: targetedGoal,
    startUrl: "",
    activeUrl: "https://example.com/search",
    activeTool: "list",
    simpleMode: true
  });
  assert(targetedGoal.resultTarget === 120, "numeric result target should be parsed from conversational command");
  assert(
    targetedPlan.strategy === ORCHESTRATION_STRATEGIES.LIST_AUTODETECT_AUTOPILOT,
    "targeted list command should keep list autodetect strategy"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        scenariosChecked: 8
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic19] failed: ${error.message}`);
  process.exit(1);
});
