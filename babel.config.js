module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        cwd: 'babelrc',
        root: ['./src'],
        alias: {
          '@components': './src/components',
          '@screens': './src/screens',
          '@App': './App',
          '@config': './src/config.js',
          '@context': './src/data/contexts',
          '@model': './src/data/models',
          '@providers': './src/providers',
          '@service': './src/data/services',
          '@theme': './src/theme',
          '@store': './src/store',
          '@transformer': './utils/Transformers',
          '@utils': './src/utils',
          '@router': './src/router',
        },
      },
    ],
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    // ['react-native-reanimated/plugin',]
  ],
  env: {
    production: {
      plugins: ['transform-remove-console'],
    },
  },
}
