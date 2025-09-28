const nodemailer = require("nodemailer");

const user = process.env.USER_EMAIL;
const password  = process.env.PASSWORD_EMAIL;

const transport = nodemailer.createTransport({
    host: "mail.personal-assistant.biz.id",
    port: 465,
    secure: true,
    auth:{  
        user: user,
        pass: password
    },
});

module.exports.sendConfirmationEmail = (name, email, activationToken) => {
    console.log('check');
    transport.sendMail({
        from: user,
        to: email,
        subject: "Konfirmasi Email Orbit POS",
        html: `<h1>Email Konfirmasi</h1>
            <h2>Hai ${name}</h2>
            <p>Terima kasih telah mendaftar di Orbit POS. Untuk mengaktifkan akun silahkan klik link dibawah ini</p>
            <a href=https://orbit-ui-jade.vercel.app/notif?type=activation&token=${activationToken}> Klik Disini</a>`
            // for development 
            // <a href=http://localhost:5173/notif?type=activation&token=${activationToken}> Klik Disini</a>
            // for production
            //<a href=https://orbit-ui-jade.vercel.app/notif?type=activation&token=${activationToken}> Klik Disini</a>
    }).catch(err => console.log(err));
}

module.exports.sendConfirmationResetPassword = (email, resetToken) => {
    console.log('check');
    transport.sendMail({
        from: user,
        to: email,
        subject: "Konfirmasi Email Reset Password Orbit POS",
        html: `<h1>Email Konfirmasi</h1>
            <h2>Hai Kamu</h2>
            <p>Untuk merubah kata sandi klik link dibawah ini. Jika kamu tidak merasa merubah kata sandi segera hubungi admin.</p>
            <a href=https://orbit-ui-jade.vercel.app/reset-password?type=reset&token=${resetToken}> Klik Disini</a>`
            // for development 
            // <a href=http://localhost:5173/reset-password?type=reset&token=${resetToken}> Klik Disini</a>
            // for production
            //<a href=https://orbit-ui-jade.vercel.app/reset-password?type=reset&token=${resetToken}> Klik Disini</a>
    }).catch(err => console.log(err));
}