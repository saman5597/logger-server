// const { json } = require('body-parser');
const fs = require('fs');

const uploadFile = (req,folder)=>{
    const file = req.files.image;
    const fileName = Date.now()+'-'+file.name;
    file.mv(`${__dirname}/../public/${folder}/`+fileName,(err)=>{
        if(err){
            return false;
        }
    })
    return fileName;
    
}

const deleteFile = (folder,filename)=>{
    fs.unlink(`${__dirname}/../public/${folder}/${filename}`,(err)=>{
        if (err) {
            return false;
        }
    });
    return "";
}

const updateFile = (req,folder,filename)=>{
    const file = req.files.image;
    if (file !== "ddUserDefaultIcon.png") {
        fs.unlink(`${__dirname}/../public/${folder}/${filename}`,(err)=>{
            if (err) {
                return false;
            }
        });
    }
    const fileName = Date.now()+'-'+file.name;
    file.mv(`${__dirname}/../public/${folder}/`+fileName,(err)=>{
        if(err){
            return false;
        }
    })
    return fileName;
}

module.exports = {
    uploadFile,
    deleteFile,
    updateFile
}