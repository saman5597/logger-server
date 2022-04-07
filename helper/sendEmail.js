const { json } = require('body-parser');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv')
dotenv.config();

var transport = nodemailer.createTransport({
    host: "smtp.gmail.com", //"smtp.mailtrap.io",
    port: process.env.Gmail_Mail_Port, //2525,
    auth: {
        user: process.env.Gmail_Mail_USER,
        pass: process.env.Gmail_Mail_PASS
    }
});

const sendEmail = ({otp, msg = 'Hello, ', to='xyz@gmail.com',from = 'support@logcat.com',next})=>{
    try {
        if(!from || !to || !msg || !otp) throw 'Provide the field for email...';
        console.log(otp)

        const mail = {
            from,
            to,
            subject:'Password Reset OTP: LogCat',
            text:`Hey ${msg}, OTP to reset the password is ${otp}`,
            template:'resetPassword'
        }

        transport.sendMail(mail, (error,info)=>{
            if(error) console.log(`Mail fail ${error}`);
            // console.log(`Mail send ${[...info]}`);
        })
        next();
    } catch (error) {
        return json({'errormessage':`sendMail ${error}`});
    }
}

const sendCrashEmail = ({msg = 'Crash Report, ', to='xyz@gmail.com',from = 'support@logcat.com',next})=>{
    try {
        if(!from || !to || !msg) throw 'Provide the field for email...';
console.log(`${msg} ${to} ${from}`)
        const mail = {
            from,
            to,
            subject:'Crash Notification: LogCat',
            text:`Error: ${msg}`,
            template:'Crash Report'
        }

        transport.sendMail(mail, (error,info)=>{
            if(error) console.log(`Mail fail ${error}`);
            console.log(`Mail send ${[...info]}`);
        })
        next();
    } catch (error) {
        return json({'errormessage':`sendMail ${error}`});
    }
}

module.exports = {sendEmail, sendCrashEmail}
