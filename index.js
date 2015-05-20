var cursor = require('cli-cursor');
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

    function template(error, index, ctx) {
        if (error) {
            return index + ' '+ error.message; 
        } 
        if (ctx.jobIndex + 1 === ctx.totalJobs) {
            return index + ' done';
        }
        return index + ' '+ (ctx.jobIndex+1) + '/' + ctx.totalJobs + ' ' + ctx.name + ' ' + ctx.job.title;
    }
    function makeHandlers(p, id) {
        p.on('error', function(error) {
            var ctx = p.options.context;
            var line = template(error, id, ctx);
            update(id, line);
            pipeEnds();
        });
        p.on('data', function(data) {

            var ctx = p.options.context;
            ctx.jobIndex = data.jobIndex;
            ctx.job = data.job;
            ctx.jobResult = data.result;
            ctx.totalJobs = data.totalJobs;

            var line = template(null, id, ctx);
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
    .add(pipeline(makeJobs(20, true)), 'third')
    .add(makeJobs(10, true), {context: {name: 'fourth', color:'red'}})
    .on('end', function() {console.log('ALL DONE');})
    .pipe(process.stdout);
