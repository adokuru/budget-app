const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

// ponytail: replaces @morrowdigital/watermelondb-expo-plugin, which is stale
// (tested to SDK 50) and hardcodes ../node_modules/@nozbe/simdjson — a path that
// does not exist under pnpm's hoisted layout. iOS needs exactly one Podfile line.
// Android support goes here when we get there.
module.exports = function withWatermelonDB(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      const contents = fs.readFileSync(podfile, "utf8");
      if (contents.includes("pod 'simdjson'")) return cfg;

      const simdjson = path.dirname(
        require.resolve("@nozbe/simdjson/package.json", {
          paths: [cfg.modRequest.projectRoot],
        })
      );
      const rel = path.relative(cfg.modRequest.platformProjectRoot, simdjson);

      fs.writeFileSync(
        podfile,
        contents.replace(
          /^(\s*)post_install do \|installer\|/m,
          `$1pod 'simdjson', path: '${rel}', modular_headers: true\n\n$1post_install do |installer|`
        )
      );
      return cfg;
    },
  ]);
};
