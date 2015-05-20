#!/usr/bin/env node

'use strict';

var fs = require('fs');
var q = require('q');
var minimist = require('minimist');
var util = require('./svm-tools/util');

var args = minimist(process.argv.splice(2));
if (args._.length < 2) {
  console.log('Usage: convertCSV [test.csv] [test.json] [UUID]');
  process.exit(-1);
}

var testdata = args._[0];
var outFile = args._[1];
var uuid = args._[2];

util.readCSV(testdata, uuid)
  .then(function (data) { return q.nfcall(fs.writeFile, outFile, JSON.stringify(data)); })
  .done();
