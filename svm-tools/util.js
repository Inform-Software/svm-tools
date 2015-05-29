'use strict';

var fs = require('fs');
var q = require('q');
var csv = require('fast-csv');

exports.getBeaconId = function (beacon) {
  return beacon.major + '-' + beacon.minor;
};

exports.eachRecord = function (zones, callback) {
  zones.forEach(function (zone) {
    zone.data.forEach(function (record) {
      //check if record null
      if (record) callback(record, zone);
    });
  });
};

exports.getBeaconWithHighestRSSI = function (beacons) {
  var maxBeacon;
  beacons.forEach(function (beacon) {
    if (!maxBeacon || (beacon.rssi < 0 && beacon.rssi > maxBeacon.rssi)) maxBeacon = beacon;
  });
  return maxBeacon;
};

exports.makeSVMData = function (zones, zoneMapping, beaconMapping) {
  var data = [];
  exports.eachRecord(zones, function (record, zone) {
    var zoneId = zoneMapping[zone.zone];
    if (!zoneId) return;

    // extract relevant beacon information
    var beacons = [];
    record.beacons.forEach(function (beacon) {
      if (!beacon.rssi) return;
      var id = beaconMapping[exports.getBeaconId(beacon)];
      if (!id) return;
      beacons.push([id, beacon.rssi]);
    });

    // sort beacon information
    beacons = beacons
      .sort(function (a, b) { return a[0] - b[0]; })
      .map(function (info) { return info.join(':'); });

    data.push(zoneId + ' ' + beacons.join(' '));
  });
  return data.join('\n');
};

exports.makeIndex = function (data) {
  var index = {};
  for (var i in data) {
    if (data.hasOwnProperty(i)) {
      index[data[i]] = i;
    }
  }
  return index;
};

exports.readCSV = function (file, defaultUUID) {

  // just parse json files
  if (file.substr(-5) === '.json') {
    return q.nfcall(fs.readFile, file)
    .then(function (contents) { return JSON.parse(contents.toString()); });
  }

  var defer = q.defer();
  var data = {};

  function read(row) {
    var zone = row[0];
    data[zone] = data[zone] || [];
    var beacons = row.splice(1).map(function (x) {
      x = x.split(':');
      var uuid = x.length > 2 ? x.splice(0, 1)[0] : defaultUUID;
      var beacon = x[0].split('-');
      return {
        uuid: uuid,
        major: parseInt(beacon[0], 10),
        minor: parseInt(beacon[1], 10),
        rssi: parseInt(x[1], 10)
      };
    });
    data[zone].push({ beacons: beacons });
  }

  function finish() {
    data = Object.keys(data).map(function (zone) { return { zone: zone, data: data[zone] }; });
    defer.resolve(data);
  }

  csv
    .fromPath(file)
    .on('data', read)
    .on('error', function (err) { defer.reject(err); })
    .on('end', finish);

  return defer.promise;
};
