var express = require('express');
var awsConfig = require('aws-config');
var AWS = require('aws-sdk');
var request = require('request');
var bodyParser = require("body-parser");
var fs = require('fs');
var util = require('util');
var pdf = require('html-pdf');
const uuidv4 = require('uuid/v4');

var app = express();

// server static files (cache)
//app.use(express.static('cache'))

app.use('/cache', express.static(__dirname + '/cache'));

// test
app.get('/', function (req, res) {
    res.send('AWS S3 Test app up and running...');
 })

 // getImageFromCache
 app.get('/getImageFromCache', function(req, res, next) {

    var filename = req.query.img
    res.sendFile(__dirname + "/cache/" + filename);
});

app.post("/createPDFHtmlPdf", (req, res, next) => {
    util.log('pdf test request started ...');

	var x = '<h1>test</h1>' +
	'<h3>Direct from s3 (will fail as private)</h3>' +
	'<img src="https://s3-ap-southeast-2.amazonaws.com/smc-bucket1/image1.gif" /><br />' +
	'<img src="https://s3-ap-southeast-2.amazonaws.com/smc-bucket1/image2.jpg" /><br />' +
	'<img src="https://s3-ap-southeast-2.amazonaws.com/smc-bucket1/image3.jpg" /><br />' +
	'<h3>From nodejs cache (downloaed from s3)</h3>' +
	'<img src="http://localhost:3001/getImageFromCache?img=image1.gif" /><br />' +
	'<img src="http://localhost:3001/getImageFromCache?img=image2.jpg" /><br />' +
	'<img src="http://localhost:3001/getImageFromCache?img=image3.jpg" /><br /> ';  

    var html = x;
    var finalOptions = "";

    writeToPdf(html, finalOptions, function(err, stream) {
        if (err) return res.status(500).send(err);
        stream.pipe(res);
        util.log('\x1b[32m%s\x1b[0m', 'pdf test generated OK!');  

        // clean up files
        fs.unlink(__dirname + "/cache/image1.gif", function (err) {
            if (err) throw err;
            // if no error, file has been deleted successfully
            console.log('File deleted!');
        }); 

        fs.unlink(__dirname + "/cache/image2.jpg", function (err) {
            if (err) throw err;
            // if no error, file has been deleted successfully
            console.log('File deleted!');
        });         

        fs.unlink(__dirname + "/cache/image3.jpg", function (err) {
            if (err) throw err;
            // if no error, file has been deleted successfully
            console.log('File deleted!');
        });          
    });    

});

app.post("/createPDFHtmlPdfNew", (req, res, next) => {
    util.log('pdf test request started ...\n');

    // generate uuid
    var uuid = uuidv4();

    uuid = uuid + ".";

    // Test data
    // ---------
    var array = [];
    
    array.push("image0.jpg");
    array.push("image1.gif");
    array.push("image2.jpg");
    array.push("image3.jpg");
    array.push("image4.jpg");
    array.push("image5.jpg");
    array.push("image6.jpg");
    array.push("image7.png");
    array.push("image8.png");
    array.push("image9.jpg");
    array.push("image10.jpg");
    array.push("image11.jpg");
    array.push("image12.jpg");
    array.push("image13.jpg");

    // debug
    console.log('Files to be donwloaded from s3');
    for(var i = 0; i < array.length; i++) {
        console.log(array[i]);
    }


    // download files from s3
    // ----------------------
    console.log();
    for(var i = 0; i < array.length; i++) {
        var filename = array[i];

        var s3 = new AWS.S3();

        var options = {
            Bucket: 'smc-bucket1',
            Key: filename,
        };

        console.log('Trying to download - ', filename);

        //add uuid to filename
        var filenameArr = filename.split(".");
        filename = filenameArr[0] + "-" + uuid + filenameArr[1];

        //console.log(filenameArr);
        console.log(filename);

        // var file = fs.createWriteStream("cache/" + filename);

        // file.on('close', function(){
        //     console.log('File downloaded!');  
        // });

        // s3.getObject(options).createReadStream().on('error', function(err){
        //     console.log(err);
        // }).pipe(file);    

        var file = fs.createWriteStream("cache/" + filename);

        s3.getObject(options)
          .createReadStream()
          .pipe(file)
          .on('finish', function() {
            this.emit('downloadComplete');
            console.log('download competed.')
          });


    }

    console.log("All files downloaded!");

    // Generate PDF
    // -----------
    var content = "<h2>s3 private file cache test</h2><hr />";

    for(var i = 0; i < array.length; i++) {

        var filenameArr = array[i].split(".");
        var filename = filenameArr[0] + "-" + uuid + filenameArr[1];

        content += "<div>" + array[i] + "</div>";
        content += "<img style='width: 200px;' src='http://localhost:3001/getImageFromCache?img=" + filename + "' /><br /><br />"; // using API
        //content += "<img style='width: 200px;' src='http://localhost:3001/cache/" + filename + "' /><br /><br />"; // using static location
    }

    var html = content;
    var finalOptions = "";

    writeToPdf(html, finalOptions, function(err, stream) {
        if (err) return res.status(500).send(err);
        stream.pipe(res);
        console.log();
        util.log('\x1b[32m%s\x1b[0m', 'PDF generated OK!\n');  

        // clean up filess
        for(var i = 0; i < array.length; i++) {

            var filenameArr = array[i].split(".");
            var filename = filenameArr[0] + "-" + uuid + filenameArr[1];    

            fs.unlink(__dirname + "/cache/" + filename, function (err) {
                if (err) throw err;
                // if no error, file has been deleted successfully
                console.log('File deleted!');
            }); 
        }        
    });    

});

// code from project
function writeToPdf(html, options, callback) {
	//logger.debug('########## html = ' + html);
	if (html.indexOf('<script') == 1 || html.indexOf('<SCRIPT') == 1) {
		//logger.debug('error - html containig malicious script tag');
		//return res.status(500).send('error - html containig malicious script tag');
		return callback('html containing malicious script tag');
	}

    pdf.create(html, options).toStream(callback);
}

// init
var server = app.listen(3001, function () {
    var host = server.address().address
    var port = server.address().port
    
    console.log("\u001b[2J\u001b[0;0H");
    console.log("AWS S3 Test app listening at http://%s:%s", host, port);
    console.log("-----------------------------------------------");
 })


