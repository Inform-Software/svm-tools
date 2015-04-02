'use strict';

var fs = require('fs');
var cp = require('child_process');
var os = require('os');
var q = require('q');
var async = require('async');
var forEach = require('for-each');
var tmp = require('tmp');
var util = require('./util');

function zoneListFromMapping(mapping) {
  var zones = [];
  forEach(mapping, function (i, zone) {
    zones[i - 1] = zone;
  });
  return zones;
}

function getZoneWithHighestCount(zones) {
  var max = -1;
  var maxZone;
  forEach(zones, function (count, zone) {
    if (count > max) {
      max = count;
      maxZone = zone;
    }
  });
  return maxZone;
}

function makeSimpleMapping(zones) {
  var mapping = {};
  var maxBeacons = {};

  // determine for each beacon the number of times it is the beacon with the highest RSSI for a zone
  util.eachRecord(zones, function (record, zone) {
    var beacon = util.getBeaconWithHighestRSSI(record.beacons);
    if (!beacon) return;
    var id = util.getBeaconId(beacon);
    maxBeacons[id] = maxBeacons[id] || {};
    maxBeacons[id][zone.zone] = maxBeacons[id][zone.zone] || 0;
    maxBeacons[id][zone.zone]++;
  });

  // assign a beacon to the zone where it was most often the highest recorded RSSI
  forEach(maxBeacons, function (zones, id) {
    mapping[id] = getZoneWithHighestCount(zones);
  });

  return mapping;
}

function makeZoneMapping(zones) {
  var mapping = {};
  var i = 1;
  zones.forEach(function (zone) {
    if (!mapping[zone.zone]) mapping[zone.zone] = i++;
  });
  return mapping;
}

function makeBeaconMapping(zones) {
  var mapping = {};
  var i = 1;
  util.eachRecord(zones, function (record) {
    record.beacons.forEach(function (beacon) {
      var id = util.getBeaconId(beacon);
      if (!mapping[id]) mapping[id] = i++;
    });
  });
  return mapping;
}

function makeSVMParams() {
  var i, j;
  var res = [];
  for (i = -5; i <= 15; i += 2) {
    for (j = -15; j <= 3; j += 2) {
      res.push({ c: Math.pow(2, i), g: Math.pow(2, j) });
    }
  }
  return res;
}

function trainSVM(dataFile, modelFile) {
  var defer = q.defer();
  var params = makeSVMParams();
  var bestParam;
  var count = 0;

  function trainParam(param, next) {
    cp.exec('svm-train -v 5 -c ' + param.c + ' -g ' + param.g + ' ' + dataFile, function (err, stdout) {
      var match = stdout.match(/Cross Validation Accuracy = (\d+(\.\d+)?)%/);
      if (match.length > 1) {
        param.accuracy = parseFloat(match[1]);
        if (!bestParam || bestParam.accuracy < param.accuracy) bestParam = param;
      }
      defer.notify(++count / params.length);
      next();
    });
  }

  function drain() {
    var command = 'svm-train -b 1 -c ' + bestParam.c + ' -g ' + bestParam.g + ' ' + dataFile + ' ' + modelFile;
    cp.exec(command, function (err) {
      if (err) return defer.reject(err);
      defer.resolve();
    });
  }

  var queue = async.queue(trainParam, os.cpus().length);
  queue.drain = drain;
  params.forEach(function (param) {
    queue.push(param);
  });

  return defer.promise;
}

module.exports = function (zones, progress) {
  var model = { simple: {}, svm: {} };

  // simple mapping
  model.simple.mapping = makeSimpleMapping(zones);

  // svm zones and mapping
  var zoneMapping = makeZoneMapping(zones);
  var beaconMapping = makeBeaconMapping(zones);
  model.svm.zones = zoneListFromMapping(zoneMapping);
  model.svm.mapping = beaconMapping;

  // svm training
  var dataFile = tmp.fileSync();
  var modelFile = tmp.fileSync();
  var svmData = util.makeSVMData(zones, zoneMapping, beaconMapping);
  return q.nfcall(fs.writeFile, dataFile.name, svmData)
    .then(function () { return trainSVM(dataFile.name, modelFile.name); })
    .then(function () { return q.nfcall(fs.readFile, modelFile.name);}, null, progress)
    .then(function (modelDef) { model.svm.model = modelDef.toString(); })
    .then(function () { dataFile.removeCallback(); })
    .then(function () { modelFile.removeCallback(); })
    .then(function () { return model; });
};
