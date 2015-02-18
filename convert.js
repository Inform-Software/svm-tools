#!/usr/local/bin/node

'use strict';

var fs = require('fs');
var csv = require('fast-csv');
var minimist = require('minimist');

var args = minimist(process.argv.splice(2));
if (args._.length < 2) {
  console.log('Usage: convert [input.csv] [output.csv]');
  process.exit(-1);
}

var inFile = args._[0];
var outFile = args._[1];

var out = fs.createWriteStream(outFile);

var count = 0;
var ts;
var outRow;

function read(row) {
  if (!outRow || ts !== row.Datestamp) {
    ts = row.Datestamp;
    if (outRow) out.write((count++ > 0 ? '\n' : '') + outRow.join(','));
    outRow = [parseInt(row[' SVM-Zone (for training)'], 10)];
  }
  outRow.push(row[' beaconID'].trim() + ':' + parseInt(row[' RSSI'], 10));
}

function end() {
  if (outRow) out.write('\n' + outRow.join(','));
}

csv
  .fromPath(inFile, { headers: true })
  .on('data', read)
  .on('end', end);
