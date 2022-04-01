require('dotenv').config()
const S3 = require('aws-sdk/clients/s3')
const fs = require('fs')


const bucketName = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_KEY

// const bucketNameChat = process.env.AWS_BUCKET_NAME_CHAT
// const regionChat = process.env.AWS_BUCKET_REGION_CHAT
// const accessKeyIdChat = process.env.AWS_ACCESS_KEY_CHAT
// const secretAccessKeyChat = process.env.AWS_SECRET_KEY_CHAT

const s3 = new S3 ({
    region,
    accessKeyId,
    secretAccessKey
})

// const s3Chat = new S3 ({
//     regionChat,
//     accessKeyIdChat,
//     secretAccessKeyChat
// })

//uploads a file to s3
function uploadFile(file){ //Passing file object that came from multer that has the file path on the server
    const fileStream = file.path

    const uploadParams = {
        Bucket: bucketName,
        Body: fileStream,
        Key: file.filename
    }

    return s3.upload(uploadParams).promise()

}

// function uploadFile(file){ //Passing file object that came from multer that has the file path on the server
//     const fileStream = fs.createReadStream(file.path)

//     const uploadParamsChat = {
//         Bucket: bucketNameChat,
//         Body: fileStream,
//         Key: file.filename
//     }

//     return s3Chat.upload(uploadParamsChat).promise()

// }




//downloads file to 

function getFileStream(fileKey){
    const downloadParams = {
        Key: fileKey,
        Bucket: bucketName
    }

    return s3.getObject(downloadParams).createReadStream()
}

module.exports = {uploadFile, getFileStream};