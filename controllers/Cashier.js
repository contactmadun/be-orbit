const { v4: uuidv4 } = require("uuid");
const {
  CashierSession,
  CashierSessionBalance,
  Sale,
  Fund,
  sequelize,
  Reports,
} = require("../models");

exports.openCashierSession = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { tenantId, outletId, id: userId } = req.user;

    // 🔒 CEK SESSION MASIH ADA
    const existingSession = await CashierSession.findOne({
      where: {
        tenantId,
        outletId,
        status: "open",
      },
      transaction: t,
    });

    if (existingSession) {
      await t.rollback();
      return res.status(400).json({
        message: "Masih ada kasir yang terbuka di outlet ini",
      });
    }

    // 🔥 AMBIL SEMUA FUND
    const funds = await Fund.findAll({
      where: { tenantId, outletId },
      transaction: t,
    });

    if (!funds.length) {
      await t.rollback();
      return res.status(400).json({
        message: "Belum ada akun dana (fund)",
      });
    }

    // 🧾 BUAT SESSION
    const session = await CashierSession.create(
      {
        tenantId,
        outletId,
        userId,
        openedAt: new Date(),
        status: "open",
      },
      { transaction: t },
    );

    // 💰 INSERT BALANCES (SNAPSHOT)
    const balances = funds.map((f) => ({
      sessionId: session.id,
      accountId: f.id,
      openingBalance: f.balance,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await CashierSessionBalance.bulkCreate(balances, {
      transaction: t,
    });

    await t.commit();

    return res.status(201).json({
      message: "Kasir berhasil dibuka",
      data: session,
    });
  } catch (error) {
    await t.rollback();
    console.error(error);
    return res.status(500).json({
      message: "Gagal membuka kasir",
    });
  }
};

exports.getActiveCashierSession = async (req, res) => {
  try {
    const { tenantId, outletId } = req.user;

    const session = await CashierSession.findOne({
      where: {
        tenantId,
        outletId,
        status: "open",
      },
      include: [
        {
          model: CashierSessionBalance,
          as: "balances",
          include: [
            {
              model: Fund,
              as: "account",
              attributes: ["id", "nameAccount", "type"],
            },
          ],
        },
      ],
      order: [["openedAt", "DESC"]],
    });

    return res.status(200).json({
      message: "Active session",
      data: session || null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Gagal mengambil session kasir",
    });
  }
};

exports.getCashierBalances = async (req, res) => {
  try {
    const { tenantId, outletId } = req.user;

    // 🔍 session aktif
    const session = await CashierSession.findOne({
      where: {
        tenantId,
        outletId,
        status: "open",
      },
      include: [
        {
          model: CashierSessionBalance,
          as: "balances",
          include: [
            {
              model: Fund,
              as: "account",
              attributes: ["id", "nameBank", "type", "balance"],
            },
          ],
        },
      ],
    });

    if (!session) {
      return res.status(404).json({
        message: "Tidak ada kasir aktif",
      });
    }

    // 🔥 systemBalance = FUND BALANCE (REALTIME)
    const balances = session.balances.map((b) => {
      const systemBalance = Number(b.account.balance || 0);

      return {
        id: b.id,
        accountId: b.accountId,
        openingBalance: Number(b.openingBalance),
        systemBalance,
        account: b.account,
      };
    });

    return res.status(200).json({
      message: "Cashier balances",
      data: balances,
    });
  } catch (error) {
    console.error("getCashierBalances error:", error);
    return res.status(500).json({
      message: "Gagal mengambil balance kasir",
    });
  }
};

exports.closeCashierSession = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { tenantId, outletId } = req.user;
    const { balances, closingNote } = req.body;

    // 🔍 ambil session aktif
    const session = await CashierSession.findOne({
      where: {
        tenantId,
        outletId,
        status: "open",
      },
      include: [
        {
          model: CashierSessionBalance,
          as: "balances",
        },
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!session) {
      await t.rollback();
      return res.status(404).json({
        message: "Tidak ada kasir aktif",
      });
    }

    // =============================
    // 🔥 UPDATE BALANCES
    // =============================
    let totalClosing = 0;
    let totalDifference = 0;

    for (const input of balances) {
      const balance = session.balances.find((b) => b.id === input.id);

      if (!balance) continue;

      const systemBalance = Number(input.systemBalance || 0);
      const closingBalance = Number(input.closingBalance || 0);
      const diff = closingBalance - systemBalance;

      await balance.update(
        {
          systemBalance,
          closingBalance,
          difference: diff,
        },
        { transaction: t },
      );

      totalClosing += closingBalance;
      totalDifference += diff;
    }

    // =============================
    // 🔥 AMBIL DATA SALES
    // =============================
    const sales = await Sale.findAll({
      where: {
        tenantId,
        outletId,
        sessionId: session.id,
        status: "paid",
      },
      transaction: t,
    });

    let totalOmzet = 0;
    let totalProfit = 0;

    sales.forEach((s) => {
      totalOmzet += Number(s.totalAmount);
      totalProfit += Number(s.totalProfit);
    });

    const totalTrx = sales.length;

    // =============================
    // 🔥 UPDATE SESSION
    // =============================
    await session.update(
      {
        status: "closed",
        closedAt: new Date(),
        closingNote,
      },
      { transaction: t },
    );

    // =============================
    // 🔥 INSERT REPORT (SNAPSHOT)
    // =============================
    await Reports.create(
      {
        tenantId,
        outletId,
        sessionId: session.id,
        openedAt: session.openedAt,
        closedAt: new Date(),

        closingBalance: totalClosing,
        difference: totalDifference,

        totalProfit,
        totalTrx,
        totalOmzet,
      },
      { transaction: t },
    );

    await t.commit();

    return res.status(200).json({
      message: "Kasir berhasil ditutup",
    });
  } catch (error) {
    await t.rollback();
    console.error(error);

    return res.status(500).json({
      message: "Gagal menutup kasir",
    });
  }
};
