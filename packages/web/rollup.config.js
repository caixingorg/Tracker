import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const isProd = process.env.NODE_ENV === 'production';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      exports: 'named',
      sourcemap: !isProd
    },
    {
      file: 'dist/index.esm.js',
      format: 'es',
      exports: 'named',
      sourcemap: !isProd
    }
  ],
  external: [
    '@auto-tracker/utils',
    '@auto-tracker/core',
    '@auto-tracker/core/src/eventTracker.js',
    '@auto-tracker/core/src/performance.js',
    '@auto-tracker/core/src/errorMonitor.js'
  ],
  plugins: [
    nodeResolve(),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      presets: [
        ['@babel/preset-env', {
          targets: {
            browsers: ['> 1%', 'last 2 versions', 'not dead'],
            node: '14'
          }
        }]
      ]
    }),
    isProd && terser()
  ].filter(Boolean)
};
