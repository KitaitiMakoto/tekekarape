Tekekarape
==========

A tiny workflow engine.

It is inspired by @hakobera's Let's create workflow engine! articles([part 1][], [part 2][], [part 3][]).

It uses files for status management.

USAGE
-----

Let example.js:

```javascript
var workflow = require("tekekarape/index.es5").default;

var tenNumbersTask = workflow.createTask({
  output: "./numbers.txt",

  run(output) {
    var data = "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n";

    // Return a Promise.
    return output.write(data);
  }
});

var sumTask = workflow.createTask({
  requires: tenNumbersTask,
  output: "./sum.txt",

  run(output, inputs) {
    // inputs is an Array of input file paths.
    var input = inputs[0];

    return input.read()
      .then(data => data.split("\n")
            .map(Number)
            .filter(Number.isFinite)
            .reduce((sum, number) => sum + number))
      .then(sum => output.write(sum));
  }
});

workflow.run(sumTask, {verbose: true}).catch(error => {
  console.error(error.stack);
  process.exit(1);
});
```

    % node example.js
    [run]./numbers.txt
    [run]./sum.txt
    % cat numbers.txt
    1
    2
    3
    4
    5
    6
    7
    8
    9
    10
    % cat sum.txt
    55

If output files are exist already, tasks are skipped.

    % node example.js
    [skip]./numbers.txt
    [skip]./sum.txt

LICENSE
-------

LGPL-3.0

[part 1]: http://qiita.com/hakobera/items/d7742cc0801a9c62ef72
[part 2]: http://qiita.com/hakobera/items/478f55c9ddf682e5caca
[part 3]: http://qiita.com/hakobera/items/cf570090943ea177938e
