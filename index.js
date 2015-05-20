var cursor = require('cli-cursor');
var extend = require('extend');
var pipeline = require('progress-pipeline');
var Charm = require('charm');
var chalk = require('chalk');

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

    function update(id, p, ctx) {
        var t = p.options.template || options.template || template;
        var line = t(ctx);
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
        name = chalk[ctx.color || 'blue'](name);
        if (ctx._error) {
            return chalk.red('\u2717') + ' ' + name + ': '+ ctx._job.title + chalk.red(' failed with error: ' + ctx._error.message);
        } 
        if (ctx._jobIndex + 1 === ctx._totalJobs) {
            return chalk.green('\u2713') + ' ' + name;
        }
        return '  ' + name + ': '+ (ctx._jobIndex+1) + '/' + ctx._totalJobs + ' ' + ctx._job.title || 'job #' + ctx._jobIndex;
    }

    function makeHandlers(p, id) {
        function contextFromEvent(ev) {
            return {
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
            ctx = extend(p.options.context, ctx, contextFromEvent(error));
            update(id, p, ctx);
            pipeEnds();
        });
        p.on('data', function(data) {
            var ctx = {
                _index: id,
                _jobResult: data.result,
            };
            ctx = extend(p.options.context, ctx, contextFromEvent(data));
            update(id, p, ctx);

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
        p.options.context = p.options.context || {};
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
    .add(makeJobs(8), {
        template: function(ctx) {
            if (ctx._jobIndex === ctx._totalJobs-1) return '  2nd: done';
            return '-\\|/'[ctx._jobIndex%4] + ' 2nd';
        }
    })
    .add(
        pipeline(makeJobs(20, true)).on('error', function() {
            process.stdout.write('\u0007');
        })
    )
    .add(makeJobs(10, true), {context: {name: 'fourth', color:'yellow'}})
    .on('end', function() {console.log('ALL DONE');})
    .pipe(process.stdout);
