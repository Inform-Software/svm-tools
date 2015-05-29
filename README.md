# SVM Tools

SVM Tools provide some simple node wrappers around libsvm to train and test models.

## Installation

* Install [libsvm`](http://www.csie.ntu.edu.tw/~cjlin/libsvm/)
* Ensure that `svm-train` and `svm-predict` are in the executable path
* Install [node and npm](https://nodejs.org)
* Install svm-tools: `npm i -g svm-tools`


## CLI Usage

Generate a model:
```
svm-gen [train.csv|json] [model.json]
```

Test a generated model:

```
svm-test [test.csv|json] [model.json] [report.csv]
```

Train/Test File Format (CSV):

* First element is the zone label
* Other elements are beacon measurements of the form BEACONID:RSSI
* Alternatively, a JSON file using the testdata object format described below can be used as input.

Example:

```
1,1-2:-71,1-1:-69,1-3:-86,1-4:-88
```

Model File Format

```json
{
  "simple": {
    "mapping": {
      "1-1": "Zone A",
      "1-2": "Zone B"
    }
  },
  "svm": {
    "mapping": {
      "1-1": 1,
      "1-2": 2
    },
    "zones": ["Zone A", "Zone B"],
    "model": "..."
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
  "zone": "Zone A",
  "data": [{
    "date": "2012-04-23T18:25:43.511Z",
    "gps": {
      "east": 4.1237372,
      "north": 10.28288382,
      "accuracy": 1
    },
    "beacons": [{
      "uuid": "123e4567-e89b-12d3-a456-426655440000",
      "major": 1,
      "minor": 1,
      "rssi": -87
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
