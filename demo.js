var board = require('.');
var pipeline = require('progress-pipeline');

function makeJob(name, duration, err) {
    var f = function(cb) {
        setTimeout(function() {cb(Math.random()>0.8?err:null);}, duration);
    };
    f.title = name;
    return f;
}

function makeJobs(jobCount, fail) {
    var jobs = [];
    for(var i=0; i<jobCount; ++i) {
        var duration = Math.floor(Math.random() * 4000);
        var name = String.fromCharCode(65+i);
        jobs.push(makeJob(name, duration, fail?new Error('this is bad!'):null));
    }
    return jobs;
}

board()
    .add(makeJobs(8), 'first')
    .add(makeJobs(8), {
        template: function(ctx) {
            if (
                ctx._jobFinished &&
                ctx._jobIndex === ctx._totalJobs-1
            ) {
                return '  2nd: done';
            }
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
