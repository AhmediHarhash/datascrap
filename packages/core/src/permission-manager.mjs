function toHostPattern(urlValue) {
  try {
    const parsed = new URL(urlValue);
    return `${parsed.protocol}//${parsed.host}/*`;
  } catch (_error) {
    return null;
  }
}

function callChromeApi(fn, details) {
  return new Promise((resolve) => {
    fn(details, (result) => {
      const lastError = globalThis.chrome?.runtime?.lastError;
      if (lastError) {
        resolve({
          ok: false,
          error: lastError.message || "Chrome API error",
          result: null
        });
        return;
      }
      resolve({ ok: true, result });
    });
  });
}

function inferPermission(operation, context = {}) {
  if (operation === "download.images" || operation === "export.file") {
    return {
      permissions: ["downloads"],
      origins: []
    };
  }

  if (operation === "clipboard.write") {
    return {
      permissions: ["clipboardWrite"],
      origins: []
    };
  }

  if (operation === "network.api") {
    const pattern = toHostPattern(context.apiBaseUrl || context.url || "");
    if (!pattern) {
      return {
        permissions: [],
        origins: []
      };
    }
    return {
      permissions: [],
      origins: [pattern]
    };
  }

  if (operation === "extract.list" || operation === "extract.page" || operation === "extract.metadata") {
    const pattern = toHostPattern(context.startUrl || context.url || "");
    if (!pattern) {
      return {
        permissions: [],
        origins: []
      };
    }
    return {
      permissions: [],
      origins: [pattern]
    };
  }

  return {
    permissions: [],
    origins: []
  };
}

export function createPermissionManager(options = {}) {
  const chromeApi = options.chromeApi || globalThis.chrome;
  const assumeAllowedIfUnavailable = options.assumeAllowedIfUnavailable !== false;

  async function contains(details) {
    const response = await callChromeApi(chromeApi.permissions.contains.bind(chromeApi.permissions), details);
    if (!response.ok) return false;
    return Boolean(response.result);
  }

  async function request(details) {
    const response = await callChromeApi(chromeApi.permissions.request.bind(chromeApi.permissions), details);
    if (!response.ok) return false;
    return Boolean(response.result);
  }

  return {
    async ensureOperation(operation, context = {}) {
      if (!chromeApi?.permissions) {
        return {
          allowed: assumeAllowedIfUnavailable,
          operation,
          reason: assumeAllowedIfUnavailable ? "permissions_api_unavailable_assumed_allowed" : "permissions_api_unavailable"
        };
      }

      const details = inferPermission(operation, context);
      const permissionNeeded = (details.permissions || []).length > 0 || (details.origins || []).length > 0;
      if (!permissionNeeded) {
        return {
          allowed: true,
          operation,
          reason: "no_optional_permission_required"
        };
      }

      const alreadyGranted = await contains(details);
      if (alreadyGranted) {
        return {
          allowed: true,
          operation,
          reason: "permission_already_granted"
        };
      }

      const granted = await request(details);
      if (granted) {
        return {
          allowed: true,
          operation,
          reason: "permission_granted_by_user"
        };
      }

      return {
        allowed: false,
        operation,
        reason: "permission_denied_by_user"
      };
    }
  };
}
