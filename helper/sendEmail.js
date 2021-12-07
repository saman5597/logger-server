const { json } = require('body-parser');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv')
dotenv.config();

var transport = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: process.env.Mail_USER,
        pass: process.env.Mail_PASS
    }
});

const sendEmail = (otp, msg = 'Hello, Cactus', to='xyz@gmail.com',from = 'support@loggerserver.com',next)=>{
    try {
        if(!from || !to || !msg || !otp) throw 'Provide the field for email...';

        const mail = {
            from,
            to,
            subject:'Forget password Reset',
            text:`${msg} OTP to reset the password is ${otp}`,
            template:'resetPassword'
        }

        transport.sendMail(mail, (error,info)=>{
            if(error) console.log(`Mail fail ${error}`);
            console.log(`Mail send ${info}`);
        })
        next();
    } catch (error) {
        return json({'errormessage':`sendMail ${error}`});
    }
}

module.exports = {sendEmail}
