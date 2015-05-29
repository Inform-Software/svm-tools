#!/usr/bin/env node

'use strict';

var fs = require('fs');
var minimist = require('minimist');
var q = require('q');
var forEach = require('for-each');
var util = require('./svm-tools/util');
var svmTools = require('./svm-tools');

var args = minimist(process.argv.splice(2));
if (args._.length < 2) {
  console.log('Usage: svm-test [test.csv|json] [model.json]');
  process.exit(-1);
}

var testdataFile = args._[0];
var modelFile = args._[1];

function percent(a, b) {
  if (!b) return '-';
  return (100.0 * a / b).toFixed(1) + '%';
}

function show(report) {
  console.log(['Zone', 'Records', 'SVM', '', 'Simple', ''].join('\t'));
  var count = 0;
  var svmHits = 0;
  var simpleHits = 0;
  forEach(report.svm, function (svmAccuracy, zone) {
    var simpleAccuracy = report.simple[zone];
    count += svmAccuracy.count;
    svmHits += svmAccuracy.hits;
    simpleHits += simpleAccuracy.hits;
    console.log([
      zone, svmAccuracy.count,
      svmAccuracy.hits, percent(svmAccuracy.hits, svmAccuracy.count),
      simpleAccuracy.hits, percent(simpleAccuracy.hits, simpleAccuracy.count)
    ].join('\t'));
  });
  console.log([
    'Total', count,
    svmHits, percent(svmHits, count),
    simpleHits, percent(simpleHits, count)
  ].join('\t'));
}

q.all([util.readCSV(testdataFile), q.nfcall(fs.readFile, modelFile)])
  .then(function (res) { return svmTools.test(res[0], JSON.parse(res[1].toString())); })
  .then(function (report) { show(report); })
  .done();
