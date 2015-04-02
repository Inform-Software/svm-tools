#!/usr/bin/env node

'use strict';

var fs = require('fs');
var q = require('q');
var minimist = require('minimist');
var ProgressBar = require('progress');
var util = require('./svm-tools/util');
var svmTools = require('./svm-tools');

var args = minimist(process.argv.splice(2));
if (args._.length < 2) {
  console.log('Usage: svm-gen [train.csv] [model.json]');
  process.exit(-1);
}

var traindataFile = args._[0];
var modelFile = args._[1];

var bar = new ProgressBar('Generating SVM model [:bar] :percent :etas', { width: 20, total: 1 });
function reportProgress(progress) {
  bar.tick(progress - bar.curr);
}

util.readCSV(traindataFile)
  .then(function (data) { return svmTools.train(data, reportProgress); })
  .then(function (model) { return q.nfcall(fs.writeFile, modelFile, JSON.stringify(model)); })
  .done();
