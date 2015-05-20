var cursor = require('cli-cursor');
var extend = require('extend');
var pipeline = require('progress-pipeline');
var Charm = require('charm');
var chalk = require('chalk');

function template(ctx) {
    var name = ctx.name || '#' + (ctx._index + 1);
    name = chalk[ctx.color || 'blue'](name);
    if (ctx._error) {
        return chalk.red('\u2717') +
            ' ' + name + ': '+ ctx._job.title +
            chalk.red(' failed with error: ' +
            ctx._error.message);
    } 
    if ( // the last job has finished
        ctx._jobFinished &&
        ctx._jobIndex === ctx._totalJobs - 1
    ) {
        return chalk.green('\u2713') + ' ' + name;
    }
    return '  ' + name + ': ' +
        (ctx._jobIndex+1) + '/' + ctx._totalJobs + ' ' +
        ctx._job.title || 'job #' + ctx._jobIndex;
}

module.exports = function board(options) {
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

    function makeHandlers(p, id) {
        function contextFromEvent(ev) {
            return {
                _index: id,
                _job: ev.job,
                _jobFinished: ev.jobFinished,
                _jobIndex: ev.jobIndex,
                _totalJobs: ev.totalJobs
            };
        }
        p.on('error', function(error) {
            var ctx = extend(p.options.context, contextFromEvent(error));
            ctx._jobResult = undefined;
            ctx._error = error;
            ctx._jobFinished = false;
            update(id, p, ctx);
            pipeEnds();
        });
        p.on('data', function(data) {
            var ctx = extend(p.options.context, contextFromEvent(data));
            ctx._jobResult = data.result;
            ctx._error = undefined;
            update(id, p, ctx);

            if (data.jobFinished) {
                if (data.jobIndex + 1 === data.totalJobs) {
                    pipeEnds();
                }
            }
        });
    }

    charm.on('end', function() {
        cursor.show();
    });

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
};

