import assert from "power-assert";
import tekekarape, {Task} from "../index";

describe("Task", function() {
  describe("#run()", function() {
    it("returns a Promsie", function() {
      let task = tekekarape.createTask({
        output: "non-existing",
        run() {
          return Promise.resolve();
        }
      });
      task.run().then(function() {
        assert(true);
      }, function(reason) {
        assert(false, reason);
      });
    });

    it("returns rejected Promise when #_run() returns non-promise value.", function() {
      let task = tekekarape.createTask({
        output: "non-existing",
        run() {}
      });
      return task.run().then(function() {
        assert(false, "Resolved Promise is returned");
      }, function(reason) {
        assert(true);
      });
    });
  });
});

describe("createTask()", function() {
  it("throws an Error when no output given", function() {
    assert.throws(
      function() {
        tekekarape.createTask({
          run() {return Promise.resolve();}
        })
      },
      /No output given/
    );
  });

  it("casts requires to an Array when it's not an Arary", function() {
    let task = tekekarape.createTask({
      output: "dummy-file",
      requires: "dummy-task",
      run() {return Promise.resolve();}
    });
    assert.deepStrictEqual(task.requires, ["dummy-task"]);
  });

  it("doesn't cast requires to an Array when it's not an Array", function() {
    let task = tekekarape.createTask({
      output: "dummy-file",
      requires: ["dummy-task"],
      run() {return Promise.resolve();}
    });
    assert.deepStrictEqual(task.requires, ["dummy-task"]);
  });

  it("throws an Error when no run() function given", function() {
    assert.throws(
      function() {
        tekekarape.createTask({
          output: "dummy-file"
        }),
        /No run() function given/
      }
    );
  });
});
