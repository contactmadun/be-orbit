const Validator = require('fastest-validator');
const { generateToken } = require('../utils/jwt');
const v = new Validator();
const nodemailer = require('../config/nodemailer.config');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User, Store, Token, sequelize } = require('../models');
const { console } = require('inspector');

exports.registerUser = async (req, res) => {
    const t = await sequelize.transaction();

    const schema = {
        name: 'string',
        password: 'string',
        email: 'string|unique' 
    }
    const validate = v.validate(req.body, schema);
    if(validate.length){
        return res.status(400).json(validate);
    }
    let getUser = await User.findOne({
        where: {
            email: req.body.email
        }
    });

    if(getUser != null){
        res.status(400).json({message: 'Email sudah terdaftar!'});
    }else{
        const salt = await bcrypt.genSalt();
        const hashPassword = await bcrypt.hash(req.body.password, salt);

        const activationToken = crypto.randomBytes(32).toString('hex');

        try {
            const newUser = await User.create({ 
                storeId: null,
                name: req.body.name,
                phoneNumber: req.body.number,
                email: req.body.email,
                password: hashPassword,
                role: 'super_admin',
                activationToken: activationToken
            }, { transaction: t });

            const trialDays = 20;
            const expiredAt = new Date(Date.now() + (trialDays * 24 * 60 * 60 * 1000));
            const newStore = await Store.create({
                ownerId: newUser.id,
                nameOutlet: req.body.outlet,
                trialExpiredAt: expiredAt,
                tokenExpiredAt: expiredAt,
                status: 'active'
            }, { transaction: t });

            await newUser.update({ storeId: newStore.id}, { transaction: t});

            await Token.create({
                storeId: newStore.id,
                daysAdded: trialDays,
                source: 'manual',
                note: 'Free trial token',
                createdBy: newUser.id
            }, { transaction : t });

            await t.commit();

            nodemailer.sendConfirmationEmail(
                req.body.name,
                req.body.email,
                activationToken
            )
            res.json({message: 'Berhasil daftar, cek email untuk aktivasi'});
        } catch (error) {
            await t.rollback();
            console.log(error);
        }
    }
}

exports.activateAccount = async (req, res) => {
    try {
        const { token } = req.params;

    const user = await User.findOne({ where: { activationToken: token } });

    if (!user) {
      return res.status(400).json({ message: "Token tidak valid atau sudah digunakan" });
    }

    user.status = 'active';
    user.activationToken = null; // supaya hanya sekali pakai
    await user.save();

    return res.json({ message: "Aktivasi " });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        //cek user
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

        // cek password
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Username atau Password salah' });

        // cek status aktif
        if (user.status !== 'active') {
        return res.status(403).json({ message: 'Akun belum aktif. Silakan aktivasi melalui email.' });
    }

        // generate token
        const token = generateToken(user);

        return res.json({
        message: 'Login berhasil',
        token,
        user: { id: user.id, email: user.email, name: user.name }
        });
    } catch (error) {
        return res.status(500).json({ message: err.message });
    }
}

exports.requestResetPassword = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if(!user) return res.status(404).json({ message : 'Email tidak ditemukan' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await User.update({
        resetToken: token,
        expiresResetToken: expires},
        {where: {
            email: email
        }});
    nodemailer.sendConfirmationResetPassword(
        email,
        token
    );
    res.json({message: "Link ubah kata sandi, dikirim ke email"})
}

exports.changePassword = async (req, res) => {
    try {
    const { token, password } = req.body;

    const user = await User.findOne({ where: { resetToken: token } });

    if (!user) return res.status(400).json({ message: 'Token tidak valid' });

    if (user.expiresResetToken < new Date()) {
      return res.status(400).json({ message: 'Token sudah kadaluarsa' });
    }

    // update password
    const hash = await bcrypt.hash(password, 10);
    user.password = hash;

    // hapus token biar sekali pakai
    user.resetToken = null;
    user.expiresResetToken = null;

    await user.save();

    return res.json({ message: 'Reset Password ' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}
