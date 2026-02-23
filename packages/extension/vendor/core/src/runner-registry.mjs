import { RUNNER_TYPES } from "../../shared/src/events.mjs";
import { listExtractorRunner } from "./runners/list-extractor-runner.mjs";
import { metadataExtractorRunner } from "./runners/metadata-extractor-runner.mjs";
import { pageExtractorRunner } from "./runners/page-extractor-runner.mjs";

export function createDefaultRunnerRegistry() {
  const runners = new Map();
  runners.set(listExtractorRunner.type, listExtractorRunner);
  runners.set(pageExtractorRunner.type, pageExtractorRunner);
  runners.set(metadataExtractorRunner.type, metadataExtractorRunner);

  return {
    has(type) {
      return runners.has(type);
    },
    get(type) {
      return runners.get(type) || null;
    },
    list() {
      return [
        {
          type: RUNNER_TYPES.LIST_EXTRACTOR,
          label: listExtractorRunner.label
        },
        {
          type: RUNNER_TYPES.PAGE_EXTRACTOR,
          label: pageExtractorRunner.label
        },
        {
          type: RUNNER_TYPES.METADATA_EXTRACTOR,
          label: metadataExtractorRunner.label
        }
      ];
    }
  };
}
