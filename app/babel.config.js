module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // Lets the drizzle-kit-generated migrations file inline raw .sql content at bundle time.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
