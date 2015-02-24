'use strict';

var fs = require('fs');
var cp = require('child_process');
var os = require('os');
var csv = require('fast-csv');
var forEach = require('for-each');
var ProgressBar = require('progress');
var async = require('async');

function eachMeasurement(data, cb) {
  forEach(data, function (measurements, zone) {
    measurements.forEach(function (measurement) {
      cb(measurement, zone);
    });
  });
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

function getMaxMeasurement(measurement) {
  var maxRSSI;
  var maxBeacon;
  forEach(measurement, function (rssi, beacon) {
    if (!maxBeacon || maxRSSI < rssi) {
      maxBeacon = beacon;
      maxRSSI = measurement[beacon];
    }
  });
  return maxBeacon;
}

function fill(value, length) {
  value = value.toString();
  while (value.length < length) {
    value = ' ' + value;
  }
  return value;
}

function percent(value, total) {
  var x = (value / total * 100).toFixed(2);
  return fill(x, 6) + '%';
}

exports.loadCSVData = function (context, done) {
  context.data = {};

  function read(row) {
    var zone = row[0];
    context.data[zone] = context.data[zone] || [];
    var record = {};
    row.splice(1).forEach(function (x) {
      x = x.split(':');
      record[x[0]] = parseInt(x[1], 10);
    });
    context.data[zone].push(record);
  }

  csv
    .fromPath(context.csvFile)
    .on('data', read)
    .on('error', done)
    .on('end', function () { done(); });
};

exports.writeTrainData = function (context, done) {
  context.tempTrainFile = 'temp.train';
  var train = context.model ? false : true;
  if (train) {
    context.svmMapping = {};
    context.svmZones = [];
  }
  var out = fs.createWriteStream(context.tempTrainFile);
  var nextFeatureId = 0;
  eachMeasurement(context.data, function (measurement, zone) {
    var zoneIndex = context.svmZones.indexOf(zone);
    if (train && zoneIndex < 0) {
      zoneIndex = context.svmZones.length;
      context.svmZones.push(zone);
    }
    if (zoneIndex < 0) return;
    var beacons = [];
    forEach(measurement, function (rssi, beacon) {
      if (train && !context.svmMapping[beacon]) context.svmMapping[beacon] = nextFeatureId++;
      if (!context.svmMapping[beacon]) return;
      beacons.push([context.svmMapping[beacon], rssi]);
    });
    beacons = beacons.sort(function (a, b) { return a[0] - b[0]; });
    out.write((zoneIndex + 1) + ' ' + beacons.map(function (x) {
      return x.join(':');
    }).join(' ') + '\n');
  });
  out.end(done);
};

exports.trainSVM = function (context, done) {
  context.tempModelFile = 'temp.model';
  var params = makeSVMParams();
  var bestParam;
  var bar = new ProgressBar('Generating SVM model [:bar] :percent :etas', { width: 20, total: params.length + 1 });
  var queue = async.queue(function (param, done) {
    cp.exec('svm-train -v 5 -c ' + param.c + ' -g ' + param.g + ' ' + context.tempTrainFile, function (err, stdout) {
      bar.tick();
      var match = stdout.match(/Cross Validation Accuracy = (\d+(\.\d+)?)%/);
      if (match.length > 1) {
        param.accuracy = parseFloat(match[1]);
        if (!bestParam || bestParam.accuracy < param.accuracy) bestParam = param;
      }
      done();
    });
  }, os.cpus().length);

  params.forEach(function (param) {
    queue.push(param);
  });

  function finish(err) {
    bar.tick();
    if (err) return done(err);
    fs.readFile(context.tempModelFile, function (err, model) {
      if (err) return done(err);
      context.model = model.toString();
      done();
    });
  }

  queue.drain = function () {
    cp.exec('svm-train -b 1 -c ' + bestParam.c + ' -g ' + bestParam.g + ' ' + context.tempTrainFile + ' ' +
      context.tempModelFile, finish);
  };
};

exports.cleanup = function (context, done) {
  if (context.tempTrainFile) fs.unlinkSync(context.tempTrainFile);
  if (context.tempModelFile) fs.unlinkSync(context.tempModelFile);
  if (context.tempTestFile) fs.unlinkSync(context.tempTestFile);
  done();
};

exports.trainSimple = function (context, done) {
  var maxBeacons = {};
  eachMeasurement(context.data, function (measurement, zone) {
    var beacon = getMaxMeasurement(measurement);
    maxBeacons[beacon] = maxBeacons[beacon] || {};
    maxBeacons[beacon][zone] = maxBeacons[beacon][zone] || 0;
    maxBeacons[beacon][zone]++;
  });

  context.simpleMapping = {};
  var zonesCount = {};
  forEach(maxBeacons, function (zones, beacon) {
    var zone = getMaxMeasurement(zones);
    context.simpleMapping[beacon] = zone;
    zonesCount[zone] = zonesCount[zone] || 0;
    zonesCount[zone]++;
  });

  done();
};

exports.writeOutput = function (context, done) {
  var output = {
    simple: {
      mapping: context.simpleMapping
    }, svm: {
      beaconIDs: context.svmMapping,
      locationIDs: context.svmZones,
      model: context.model
    }
  };
  fs.writeFile(context.modelFile, JSON.stringify(output), done);
};

exports.loadModel = function (context, done) {
  fs.readFile(context.modelFile, function (err, model) {
    if (err) return done(err);
    model = JSON.parse(model.toString());
    context.model = model.svm.model;
    context.svmMapping = model.svm.mapping;
    context.svmZones = model.svm.zones;
    context.simpleMapping = model.simple.mapping;
    done();
  });
};

exports.writeModel = function (context, done) {
  context.tempModelFile = 'temp.model';
  fs.writeFile(context.tempModelFile, context.model, done);
};

exports.testSVM = function (context, done) {
  context.tempTestFile = 'temp.test';
  cp.exec('svm-predict -b 1 ' + context.tempTrainFile + ' ' + context.tempModelFile + ' ' + context.tempTestFile,
    function (err) {
      if (err) return done(err);
      fs.readFile(context.tempTestFile, function (err, contents) {
        if (err) return done(err);
        contents = contents.toString().split('\n');
        context.svmZone = [];
        context.svmProb = [];
        contents.forEach(function (row) {
          row = row.split(' ');
          var label = row[0];
          row.splice(0, 1);
          if (!context.svmProbHeader) {
            context.svmProbHeader = row;
          } else {
            context.svmZone.push(context.svmZones[parseInt(label, 10) - 1]);
            context.svmProb.push(row);
          }
        });
        done();
      });
    });
};

exports.testSimple = function (context, done) {
  context.simpleZone = [];
  eachMeasurement(context.data, function (measurement) {
    var beacon = getMaxMeasurement(measurement);
    context.simpleZone.push(context.simpleMapping[beacon]);
  });
  done();
};

exports.writeTestOutput = function (context, done) {
  context.hits = {};
  var out = fs.createWriteStream(context.reportFile);
  out.write('Zone,SIMPLE:Zone,SIMPLE:Correct,SVM:Zone,SVM:Correct,SVM:Prob,REAL:Prob,' +
    context.svmProbHeader.join(',') + ',Beacons...\t');
  var i = 0;
  eachMeasurement(context.data, function (measurement, zone) {
    var beacons = [];
    forEach(measurement, function (rssi, beacon) {
      beacons.push(beacon + ':' + rssi);
    });
    var svmZoneIndex = context.svmProbHeader.indexOf(context.svmZone[i]);
    var realZoneIndex = context.svmProbHeader.indexOf(zone);
    var hitSVM = zone === context.svmZone[i];
    var hitSimple = zone === context.simpleZone[i];
    if (!context.hits[zone]) context.hits[zone] = { svm: 0, simple: 0, total: 0 };
    if (hitSVM) context.hits[zone].svm++;
    if (hitSimple) context.hits[zone].simple++;
    context.hits[zone].total++;
    out.write(
      zone + ',' +
      context.simpleZone[i] + ',' +
      (hitSimple ? 'T' : 'F') + ',' +
      context.svmZone[i] + ',' +
      (hitSVM ? 'T' : 'F') + ',' +
      context.svmProb[i][svmZoneIndex] + ',' +
      context.svmProb[i][realZoneIndex] + ',' +
      context.svmProb[i].join(',') + ',' +
      beacons.join(',') + '\n'
    );
    i++;
  });
  out.end(done);
};

exports.reportAccuracy = function (context, done) {
  var total = { svm: 0, simple: 0, total: 0 };
  forEach(context.hits, function (hits, zone) {
    total.svm += hits.svm;
    total.simple += hits.simple;
    total.total += hits.total;
    console.log('[' + fill(zone, 2) + ']' +
      ' SVM: ' + fill(hits.svm + '/' + hits.total, 9) + ' ' + percent(hits.svm, hits.total) +
      ' SIMPLE: ' + fill(hits.simple + '/' + hits.total, 9) + ' ' + percent(hits.simple, hits.total));
  });
  console.log('===========================================================');
  console.log('         ' +
    ' SVM: ' + fill(total.svm + '/' + total.total, 9) + ' ' + percent(total.svm, total.total) +
    ' SIMPLE: ' + fill(total.simple + '/' + total.total, 9) + ' ' + percent(total.simple, total.total));

  done();
};
