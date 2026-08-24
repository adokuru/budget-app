const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const entryView = "      WidgetsEntryView(entry: entry)";
const background = `      if #available(iOSApplicationExtension 17.0, *) {
        WidgetsEntryView(entry: entry)
          .containerBackground(Color(red: 250.0 / 255.0, green: 250.0 / 255.0, blue: 248.0 / 255.0), for: .widget)
      } else {
        WidgetsEntryView(entry: entry)
      }`;

function patchWidget(source) {
  if (source.includes(".containerBackground(")) return source;
  if (!source.includes(entryView)) throw new Error("BudgetProgress widget entry view not found");
  return source.replace(entryView, background);
}

module.exports = function withWidgetContainerBackground(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const file = path.join(cfg.modRequest.platformProjectRoot, "ExpoWidgetsTarget", "BudgetProgress.swift");
      fs.writeFileSync(file, patchWidget(fs.readFileSync(file, "utf8")));
      return cfg;
    },
  ]);
};

module.exports.patchWidget = patchWidget;
