#!/usr/local/bin/node

'use strict';

var minimist = require('minimist');
var async = require('async');
var util = require('./lib/util');

var args = minimist(process.argv.splice(2));
if (args._.length < 3) {
  console.log('Usage: svm-test [test.csv] [modeldef.json] [report.csv]');
  process.exit(-1);
}

var context = {
  csvFile: args._[0],
  modelFile: args._[1],
  reportFile: args._[2]
};

async.applyEachSeries([
  util.loadModel,
  util.loadCSVData,
  util.writeTrainData,
  util.writeModel,
  util.testSVM,
  util.cleanup,
  util.testSimple,
  util.writeTestOutput,
  util.reportAccuracy
], context, function (err) {
  if (err) return console.error('Error: ' + err);
  console.log('Done.');
});
