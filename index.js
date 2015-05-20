var cursor = require('cli-cursor');
var extend = require('extend');
var pipeline = require('progress-pipeline');
var Charm = require('charm');

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

function board(options) {
    var pipelines = [];
    var currLine;
    var pending = 0;
    options = options || {};
    var charm = Charm();
    cursor.hide();

    function update(id, line) {
        charm
            .column(0)
            .move(0, id - currLine)
            .write(line)
            .erase('end');
        currLine = id;
    }

    function pipeEnds() {
        if (--pending === 0) {
            charm
                .move(0, pipelines.length - currLine)
                .column(0)
                .destroy();
        }
    }

    function template(ctx) {
        var name = ctx.name || '#' + (ctx._index + 1);
        if (ctx._error) {
            return name + ': '+ ctx._job.title + ' failed with error: ' + ctx._error.message; 
        } 
        if (ctx._jobIndex + 1 === ctx._totalJobs) {
            return name + ': done';
        }
        return name + ': '+ (ctx._jobIndex+1) + '/' + ctx._totalJobs + ' ' + ctx._job.title || 'job #' + ctx._jobIndex;
    }

    function makeHandlers(p, id) {
        function contextFromEvent(ev) {
            return {
                _charm: charm,
                _job: ev.job,
                _jobIndex: ev.jobIndex,
                _totalJobs: ev.totalJobs
            };
        }
        p.on('error', function(error) {
            var ctx = {
                _index: id,
                _error: error
            };
            extend(ctx, contextFromEvent(error), p.options.context || {});
            var line = template(ctx);
            update(id, line);
            pipeEnds();
        });
        p.on('data', function(data) {
            var ctx = {
                _index: id,
                _jobResult: data.result,
            };
            extend(ctx, contextFromEvent(data), p.options.context || {});
            var line = template(ctx);
            update(id, line);

            if (typeof data.result !== 'undefined') {
                if (data.jobIndex + 1 === data.totalJobs) {
                    pipeEnds();
                }
            }
        });
    }

    charm.add = function(p, options) {
        if (p.length && typeof p[0] === 'function') {
            p = pipeline(p);
        }
        if (typeof options === 'string') {
            options = {
                context: {
                    name: options
                }
            };
        }
        p.options = options || {};
        var id = pipelines.push(p) - 1;
        console.log(p.name);
        makeHandlers(p, id);
        currLine = id+1;
        pending++;
        return charm;
    };

    return charm;
} 

board()
    .add(makeJobs(8), 'first')
    .add(makeJobs(5), {context:{name: 'second'}})
    .add(pipeline(makeJobs(20, true)))
    .add(makeJobs(10, true), {context: {name: 'fourth', color:'red'}})
    .on('end', function() {console.log('ALL DONE');})
    .pipe(process.stdout);
