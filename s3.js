// ---  Load environment variables first ---
require('dotenv').config();
const fs = require('fs');
const S3 = require('aws-sdk/clients/s3');

// Map your .env variable names to what AWS expects
const region = process.env.AWS_BUCKET_REGION || process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_BUCKET_NAME || process.env.S3_BUCKET;

// Basic sanity checks (optional but helpful)
if (!region) throw new Error('❌ AWS region missing — set AWS_BUCKET_REGION in .env');
if (!bucketName) throw new Error('❌ S3 bucket name missing — set AWS_BUCKET_NAME in .env');
if (!accessKeyId || !secretAccessKey) {
  throw new Error('❌ AWS credentials missing — set AWS_ACCESS_KEY and AWS_SECRET_KEY in .env');
}

// ---  Configure the S3 client ---
const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey
});

// ---  Upload helpers ---
function uploadFile(file) {
  const fileStream = fs.createReadStream(file.path);
  const uploadParams = {
    Bucket: bucketName,
    Body: fileStream,
    Key: file.filename
  };
  return s3.upload(uploadParams).promise();
}

function uploadFilePfp(file) {
  const fileStream = fs.createReadStream(file.path);
  const uploadParams = {
    Bucket: bucketName,
    Body: fileStream,
    Key: file.filename
  };
  return s3.upload(uploadParams).promise();
}

// ---  Download helper ---
function getFileStream(fileKey) {
  const downloadParams = {
    Key: fileKey,
    Bucket: bucketName
  };
  return s3.getObject(downloadParams).createReadStream();
}

module.exports = { uploadFile, uploadFilePfp, getFileStream };


// require('dotenv').config()
// const S3 = require('aws-sdk/clients/s3')
// const fs = require('fs')


// const bucketName = process.env.AWS_BUCKET_NAME
// const region = process.env.AWS_BUCKET_REGION
// const accessKeyId = process.env.AWS_ACCESS_KEY
// const secretAccessKey = process.env.AWS_SECRET_KEY

// // const bucketNameChat = process.env.AWS_BUCKET_NAME_CHAT
// // const regionChat = process.env.AWS_BUCKET_REGION_CHAT
// // const accessKeyIdChat = process.env.AWS_ACCESS_KEY_CHAT
// // const secretAccessKeyChat = process.env.AWS_SECRET_KEY_CHAT

// const s3 = new S3 ({
//     region,
//     accessKeyId,
//     secretAccessKey
// })

// // const s3Chat = new S3 ({
// //     regionChat,
// //     accessKeyIdChat,
// //     secretAccessKeyChat
// // })

// //uploads a file to s3
// function uploadFile(file){ //Passing file object that came from multer that has the file path on the server
    
//     const fileStream = file.path

//     const uploadParams = {
//         Bucket: bucketName,
//         Body: fileStream,
//         Key: file.filename
//     }

//     return s3.upload(uploadParams).promise()
    

// }
// function uploadFilePfp(file){ //Passing file object that came from multer that has the file path on the server
    
//     const fileStream = fs.createReadStream(file.path)

//     const uploadParams = {
//         Bucket: bucketName,
//         Body: fileStream,
//         Key: file.filename
//     }

//     return s3.upload(uploadParams).promise()
    

// }


// // function uploadFile(file){ //Passing file object that came from multer that has the file path on the server
// //     const fileStream = fs.createReadStream(file.path)

// //     const uploadParamsChat = {
// //         Bucket: bucketNameChat,
// //         Body: fileStream,
// //         Key: file.filename
// //     }

// //     return s3Chat.upload(uploadParamsChat).promise()

// // }




// //downloads file to 

// function getFileStream(fileKey){
//     const downloadParams = {
//         Key: fileKey,
//         Bucket: bucketName
//     }

//     return s3.getObject(downloadParams).createReadStream()
// }

// module.exports = {uploadFile, uploadFilePfp, getFileStream};