const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

// Needed when or if we have other resources added like images
// const CopyWebpackPlugin = require("copy-webpack-plugin")

module.exports = {
  mode: "development",
  entry: "./src/client/SimpleGame.ts",
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: path.resolve(__dirname, "src/client"),
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true,
            compilerOptions: {
              declaration: false,
              declarationMap: false
            }
          }
        }
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
