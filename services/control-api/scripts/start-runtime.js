"use strict";

const mode = String(process.env.CONTROL_API_RUNTIME_MODE || "api")
  .trim()
  .toLowerCase();

if (mode === "jobs-worker" || mode === "worker") {
  require("./jobs-worker");
} else {
  require("../src/server");
}
