const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        index: './src/frontend/index.tsx',
        another: './src/frontend/another-module.tsx',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].bundle.js',
        publicPath: '/',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/frontend/index.html',
            filename: 'index.html',
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/frontend/App.css', to: 'App.css' },
            ],
        }),
    ],
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                defaultVendors: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all',
                },
                shared: {
                    test: /[\\/]node_modules[\\/](lodash)[\\/]/,
                    name: 'shared',
                    chunks: 'all',
                },
            },
        },
        runtimeChunk: 'single',
    },
    performance: {
        maxEntrypointSize: 244000, // Define o tamanho máximo do entrypoint
        maxAssetSize: 244000, // Define o tamanho máximo dos assets
    },
    devServer: {
        static: {
            directory: path.join(__dirname, 'src/frontend'),
        },
        compress: true,
        port: 9000,
        historyApiFallback: true, // Adicionado para lidar com o roteamento do React
    },
    mode: 'development',
    target: 'web',
};
