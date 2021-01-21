var webpack = require('webpack')

module.exports = {

  entry: {
    OpenLime: './openlime.js',
  },

  output: {
    path: __dirname + '/dist',
    filename: '[name].js',
    libraryTarget: 'var',
    library: '[name]'
  },

  optimization: {
    minimize: false
  }    
}
