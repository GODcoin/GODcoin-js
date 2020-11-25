const nodeExternals = require('webpack-node-externals');
const { merge } = require('webpack-merge');
const path = require('path');

const common = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ]
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'godcoin',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
};

const node = merge(common, {
  target: 'node',
  output: {
    filename: 'index.js',
  },
  externals: [
    nodeExternals(),
  ],
});

const web = merge(common, {
  target: 'web',
  output: {
    filename: 'index.browser.js',
  },
});

module.exports = { node, web };
