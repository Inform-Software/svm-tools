# SVM Tools

To generate a model use:

```
svm-gen [train.csv] [modeldef.json]
```

To test a generated model use:

```
svm-test [test.csv] [modeldef.json] [report.csv]
```


## Installation

* `libsvm` must be installed (64bit)
* `svm-train` and `svm-predict` must be in the executable path


## Train/Test File Format

CSV without a header

* First element is the zone label
* Other elements are beacon measurements of the form BEACONID:RSSI

Example:

```
1,1-2:-71,1-1:-69,1-3:-86,1-4:-88
```


## Model File Format

JSON

* `simple.mapping` stores the simple beacon mapping (Beacon-ID -> Zone Number)
* `svm.mapping` stores the svm beacon mapping (Beacon-ID -> Feature Number)
* `svm.model` stores the model definition
