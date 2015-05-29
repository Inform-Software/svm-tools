# SVM Tools

SVM Tools provide some simple node wrappers around libsvm to train and test models.

## Installation

* Install [libsvm`](http://www.csie.ntu.edu.tw/~cjlin/libsvm/)
* Ensure that `svm-train` and `svm-predict` are in the executable path
* Install [node and npm](https://nodejs.org)
* Install node dependencies: `npm install`


## CLI Usage

Generate a model:
```
svm-gen [train.csv] [model.json]
```

Test a generated model:

```
svm-test [test.csv] [model.json] [report.csv]
```

Train/Test File Format (CSV):

* First element is the zone label
* Other elements are beacon measurements of the form BEACONID:RSSI

Example:

```
1,1-2:-71,1-1:-69,1-3:-86,1-4:-88
```

Model File Format

```json
{
  "simple": {
    "mapping": {
      BEACON_ID: ZONE_ID
    }
  },
  "svm": {
    "mapping": {
      BEACON_ID: SVM_FEATURE_ID
    },
    "zones": [ZONE_ID]
    "model": SVM_MODEL_DEF
  }
}
```

## Programmatic Usage

```
var svmTools = require('svm-tools');

// generate a model
svmTools.train(data, progressCallback).then(function (model) { ... });

// test a model
svmTools.test(data, model).then(function (report) { ... });
```

Testdata Object:

```json
[{
  "zone": ZONE_ID,
  "data": [{
    "date": TIMESTAMP (optional),
    "gps": {
      "east": GPS_EAST (optional),
      "north": GPS_NORTH (optional),
      "accuracy": GPS_ACCURACY (optional)
    },
    "beacons": [{
      "uuid": BEACON_UUID,
      "major": BEACON_MAJOR,
      "minor": BEACON_MINOR,
      "rssi": BEACON_RSSI
    }]
  }]
}]
```

Model Object (see description in section CLI Usage).

## Conversion scripts

* `convert.js` converts a legacy .csv file (from the BeaconScanner, see that repository) into one that can be used by svm-gen
* `convertCSV.js` converts the result of convert.js into a json that can be imported into an inform-location-server (see that repository)

# License

Copyright (c) 2015 Jonathan Diehl

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
