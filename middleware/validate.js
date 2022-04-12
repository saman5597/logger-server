const User = require('../model/users');
const {checkMD5} = require('../helper/helperFunctions.js')

const authDevice = async (req,res,next)=>{
    try {
        if(!req.headers['authorization']) throw {"message":"Provide device authorization"}
        const projectMD5 = req.headers['authorization'].split(' ')[1];
        const tokenKey = req.headers['authorization'].split(' ')[0];
        console.log(`${projectMD5} ${tokenKey}`)

        if(tokenKey !== 'AgVa_Logger')  throw {"message":"Invalid token"}

        if(!projectMD5){
            throw {"message":"Invalid Project code"};
        }
        
        // proceed after authentication
        const isVerified = checkMD5(`${projectMD5}`)
        if (!isVerified) throw {"message":"Your are passing invalid project token!"}

        next();

    } catch (error) {
        console.log(error)
        return res.status(400).json({
            status: 0,
            data: {
              err: {
                generatedTime: new Date(),
                errMsg: error.name,
                msg: error.message,
                type: 'AuthenticationError'
              }
            }
          });
    }
}




module.exports =  {
    authDevice
}