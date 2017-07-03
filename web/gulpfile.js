var gulp = require('gulp');
var crx = require('gulp-crx-pack');
var copy = require('gulp-copy');
var clean = require('gulp-clean');
var sequence = require('gulp-sequence');
var sass = require('gulp-sass');
var zip = require('gulp-zip');
var jsonTransform = require('gulp-json-transform');
var fs = require('fs');
var path = require('path');
var argv = require('yargs').argv;
var manifest = require('./extension/manifest');
var eslint = require('gulp-eslint');
var mocha = require('gulp-mocha');
var batch = require('gulp-batch');
var gutil = require('gulp-util');
var env = require('gulp-env');

function webpack(additionalOptions) {
  var webpackLib = require('webpack');
  var config = require('./webpack.config.js');
  if (!argv.debug) config.plugins.push(new webpackLib.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }),
    new webpackLib.optimize.OccurenceOrderPlugin(),
    new webpackLib.optimize.DedupePlugin());

  // Since some NodeJS modules expect to be running in Node, it is helpful
  // to set this environment var to avoid reference errors.
  var environmentVars = {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.BUILD': JSON.stringify(argv.debug? 'debug': 'release'),
    'process.env.DEBUG': JSON.stringify(!!argv.debug)
  };
  config.plugins.push(new webpackLib.DefinePlugin(environmentVars));
  return require('gulp-webpack')(Object.assign(config, additionalOptions));
}

gulp.task('static', (done) => sequence('crx', 'xpi')(done));
gulp.task('build', ['static']);
gulp.task('default', ['build']);

gulp.task('lint', () => {
  return gulp.src(['src/**/*.js', 'src/**/*.jsx'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('sass', function () {
  gulp.src(['./src/**/*.scss'])
    .pipe(sass({
      importer: require('npm-sass').importer,
      outputStyle: argv.debug ? 'nested' : 'compressed'
    }).on('error', sass.logError))
    .pipe(gulp.dest('./build'));
});

gulp.task('build-static', ['sass'], function() {
  return gulp.src('.')
    .pipe(webpack({
      entry: {
        background: './src/background/background.js',
        content: './src/content/content.js'
      }
    }))
    .pipe(gulp.dest('./extension/'));
});

gulp.task('pre-pack-copy', ['build-static'], function() {
  var entries = ['./extension/**/*', '!**/*.pem'];
  if (!argv.debug) entries.push('!**/*.map');
  return gulp.src(entries)
    .pipe(copy('./build/tmp', {prefix: 1}));
});

gulp.task('post-pack-clean', function() {
  return gulp.src(['./build/tmp'], {read: false})
        .pipe(clean());
});


// CHROME/OPERA web extension (.crx)
gulp.task('create-crx', function() {
  return gulp.src('./build/tmp')
    .pipe(crx({
      privateKey: fs.readFileSync('./extension/key.pem', 'utf8'),
      filename: manifest.name + (argv.debug ? '-debug' : '') + '.crx'
    }))
    .pipe(gulp.dest('./build'));
});

gulp.task('crx', (done) => sequence('create-crx', 'post-pack-clean')(done));


// FIREFOX web extension (.xpi)
gulp.task('xpi-modify-manifest', function() {
  // add applications key to manifest: https://developer.mozilla.org/en-US/Add-ons/WebExtensions/manifest.json/applications
  return gulp.src('./build/tmp/manifest.json')
    .pipe(jsonTransform(function(data) {
        return Object.assign(data, {
          applications: {
            gecko: {
              id: "mailproxy@avast.com",
              strict_min_version: "48.0"
            }
          }
        });
    }, 4))
    .pipe(gulp.dest('./build/tmp/'));
});

gulp.task('create-xpi', ['xpi-modify-manifest'], function() {
  return gulp.src('./build/tmp/**/*.*')
    .pipe(zip(manifest.name + (argv.debug ? '-debug' : '') + '.xpi'))
    .pipe(gulp.dest('./build'));
});

gulp.task('xpi', (done) => sequence('create-xpi', 'post-pack-clean')(done));


// Unit-tests
const runTest = (paths, reporter = 'spec', envVars) => {
  gutil.log('Running tests ', paths);
  return gulp.src(paths, { read: false })
    .pipe(env.set(envVars))
    .pipe(mocha({
      compilers: ['js:babel-core/register'],
      reporter,
    }));
};
gulp.task('test', function() {
  return runTest(['src/test/**/*.js*']);
});
gulp.task('junit', function() {
  return runTest(['src/test/**/*.js*'], 'mocha-jenkins-reporter', {JUNIT_REPORT_PATH: './build/junit.xml'});
});


// Live rebuild
gulp.task('watch', function () {
  gulp.watch(['src/background/**/*.*', 'src/content/**/*.*'], { read: false }, batch((events, done) => {
    gulp.start('static', done);
  }));

  gulp.watch(['src/test/**/*.*'], { read: false }, batch((events, done) => {
    events.on('data', (file) => runTest(file.path)).on('end', done);
  }));
});
