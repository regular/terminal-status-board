terminal-status-board
====
display the progress of multiple concurrent job sequences in your terminal, kind of like the departure boards at airport terminals.

Installation
---

    npm install terminal-status-board

Basic Usage 
---
``` javascript
var board = require('terminal-status-board');

board()
    .add([asyncFunc1, asyncFunc2])
    .add([asyncFunc3, asyncFunc4])
    .on('end', function() {console.log('ALL DONE');})
    .pipe(process.stdout);
```
`asyncFunc1` and `asyncFunc2` run in sequence, so do `asyncFunc3` and `asyncFunc4`. These two sequences however, run in parallel. (think of airplanes changing their state from 'boarding' to 'borading complete' to 'departure').

Advanced Usage
---

``` javascript
var board = require('terminal-status-board');
var pipeline = require('progress-pipeline');

function makeJob(name, duration, err, result) {
    var f = function(cb) {
        setTimeout(function() {cb(Math.random()>0.8?err:null, result);}, duration);
    };
    f.title = name;
    return f;
}

function makeJobs(jobCount, fail) {
    var jobs = [];
    for(var i=0; i<jobCount; ++i) {
        var duration = Math.floor(Math.random() * 4000);
        var name = String.fromCharCode(65+i);
        var result = name + ' done';
        jobs.push(makeJob(name, duration, fail?new Error('this is bad!'):null, result));
    }
    return jobs;
}

board()
    .add(makeJobs(8), 'first')
    .add(makeJobs(8), {
        template: function(ctx) {
            if (ctx._jobIndex === ctx._totalJobs-1) return '  2nd: done';
            return '-\\|/'[ctx._jobIndex % 4] + ' 2nd';
        }
    })
    .add(
        pipeline(makeJobs(20, true)).on('error', function() {
            process.stdout.write('\u0007'); // terminal BELL
        })
    )
    .add(makeJobs(10, true), {context: {name: 'fourth', color:'yellow'}})
    .on('end', function() {console.log('ALL DONE');})
    .pipe(process.stdout);
```

This is the output of the above code:

![demo output](http://regular.github.io/terminal-status-board/terminal-status-board.gif)

API
---

### board([options])

The retunred object is a `Stream` that emits ANSI escape sequences to update the screen.
Pipe it to `stdout` to make it visible in the terminal.
The stream instance originate from [substack/node-charm](http://github.com/substack/node-charm).

Options are
  - `template`: a custom template function that renders a line of the board
   
    `function(ctx) -> String`
    
    Where `ctx` has these properties:
    
    - `_index`: zero-based index of the line to render
    - `_totalJobs`: number of jobs in the sequence
    - `_jobIndex`: zero-based index of current job
    - `_job`: the current job
    - `_jobResult`: result of the current job (when job has finished)
    - `_error`: error object returned by current job (when job has failed)
    - whatever additional properties you passed as `context` to `add()` (see below)
  
  if `template` is not specified, a default template is used.
  
### add( jobs[] or pipeline, [options or string] )
    
Adds a line to the board, displaying the current state of a sequence of async jobs.
Jobs can either be defined as an array of async functions, or as an instance of [regular/progress-pipeline](http://github.com/regular/progress-pipeline).

Options are:

- `template`: a custom template function for this sequence (see above)
- `context`: additional properties that will be available to the template function.
  the default template cares about these additional properties:
  - name: the name of the sequence (think "flight number")
  - color: Color of this line's name. One of `red`, `green`, `blue`, `yellow` ... (see [substack/node-charm](github.com/substack/node-charm) for details.
  
If, as the second argument, a String is passed instead of an Object, it is treated as a shortcut for
`{options: context: name: string}}`.
