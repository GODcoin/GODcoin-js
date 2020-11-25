const common = require('./webpack.common.js');
const { merge } = require('webpack-merge');

const prodCommon = {
  mode: 'production',
};

const node = merge(common.node, prodCommon);
const web = merge(common.web, prodCommon);

module.exports = [node, web];
