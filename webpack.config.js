const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./src/client/SimpleGame.ts",
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        include: path.resolve(__dirname, "src/client"),
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist/web"),
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/client/index.html",
    }),
    /*        new CopyWebpackPlugin({
            patterns: [
                { from: 'client/assets', to: 'assets' }, // if you have assets like images or audio files
            ],
        }), */
  ],
  devServer: {
    contentBase: "./dist/web",
  },
};
