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

function makePipeline(pname, jobCount, fail) {
    var jobs = [];
    for(var i=0; i<jobCount; ++i) {
        var duration = Math.floor(Math.random() * 4000);
        var name = String.fromCharCode(65+i);
        var result = name + ' done';
        jobs.push(makeJob(name, duration, fail?new Error('this is bad!'):null, result));
    }
    var p = pipeline(jobs);
    p.name = pname;
    return p;
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

    function makeHandlers(p, id) {
        p.on('error', function(error) {
            var line = id + ' '+ error.message; 
            update(id, line);
            pipeEnds();
        });
        p.on('data', function(data) {
            var line = id + ' '+ (data.jobIndex+1) + '/' + data.totalJobs + ' ' + p.name + ' ' + data.job.title;
            var pipeEnded = false;
            if (data.result) {
                if (data.jobIndex + 1 === data.totalJobs) {
                    line = id + ' done';
                    pipeEnded = true; 
                }
            }
            update(id, line);
            if (pipeEnded) pipeEnds();
        });
    }

    charm.addPipeline = function(p) {
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
    .addPipeline(makePipeline('first', 8))
    .addPipeline(makePipeline('second', 5))
    .addPipeline(makePipeline('third', 20, true))
    .addPipeline(makePipeline('fourth', 10, true))
    .on('end', function() {console.log('ALL DONE');})
    .pipe(process.stdout);
