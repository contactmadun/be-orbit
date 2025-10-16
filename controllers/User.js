const Validator = require('fastest-validator');
const { generateToken } = require('../utils/jwt');
const v = new Validator();
const nodemailer = require('../config/nodemailer.config');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User, Store, Token, sequelize, Fund } = require('../models');
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

            await Fund.create({
                storeId: newStore.id,
                name: 'Laci',
                firstBalance: 0,
                runningBalance: 0,
                isDefault: true   // kolom baru untuk penanda laci
            }, { transaction: t });

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
        const user = await User.findOne({ 
            where: { email }, 
            include: [
                {
                    model: Store,
                    as: 'store',
                    attributes: ['id', 'nameOutlet']
                }
            ] 
        });
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
        user: { id: user.id, email: user.email, name: user.name, storeId: user.storeId, store: user.store ? user.store : null }
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
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

exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findOne({
      where: { id: userId },
      attributes: ['id', 'name', 'email', 'phoneNumber', 'imageProfil', 'status', 'storeId'],
      include: [
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'nameOutlet', 'trialExpiredAt', 'tokenExpiredAt', 'status']
        },
        {
          model: Token,
          as: 'tokens',
          attributes: ['id', 'daysAdded', 'source', 'note', 'createdAt']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // 🧮 Hitung sisa token berdasarkan tokenExpiredAt store
    let tokenRemaining = 0;
    if (user.store?.tokenExpiredAt) {
      const now = new Date();
      const expired = new Date(user.store.tokenExpiredAt);
      const diff = expired - now;
      tokenRemaining = diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
    }

    // 🔢 Total hari token dari semua record token
    const totalTokenDays = user.tokens?.reduce((acc, t) => acc + (t.daysAdded || 0), 0) || 0;

    // 🧍‍♂️ fallback avatar inisial
    let avatar;
    if (user.imageProfil) {
      avatar = user.imageProfil;
    } else {
      const parts = user.name.trim().split(' ');
      let initials = '';

      if (parts.length === 1) {
        initials = parts[0].substring(0, 2).toUpperCase();
      } else {
        initials = (parts[0][0] + parts[1][0]).toUpperCase();
      }

      avatar = initials;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      status: user.status,
      avatar,
      store: user.store,
      totalTokenDays,
      tokenRemaining,
    });
  } catch (error) {
    console.error('Error getUserProfile:', error);
    res.status(500).json({
      message: 'Terjadi kesalahan server',
      error: error.message,
    });
  }
};


// exports.getUserProfile = async (req, res) => {
//   try {
//     console.log('Decoded user from token:', req.user); // 👈 cek isi token
//     const user = await User.findByPk(req.user.id);

//     if (!user) {
//       console.log('User not found for ID:', req.user.id);
//       return res.status(404).json({ message: 'User tidak ditemukan' });
//     }

//     res.json({ user });
//   } catch (error) {
//     console.error('Error getUserProfile:', error);
//     res.status(500).json({ message: 'Terjadi kesalahan server', error: error.message });
//   }
// };
