const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: {
            index: './frontend/src/index.tsx',
        },
        output: {
            path: path.resolve(__dirname, isProduction ? 'dist' : 'frontend/build'),
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
                template: './frontend/public/index.html',
                filename: 'index.html',
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
                },
            },
            runtimeChunk: 'single',
        },
        performance: {
            maxEntrypointSize: 244000,
            maxAssetSize: 244000,
        },
        devServer: {
            static: {
                directory: path.join(__dirname, 'frontend/public'),
            },
            compress: true,
            port: 9000,
            historyApiFallback: true,
        },
        mode: isProduction ? 'production' : 'development',
        target: 'web',
    };
};
