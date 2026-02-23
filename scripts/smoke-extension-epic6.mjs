import { metadataExtractorRunner } from "../packages/core/src/runners/metadata-extractor-runner.mjs";
import { __internal as metadataInternal } from "../packages/extension/background/metadata-extraction-engine.mjs";
import { __internal as pageInternal } from "../packages/extension/background/page-extraction-engine.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const actionConfig = pageInternal.normalizeActionConfig({
    pageActionType: "EXTRACT_PAGES_EMAIL",
    actions: [
      {
        type: "EXTRACT_PAGES_EMAIL",
        emailOptions: {
          deepScanEnabled: true,
          maxDepth: 10,
          maxLinksPerPage: 99,
          sameDomainOnly: false,
          domainFilters: "example.com, supplier.cn"
        }
      }
    ]
  });

  assert(actionConfig.actionType === "EXTRACT_PAGES_EMAIL", "action type normalization failed");
  assert(actionConfig.emailOptions.deepScanEnabled === true, "email deep scan option missing");
  assert(actionConfig.emailOptions.maxDepth === 3, "email maxDepth clamp failed");
  assert(actionConfig.emailOptions.maxLinksPerPage === 60, "email maxLinksPerPage clamp failed");
  assert(actionConfig.emailOptions.sameDomainOnly === false, "email sameDomainOnly normalization failed");
  assert(Array.isArray(actionConfig.emailOptions.domainFilters), "email domain filter normalization failed");

  const metadataOptions = metadataInternal.normalizeMetadataOptions({
    metadata: {
      includeMetaTags: false,
      includeJsonLd: true,
      includeReviewSignals: true,
      includeContactSignals: false,
      includeRawJsonLd: true
    }
  });
  assert(metadataOptions.includeMetaTags === false, "metadata includeMetaTags failed");
  assert(metadataOptions.includeJsonLd === true, "metadata includeJsonLd failed");
  assert(metadataOptions.includeRawJsonLd === true, "metadata includeRawJsonLd failed");

  let capabilityCalled = false;
  const result = await metadataExtractorRunner.run({
    automation: {
      config: {
        urls: ["https://example.com"]
      }
    },
    signal: null,
    emitProgress: () => {},
    capabilities: {
      metadataExtractionEngine: {
        async extractMetadataPages() {
          capabilityCalled = true;
          return {
            rows: [
              {
                url: "https://example.com",
                schemaTypeCount: 2
              }
            ],
            summary: {
              rowCount: 1
            }
          };
        }
      }
    }
  });

  assert(capabilityCalled, "metadata runner capability delegation failed");
  assert(Array.isArray(result.rows) && result.rows.length === 1, "metadata runner result mismatch");

  console.log(
    JSON.stringify(
      {
        ok: true,
        actionType: actionConfig.actionType,
        metadataOptions,
        delegatedRowCount: result.summary?.rowCount || 0
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic6] failed: ${error.message}`);
  process.exit(1);
});
