import { readFileSync } from "node:fs";

const REQUIRED_CHECKS = ["Extension Hardening / local-hardening-e2e"];

function parseArgs(argv = []) {
  const options = {
    repo: "",
    branch: "main",
    dryRun: false,
    apply: false
  };

  for (const rawArg of argv) {
    const arg = String(rawArg || "").trim();
    if (!arg) continue;

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }
    if (arg.startsWith("--repo=")) {
      options.repo = arg.slice("--repo=".length).trim();
      continue;
    }
    if (arg.startsWith("--branch=")) {
      const parsed = arg.slice("--branch=".length).trim();
      if (parsed) {
        options.branch = parsed;
      }
    }
  }

  if (!options.apply) {
    options.dryRun = true;
  }

  return options;
}

function inferRepoFromGitRemote() {
  let gitConfig = "";
  try {
    gitConfig = readFileSync(".git/config", "utf8");
  } catch (_error) {
    return "";
  }
  const match = gitConfig.match(/\[remote "origin"\][\s\S]*?url\s*=\s*(.+)/i);
  const remoteUrl = match ? String(match[1] || "").trim() : "";
  if (!remoteUrl) return "";

  const candidates = [
    remoteUrl.replace(/^https?:\/\/github\.com\//i, ""),
    remoteUrl.replace(/^git@github\.com:/i, ""),
    remoteUrl.replace(/^ssh:\/\/git@github\.com\//i, "")
  ];

  for (const candidate of candidates) {
    let trimmed = String(candidate || "").trim();
    if (!trimmed || trimmed === remoteUrl) continue;
    trimmed = trimmed.replace(/\.git$/i, "");
    trimmed = trimmed.replace(/[#?].*$/, "");
    const parts = trimmed.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
  }

  return "";
}

function buildPayload() {
  return {
    required_status_checks: {
      strict: true,
      contexts: REQUIRED_CHECKS
    },
    enforce_admins: true,
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      require_code_owner_reviews: false,
      required_approving_review_count: 1
    },
    restrictions: null,
    required_linear_history: true,
    allow_force_pushes: false,
    allow_deletions: false,
    block_creations: false,
    required_conversation_resolution: true,
    lock_branch: false,
    allow_fork_syncing: true
  };
}

async function githubRequest({ url, method, token, body }) {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = {
      raw: text
    };
  }

  if (!response.ok) {
    throw new Error(`GitHub API ${method} ${url} failed (${response.status}): ${JSON.stringify(json)}`);
  }

  return json;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repo = options.repo || inferRepoFromGitRemote();
  const branch = options.branch;

  if (!repo) {
    throw new Error("Could not resolve repo. Use --repo=owner/name.");
  }

  const payload = buildPayload();
  const target = `https://api.github.com/repos/${repo}/branches/${branch}/protection`;

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          repo,
          branch,
          requiredChecks: REQUIRED_CHECKS,
          request: {
            method: "PUT",
            url: target,
            payload
          }
        },
        null,
        2
      )
    );
    return;
  }

  const token = String(process.env.GITHUB_TOKEN || "").trim();
  if (!token) {
    throw new Error("GITHUB_TOKEN is required when using --apply.");
  }

  try {
    await githubRequest({
      url: target,
      method: "PUT",
      token,
      body: payload
    });
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("Upgrade to GitHub Pro or make this repository public")) {
      throw new Error(
        "Branch protection is unavailable on this repository plan. Fallback enforcement is available via workflows: " +
          "`Extension Hardening` on `main` pushes and `Main Push Policy`."
      );
    }
    throw error;
  }

  const protection = await githubRequest({
    url: target,
    method: "GET",
    token
  });

  const contexts = Array.isArray(protection?.required_status_checks?.contexts)
    ? protection.required_status_checks.contexts
    : [];

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: false,
        repo,
        branch,
        requiredChecksApplied: contexts
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[apply-branch-protection] failed: ${error.message}`);
  process.exit(1);
});
