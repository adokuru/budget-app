module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "react" }]],
    plugins: [
      // WatermelonDB models use legacy decorators; must come before other plugins.
      ["@babel/plugin-proposal-decorators", { legacy: true }],
    ],
  };
};
