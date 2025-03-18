/**
 * AutoTracker SDK Build Script
 * 
 * This script builds all platform-specific SDKs and places them in the dist directory.
 * It replaces the need to run separate builds for each package.
 */

import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import { rimraf } from 'rimraf';
import fs from 'fs';
import path from 'path';

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Clean dist directory
console.log('Cleaning dist directory...');
await rimraf('dist/*');

const isProd = process.env.NODE_ENV === 'production';
console.log(`Building in ${isProd ? 'production' : 'development'} mode...`);

// Custom plugin to resolve package aliases
const resolvePackageAliases = () => ({
  name: 'resolve-package-aliases',
  resolveId(source, importer) {
    // Map package names to local paths
    if (source.startsWith('@auto-tracker/')) {
      const packageName = source.replace('@auto-tracker/', '');
      if (packageName.includes('/')) {
        // Handle deep imports like @auto-tracker/core/src/config.js
        const [pkg, ...rest] = packageName.split('/');
        return `${process.cwd()}/packages/${pkg}/${rest.join('/')}`;
      }
      return `${process.cwd()}/packages/${packageName}/src/index.js`;
    }
    return null;
  }
});

// Enhanced plugins with alias resolution
const getPlugins = () => [
  resolvePackageAliases(),
  nodeResolve({
    preferBuiltins: false
  }),
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
].filter(Boolean);

// Build configurations for each platform
const buildConfigs = [
  // Web SDK
  {
    input: 'packages/web/src/index.js',
    output: [
      {
        file: 'dist/auto-tracker-web.js',
        format: 'umd',
        name: 'AutoTracker',
        sourcemap: !isProd,
        banner: '/* AutoTracker Web SDK */'
      },
      {
        file: 'dist/auto-tracker-web.esm.js',
        format: 'es',
        sourcemap: !isProd,
        banner: '/* AutoTracker Web SDK */'
      }
    ],
    // Don't treat any modules as external for the web build
    external: [],
    plugins: getPlugins()
  },
  // WeChat Mini Program SDK
  {
    input: 'packages/wechat/src/index.js',
    output: [
      {
        file: 'dist/auto-tracker-wechat.js',
        format: 'cjs',
        sourcemap: !isProd,
        banner: '/* AutoTracker WeChat Mini Program SDK */',
        exports: 'auto'
      },
      {
        file: 'dist/auto-tracker-wechat.esm.js',
        format: 'es',
        sourcemap: !isProd,
        banner: '/* AutoTracker WeChat Mini Program SDK */'
      }
    ],
    // Don't treat any modules as external for the mini program builds
    external: [],
    plugins: getPlugins()
  },
  // Alipay Mini Program SDK
  {
    input: 'packages/alipay/src/index.js',
    output: [
      {
        file: 'dist/auto-tracker-alipay.js',
        format: 'cjs',
        sourcemap: !isProd,
        banner: '/* AutoTracker Alipay Mini Program SDK */',
        exports: 'auto'
      },
      {
        file: 'dist/auto-tracker-alipay.esm.js',
        format: 'es',
        sourcemap: !isProd,
        banner: '/* AutoTracker Alipay Mini Program SDK */'
      }
    ],
    // Don't treat any modules as external for the mini program builds
    external: [],
    plugins: getPlugins()
  }
];

// Build each configuration
for (const config of buildConfigs) {
  console.log(`Building ${config.input}...`);
  try {
    const bundle = await rollup(config);
    
    for (const outputConfig of config.output) {
      console.log(`Writing ${outputConfig.file}...`);
      await bundle.write(outputConfig);
    }
    
    await bundle.close();
  } catch (error) {
    console.error(`Error building ${config.input}:`, error);
    process.exit(1);
  }
}

console.log('Build completed successfully!');

// Create package.json files for each platform
const createPackageJson = (platform, main, module) => {
  const packageJson = {
    name: `auto-tracker-${platform}`,
    version: '1.0.0',
    description: `AutoTracker SDK for ${platform}`,
    main,
    module,
    types: `auto-tracker-${platform}.d.ts`,
    keywords: [
      'analytics',
      'tracking',
      'performance',
      'error-monitoring',
      platform
    ],
    author: '',
    license: 'MIT'
  };
  
  fs.writeFileSync(
    path.join('dist', `package-${platform}.json`),
    JSON.stringify(packageJson, null, 2)
  );
};

createPackageJson('web', './auto-tracker-web.js', './auto-tracker-web.esm.js');
createPackageJson('wechat', './auto-tracker-wechat.js', './auto-tracker-wechat.esm.js');
createPackageJson('alipay', './auto-tracker-alipay.js', './auto-tracker-alipay.esm.js');

console.log('Package.json files created.');
