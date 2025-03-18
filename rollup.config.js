import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import dts from 'rollup-plugin-dts';
import { defineConfig } from 'rollup';

import { readFileSync } from 'fs';
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const name = 'AutoTracker';
const isProd = process.env.NODE_ENV === 'production';
const isDev = !isProd;

// 创建基础配置
const createBaseConfig = (format) => {
  return {
    input: 'index.js',
    output: {
      name,
      format,
      banner: '/* AutoTracker SDK v' + pkg.version + ' */',
      sourcemap: false
    },
    plugins: [
      resolve(),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', {
            targets: {
              browsers: ['last 2 versions', 'not dead', 'not IE 11']
            },
            modules: false
          }]
        ]
      }),
      isProd && terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true
        }
      })
    ].filter(Boolean)
  };
};

// 开发配置
const devConfig = {
  ...createBaseConfig('umd'),
  output: {
    ...createBaseConfig('umd').output,
    file: 'dist/auto-tracker.js',
    sourcemap: 'inline'
  },
  plugins: [
    ...createBaseConfig('umd').plugins,
    isDev && serve({
      open: true,
      contentBase: ['dist', '.'],
      host: 'localhost',
      port: 3000
    }),
    isDev && livereload({
      watch: ['dist', 'example.html']
    })
  ].filter(Boolean)
};

// 生产配置
const prodConfig = [
  // ESM
  {
    ...createBaseConfig('es'),
    output: {
      ...createBaseConfig('es').output,
      file: pkg.module,
      exports: 'named'
    }
  },
  // CommonJS
  {
    ...createBaseConfig('cjs'),
    output: {
      ...createBaseConfig('cjs').output,
      file: pkg.main,
      exports: 'named'
    }
  },
  // UMD
  {
    ...createBaseConfig('umd'),
    output: {
      ...createBaseConfig('umd').output,
      file: pkg.browser,
      name,
      exports: 'named'
    }
  }
  // 类型定义文件暂时注释掉，因为我们没有TypeScript源文件
  // {
  //   input: 'dist/types/index.d.ts',
  //   output: {
  //     file: 'dist/auto-tracker.d.ts',
  //     format: 'es'
  //   },
  //   plugins: [dts()]
  // }
];

export default defineConfig(isDev ? devConfig : prodConfig);
