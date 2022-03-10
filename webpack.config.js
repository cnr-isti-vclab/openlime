var webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

module.exports = {

  mode: 'development',

  devtool: 'eval-source-map',

  entry: {
    main: path.resolve(__dirname + '/src/index.js'),
  },

  output: {
    path: path.resolve(__dirname + '/dist/examples/npm-demo'),
    filename: 'main.js',
  },

  devServer: {
    static: {
      directory: path.join(__dirname, '/dist/examples/npm-demo'),
    },
    compress: false,
    port: 8080,
  },

  optimization: {
    minimize: false
  },

  plugins: [
    new HtmlWebpackPlugin({
      title: 'OpenLIME',
      template: __dirname + '/dist/examples/npm-demo/index-template.html',
      inject: false
    }),
  ],
}
