#!/usr/bin/env node

/**
 * transpiles a js file using esbuild
 *
 * Syntax: see help function
 */

import { basename, resolve } from "path";
import { argv } from "process";

import esbuild from "esbuild";
import sass from "sass";

function help() {
  console.log(
    `Syntax : %s [--debug] [--global-name] input output
    
    --global-name see https://esbuild.github.io/api/#global-name

    --debug disables minifaction and sets 'process.env.NODE_ENV' to "development" (defaults to "production")
     
    `,
    basename(process.argv[1]),
  );
  process.exit(-1);
}

process.argv.length < 4 && help();

const INPUT_ARG = Symbol("input_arg"),
  OUTPUT_ARG = Symbol("output_arg"),
  ARGS = {};

// process commandline args
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith("--")) {
    const { option, value = true } = arg.match(
      /^--(?<option>[^=]+)(=(?<value>.*))?$/,
    )?.groups;
    ARGS[option.toLowerCase()] = value;
  } else if (i + 2 === process.argv.length) {
    ARGS[INPUT_ARG] = process.argv[i];
    ARGS[OUTPUT_ARG] = process.argv[++i];
  } else {
    help();
  }
}

/**
 * returns a esbuild plugin mapping imports to globals.
 *
 * example:
 *  import components from '@wordpress\components';
 *  // => var components_default = window.wp.components;
 *
 * @param param0 the plugin configuration
 * @returns returns esbuild plugin instance
 *
 * @see https://github.com/fal-works/esbuild-plugin-global-externals as inspiration
 */
function ESBuildGlobalExternalsPlugin({
  regexp,
  computeGlobalName,
  name = "esbuild-globals-plugin",
}) {
  return {
    name,
    setup(build) {
      build.onResolve({ filter: regexp }, ({ path, ...args }) => ({
        path,
        namespace: name,
      }));

      build.onLoad({ filter: /.*/, namespace: name }, ({ path, ...args }) => {
        const defaultExportName = computeGlobalName(path.match(regexp));
        const contents = `export default ${defaultExportName};`;
        return { contents };
      });
    },
  };
}

/**
 * @param options the sass configuration (see https://sass-lang.com/documentation/js-api#options)
 * @returns returns esbuild plugin instance
 *
 * @see https://github.com/fayismahmood/sassEs as inspiration
 */
function ESBuildSassPlugin(options) {
  const name = "esbuild-sass-plugin";
  return {
    name,
    setup(build) {
      build.onResolve({ filter: /\.scss$/ }, (args) => ({
        path: resolve(args.resolveDir, args.path),
        namespace: name,
      }));
      build.onLoad({ filter: /.*/, namespace: name }, (args) => {
        const result = sass.renderSync({
          file: args.path,

          // see options here : https://sass-lang.com/documentation/js-api#options
          // includePaths: ["node_modules/breakpoint-sass/stylesheets"],

          // Despite the name, Sass does not write the CSS output to this file. The caller must do that themselves.
          // see https://sass-lang.com/documentation/js-api#outfile
          outFile: options[OUTPUT_ARG].replace(/\.js$/, ".css"),
          outputStyle: options.debug ? "expanded" : "compressed",
          sourceMap: options.debug,
          sourceComments: options.debug,
          sourceMapContents: options.debug,
          sourceMapEmbed: options.debug,
        });

        return {
          contents: result.css.toString(),
          loader: "css",
        };
      });
    },
  };
}

const ESBUILD_OPTIONS = {
  entryPoints: [ARGS[INPUT_ARG]],
  bundle: true,
  // assume mjs files contains jsx syntax
  loader: {
    ".mjs": "jsx",
  },
  platform: "browser",
  target: "esnext", // . The default target is esnext which means that by default, esbuild will assume all of the latest JavaScript features are supported.
  define: {
    "process.env.NODE_ENV": `"${ARGS.debug ? "development" : "production"}"`,
  },
  jsxFragment: "window.wp.element.Fragment",
  jsxFactory: "window.wp.element.createElement",
  outfile: ARGS[OUTPUT_ARG],
  minify: true,
  plugins: [
    ESBuildGlobalExternalsPlugin({
      // unfortunately we cannot use named capture groups since the regexp needs to be Go regex compatible
      regexp: /^(react|react-dom|@(wordpress|foo))(\/(.+))?$/,
      computeGlobalName: ([
        ,
        simplePackageName,
        packageScope,
        ,
        packageName,
      ]) => {
        switch (packageScope || simplePackageName) {
          case "react":
          case "react-dom":
            return "window.wp.element";
          case "wordpress":
            return `window.${
              packageScope === "wordpress" ? "wp" : packageScope
            }.${packageName.replace(/-(.)/g, (_, $1) => $1.toUpperCase())}`;
        }
      },
    }),
    ESBuildSassPlugin(ARGS),
  ],
};

if (ARGS["global-name"]) {
  ESBUILD_OPTIONS.globalName = ARGS["global-name"];
}

if (ARGS["debug"]) {
  ESBUILD_OPTIONS.sourcemap = "inline";
  delete ESBUILD_OPTIONS.minify;
}

esbuild.build(ESBUILD_OPTIONS).catch(() => process.exit(1));
