'use strict';

var fs = require('fs');
var cp = require('child_process');
var q = require('q');
var tmp = require('tmp');
var util = require('./util');

function testSimple(zones, mapping) {
  var accuracy = {};
  util.eachRecord(zones, function (record, zone) {
    var beacon = util.getBeaconWithHighestRSSI(record.beacons);
    if (!beacon) return;
    var result = mapping[util.getBeaconId(beacon)];
    accuracy[zone.zone] = accuracy[zone.zone] || { hits: 0, count: 0 };
    accuracy[zone.zone].count++;
    if (result === zone.zone) accuracy[zone.zone].hits++;
  });
  return accuracy;
}

function testSVM(dataFile, modelFile, resultFile) {
  return q.nfcall(cp.exec, 'svm-predict -b 1 ' + dataFile + ' ' + modelFile + ' ' + resultFile);
}

function parseZoneResult(input, zonesList) {
  if (!input) return;
  var result = {};
  input = input.split(' ');
  var i = parseInt(input[0], 10);
  result.zone = zonesList[i - 1];
  if (!result.zone) return;
  return result;
}

function parseResults(results, zones, model) {
  var i = 1;
  var accuracy = {};
  results = results.toString().split('\n');
  util.eachRecord(zones, function (record, zone) {
    var result = parseZoneResult(results[i++], model.svm.zones);
    if (!result) return;
    accuracy[zone.zone] = accuracy[zone.zone] || { hits: 0, count: 0 };
    accuracy[zone.zone].count++;
    if (result.zone === zone.zone) accuracy[zone.zone].hits++;
  });
  return accuracy;
}

module.exports = function (zones, model) {
  var report = {};

  report.simple = testSimple(zones, model.simple.mapping);

  var zoneMapping = util.makeIndex(model.svm.zones);
  var beaconMapping = model.svm.mapping;
  var svmData = util.makeSVMData(zones, zoneMapping, beaconMapping);

  var dataFile = tmp.fileSync();
  var modelFile = tmp.fileSync();
  var resultFile = tmp.fileSync();
  return q.all([
    q.nfcall(fs.writeFile, dataFile.name, svmData),
    q.nfcall(fs.writeFile, modelFile.name, model.svm.model)
  ]).then(function () { return testSVM(dataFile.name, modelFile.name, resultFile.name); })
    .then(function () { return q.nfcall(fs.readFile, resultFile.name); })
    .then(function (result) { return parseResults(result, zones, model); })
    .then(function (accuracy) { report.svm = accuracy; })
    .then(function () { dataFile.removeCallback(); })
    .then(function () { modelFile.removeCallback(); })
    .then(function () { resultFile.removeCallback(); })
    .then(function () { return report; });
};
