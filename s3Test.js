const AWS = require('aws-sdk');
require('dotenv').config()

// Configure AWS with your access and secret key.
const bucketName = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_KEY

AWS.config.update({
  accessKeyId: "AKIARMLHUXG4WQR6SDFK",
  secretAccessKey: "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",
  region: "us-east-1",
});

// Create an S3 client
const s3 = new AWS.S3();

var params = {
  Bucket: "socialsimulation", 
  Key: 'test file.txt'
};

s3.getObject(params, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else console.log(data);               // successful response
});
