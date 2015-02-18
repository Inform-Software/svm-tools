#!/usr/local/bin/node

'use strict';

var minimist = require('minimist');
var async = require('async');
var util = require('./lib/util');

var args = minimist(process.argv.splice(2));
if (args._.length < 2) {
  console.log('Usage: svmgen [train.csv] [modeldef.json]');
  process.exit(-1);
}

var context = {
  csvFile: args._[0],
  modelFile: args._[1]
};

async.applyEachSeries([
  util.loadCSVData,
  util.writeTrainData,
  util.trainSVM,
  util.cleanup,
  util.trainSimple,
  util.writeOutput
], context, function (err) {
  if (err) return console.error('Error: ' + err);
  console.log('Done.');
});
