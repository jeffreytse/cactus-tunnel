import path from "path";
import webpack from "webpack";
import HtmlPlugin from "html-webpack-plugin";

const config: webpack.Configuration = {
  mode: process.env.NODE_ENV !== "production" ? "development" : "production",
  entry: path.resolve(__dirname, "src/bundle.js"),
  output: {
    path: path.resolve(__dirname, "public/js"),
    filename: "bundle.[contenthash].min.js",
  },
  module: {
    rules: [
      {
        exclude: /(node_modules)/,
        loader: "babel-loader",
        test: /\.[tj]sx?$/,
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
    fallback: {
      http: false,
      https: false,
      path: false,
      fs: false,
      zlib: false,
      os: false,
      util: require.resolve("util"),
      url: require.resolve("url"),
      buffer: require.resolve("buffer"),
    },
  },
  // devtool: "inline-source-map",
  plugins: [
    new HtmlPlugin({
      filename: path.resolve(__dirname, "public/index.html"),
      template: path.resolve(__dirname, "public/index.html"),
    }),
    // fix "process is not defined" error:
    // (do "npm install process" before running the build)
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
    // fix "Buffer is undefined" error:
    // https://github.com/webpack/changelog-v5/issues/10
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.DefinePlugin({
      setImmediate: (cb: () => void) => cb(),
    }),
  ],
};

export default config;
