// const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const findChrome = require("chrome-finder");
const TerserPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

class EndWebpackPlugin {
  constructor(doneCallback, failCallback) {
    this.doneCallback = doneCallback;
    this.failCallback = failCallback;
  }

  apply(compiler) {
    compiler.hooks.done.tap("EndWebpackPlugin", (stats) => {
      this.doneCallback(stats);
    });
    compiler.hooks.failed.tap("EndWebpackPlugin", (err) => {
      this.failCallback(err);
    });
  }
}

const ghpages = require("gh-pages");
const outputPath = path.resolve(__dirname, ".public");

function publishGhPages() {
  return new Promise((resolve, reject) => {
    ghpages.publish(outputPath, { dotfiles: true }, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

module.exports = {
  mode: "production",
  entry: {
    main: "./src/main.js",
  },
  output: {
    path: outputPath,
    publicPath: "",
    filename: "[name]_[chunkhash:8].js",
  },
  resolve: {
    // 加快搜索速度
    modules: [path.resolve(__dirname, "node_modules")],
    // es tree-shaking
    mainFields: ["jsnext:main", "browser", "main"],
  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
        include: path.resolve(__dirname, "src"),
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
      {
        test: /\.(gif|png|jpe?g|eot|woff|ttf|svg|pdf)$/,
        loader: "base64-inline-loader",
      },
    ],
  },
  plugins: [
    // 自动删除public目录, 默认删除outputPath配置的目录
    new CleanWebpackPlugin({
      verbose: true, //开启在控制台输出信息
      dry: false,
    }),
    new TerserPlugin({
      parallel: false,
      exclude: /\/node_modules/,
      terserOptions: {
        compress: true,
      },
    }),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
    }),
    new MiniCssExtractPlugin({
      filename: "[name]_[contenthash:8].css",
      chunkFilename: "[id].css",
    }),
    new EndWebpackPlugin(async () => {
      // 调用 Chrome 渲染出 PDF 文件
      const chromePath = findChrome();
      spawnSync(chromePath, [
        "--headless",
        "--disable-gpu",
        `--print-to-pdf=${path.resolve(outputPath, "resume.pdf")}`,
        "https://qiyingcong.github.io/resume/index.html", // 这里注意改成你的在线简历的网站
      ]);
      // 发布到 ghpages
      await publishGhPages();
    }),
  ],
};
