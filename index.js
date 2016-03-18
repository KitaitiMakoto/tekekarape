import fs from "fs";
import toposort from "toposort";

class Workflow {
  run(task, options = {verbose: false, dryrun: false}) {
    let dag = new DAG();
    dag.addTask(task);
    let graph = dag.sort();
    let firstTask = graph.shift();
    if (! firstTask) {
      return Promise.resolve();
    }
    return graph.reduce((flow, t) => {
      return flow.then(() => t.run(options))
    }, firstTask.run(options));
  }
}

class DAG {
  constructor() {
    this.edges = [];
  }

  addTask(task) {
    if (task.requires.length === 0) {
      this.edges.push([task, new NullTask()])
    } else {
      task.requires.forEach(t => {
        this.edges.push([task, t]);
        this.addTask(t);
      });
    }
  }

  sort() {
    let sorted = toposort(this.edges);
    sorted.reverse();
    return sorted;
  }
}

class Task {
  constructor(output, requires = []) {
    if (output instanceof Target) {
      this.output = output;
    } else {
      this.output = new LocalFileTarget(output);
    }
    this.requires = requires ? [].concat(requires) : [];
  }

  /**
   * @return Promise
   */
  run(options = {verbose: false, dryrun: false}) {
    return this.output.exists().then(exists => {
      if (exists) {
        if (options.verbose || options.dryrun) {
          console.log(`[skip]${this.output.path}`);
        }
        if (options.dryrun) {
          return Promise.resolve();
        }
        return;
      }
      if (options.verbose || options.dryrun) {
        console.log(`[run]${this.output.path}`);
      }
      if (options.dryrun) {
        return Promise.resolve();
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

class NullTask extends Task {
  constructor() {
    super({
      exists() {
        return Promise.resolve();
      }
    });
  }

  run() {
    return Promise.resolve();
  }
}

class PrerequisiteTask extends Task {
  constructor(path) {
    super(path);
  }

  run(options = {verbose: false, dryrun: false}) {
    return this.output.exists().then(exists => {
      if (options.verbose || options.dryrun) {
        if (exists) {
          console.log(`[exist]${this.output.path}`);
        } else {
          console.log(`[missing]${this.output.path}`);
        }
      }
      if (! exists) {
        return Promise.reject(new Error(`Prerequisite file not exist: ${this.output.path}`));
      }
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

export {Workflow, DAG, Task, PrerequisiteTask, Target, LocalFileTarget};
export default {
  createLocalFileTarget(path) {
    return new LocalFileTarget(path);
  },

  createTask(descriptor) {
    if (! descriptor.output) {
      throw new Error("No output given");
    }
    let requires;
    if (descriptor.requires) {
      if (Array.isArray(descriptor.requires)) {
        requires = descriptor.requires;
      } else {
        requires = Array(descriptor.requires);
      }
    }
    let task = new Task(descriptor.output, requires);
    if (! descriptor.run) {
      throw new Error("No run() function given");
    }
    task._run = descriptor.run;

    return task;
  },

  createPrerequisiteTask(path) {
    return new PrerequisiteTask(path);
  },

  run(task, options = {verbose: false, dryrun: false}) {
    let workflow = new Workflow();
    return workflow.run(task, options);
  },

  checkStatus(task) {
    let dag = new DAG();
    dag.addTask(task);
    let tasks = dag.sort();
    let status = tasks.filter(t => {
      return t.output.path;
    }).map(t => {
      return t.output.exists().then(exists => {
        return {
          path: t.output.path,
          compolete: exists
        };
      });
    });
    return Promise.all(status);
  }
}
