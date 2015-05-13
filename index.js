var pipeline = require('progress-pipeline');
var charm = require('charm')();
charm.pipe(process.stdout);

function makeJob(name, duration, err, result) {
    var f = function(cb) {
        setTimeout(function() {cb(err, result);}, duration);
    };
    f.title = name;
    return f;
}

function makePipeline(pname, jobCount) {
    var jobs = [];
    for(var i=0; i<jobCount; ++i) {
        var duration = Math.floor(Math.random() * 4000);
        var name = String.fromCharCode(65+i);
        var result = name + ' done';
        jobs.push(makeJob(name, duration, null, result));
    }
    var p = pipeline(jobs);
    p.name = pname;
    return p;
}

var pipelines = [
    makePipeline('first', 10),
    makePipeline('second', 15),
    makePipeline('third', 20),
    makePipeline('fourth', 10)
];

function board(pipelines, options) {
    options = options || {};
    var currLine;

    function makeHandler(id) {
        return function(data) {
            if (data.result) return;
            var line = id + ' '+ (data.jobIndex+1) + '/' + data.totalJobs + ' ' + data.job.title;
            charm
                .column(0)
                .move(0, id - currLine)
                .write(line);
            currLine = id;
        };
    }

    for(var i=0, len = pipelines.length; i<len; i++) {
        console.log(pipelines[i].name);
        pipelines[i].on('data', makeHandler(i));
        currLine = i;
    }
} 

board(pipelines);
