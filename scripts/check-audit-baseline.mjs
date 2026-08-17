import { spawnSync } from "node:child_process";

const allowedAdvisories = new Set([
  "GHSA-w3rx-r6r6-pgpr",
  "GHSA-5p2g-fcmc-qvqq"
]);

const result = spawnSync("pnpm", ["audit", "--prod", "--json"], {
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024
});

if (!result.stdout) {
  console.error("pnpm audit did not return JSON output.");
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error("pnpm audit returned malformed JSON.");
  process.exit(1);
}

const advisories = Object.values(report.advisories ?? {});
const unknown = advisories.filter(
  (advisory) => !allowedAdvisories.has(advisory.github_advisory_id)
);
const critical = advisories.filter((advisory) => advisory.severity === "critical");

if (unknown.length > 0 || critical.length > 0) {
  for (const advisory of [...new Set([...unknown, ...critical])]) {
    console.error(
      `${advisory.severity}: ${advisory.module_name} ${advisory.github_advisory_id}`
    );
  }
  console.error(
    "A new or critical production dependency advisory is not covered by the reviewed baseline."
  );
  process.exit(1);
}

console.log(
  `Dependency audit matches the reviewed baseline (${advisories.length} known advisories, 0 unknown).`
);
