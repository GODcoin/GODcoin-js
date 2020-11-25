const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

const devCommon = {
  mode: 'development',
  devtool: 'inline-source-map',
};

const node = merge(common.node, devCommon);
const web = merge(common.web, devCommon);

module.exports = [node, web];
