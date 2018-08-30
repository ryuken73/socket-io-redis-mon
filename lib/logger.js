module.exports = mkLogger;

function mkLogger(opts){
    const tracer = require('tracer');
    const nodemailer = require('nodemailer');
    const fs = require('fs');

    const {smtpAddress} = opts.notification;
    const {logLevel} = opts;
    const {logFile} = opts;

    const mailer = nodemailer.createTransport(smtpAddress);
    const mailNotification = function(level, tracerData){	
        if(tracerData.title === level){
            const {sender} = opts.notification;
            const {receiver} = opts.notification;
            const {subject_header} = opts.notification;
            const subject = `${subject_header} : tracerData.message`;
            var body = tracerData.output;
            var mailOPtions = {
                    from : sender,
                    to : receiver,
                    subject : subject,
                    text : body
            };
            mailer.sendMail(mailOPtions,function(err,result){
                if(err){
                    return console.log(err);
                } 
                console.log('Mail Sent Successfully');
            });
        }
    };
 

    const logTracer = tracer.console(
        {
            format : "{{timestamp}} [{{title}}][{{method}}] {{message}} (in {{file}}:{{line}})",	
            dateformat: 'yyyy-mm-dd HH:MM:ss',
            level:logLevel,
            transport : [
                function(data){
                    fs.appendFile(logFile, data.output + '\n', function(err){
                        if(err) {
                            throw err;
                        }
                    });
                },
                function(data){
                    console.log(data.output);
                },
                function(data){
                    mailNotification('error', data);
                }
                
            ]
        }
    ); 
    return logTracer
}

