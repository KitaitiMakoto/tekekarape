import fs from "fs";
import crypto from "crypto";
import toposort from "toposort";

class Workflow {
  run(task) {
    let dag = new DAG();
    dag.addTask(task);
    let graph = dag.makeGraph();
    let firstTask = graph.shift();
    graph.reduce((flow, t) => {
      return flow.then(() => t.run())
    }, firstTask.run()).catch(error => {
      console.error(error.stack);
      process.exit(1);
    });
  }
}

class DAG {
  constructor() {
    this.tasks = {};
    this.edges = [];
  }

  addTask(task) {
    task.requires.forEach(t => {
      this.edges.push([task, t]);
      this.addTask(t);
    });
  }

  makeGraph() {
    let graph = toposort(this.edges);
    graph.reverse();
    return graph;
  }
}

class Task {
  constructor() {
    this.requires = [];
  }

  /**
   * @return Promise
   */
  run() {
    return this.output.exists().then(exists => {
      if (exists) {
        return;
      }
      let inputs = this.requires.map(t => t.output);
      let ran = this._run(this.output, inputs);
      if (! (ran instanceof Promise)) {
        return Promise.reject(new Error(`run() must return a Promise but ${ran} is returned.`));
      }
      return ran;
    });
  }
}

class Target {
}

class LocalFileTarget extends Target {
  /**
   * @param {string} path - File path for this task to output.
   */
  constructor(path) {
    super();
    this.path = path;
  }

  /**
   * @return Promise - true when file exsits, false otherwise.
   */
  exists() {
    return new Promise((resolve, reject) => {
      fs.stat(this.path, (error, stats) => {
        resolve(error === null);
      });
    });
  }

  /**
   * @return Promise
   */
  read() {
    return new Promise((resolve, reject) => {
      fs.readFile(this.path, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data.toString());
        }
      });
    });
  }

  /**
   * @param {string|Buffer} data
   */
  write(data) {
    return new Promise((resolve, reject) => {
      fs.writeFile(this.path, data, error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

export {Workflow, DAG, Task, Target, LocalFileTarget};
export default {
  createLocalFileTarget(path) {
    return new LocalFileTarget(path);
  },

  createTask(descriptor) {
    let task = new Task();
    task.output = (descriptor.output instanceof Target) ?
      descriptor.output : new LocalFileTarget(descriptor.output);
    if (descriptor.requires) {
      if (Array.isArray(descriptor.requires)) {
        task.requires = descriptor.requires;
      } else {
        task.requires = Array(descriptor.requires);
      }
    }
    task._run = descriptor.run;

    return task;
  },

  run(task) {
    let workflow = new Workflow();
    workflow.run(task);
  }
}
