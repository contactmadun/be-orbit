// controllers/CashierController.js
const {
  CashierSession,
  AccountMutation,
  Fund,
  FinanceRecords,
  Reports,
} = require("../models");
const { Op, fn, col, literal } = require("sequelize");

exports.getMutation = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const outletId = req.user.outletId;

    // =========================
    // 🔥 QUERY PARAMS
    // =========================
    let {
      page = 1,
      limit = 30,
      search = "",
      type,
      source,
      accountId,
      startDate,
      endDate,
    } = req.query;

    page = Number(page);
    limit = Number(limit);
    const offset = (page - 1) * limit;

    // =========================
    // 🔍 WHERE CONDITION
    // =========================
    const where = {
      tenantId,
      outletId,
    };

    // 🔎 SEARCH
    if (search) {
      where[Op.or] = [
        { referenceType: { [Op.like]: `%${search}%` } },
        { note: { [Op.like]: `%${search}%` } },
      ];
    }

    // 📊 FILTER TYPE
    if (type) {
      where.type = type;
    }

    // 📊 FILTER SOURCE
    if (source) {
      where.source = source;
    }

    // 📊 FILTER ACCOUNT
    if (accountId) {
      where.accountId = accountId;
    }

    // 📅 DATE FILTER
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    // =========================
    // 🔥 QUERY
    // =========================
    const { count, rows } = await AccountMutation.findAndCountAll({
      where,
      limit,
      offset,

      order: [["createdAt", "DESC"]],

      attributes: [
        "id",
        "type",
        "amount",
        "balanceBefore",
        "balanceAfter",
        "referenceType",
        "referenceId",
        "source",
        "note",
        "createdAt",
      ],

      include: [
        {
          model: Fund,
          as: "account",
          attributes: ["id", "nameBank", "type"],
        },
        {
          model: CashierSession,
          as: "session",
          attributes: [
            "id",
            "openedAt",
            "closedAt",
            "status", // ✅ pakai ini, bukan shift
          ],
          required: false,
        },
      ],
    });

    // =========================
    // 📦 RESPONSE
    // =========================
    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data mutasi akun",
    });
  }
};

exports.getCashflow = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const outletId = req.query.outletId || req.user.outletId;

    // =========================
    // 📅 RANGE BULAN INI
    // =========================
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const whereBase = {
      tenantId,
      ...(outletId !== "all" && { outletId }),
      createdAt: {
        [Op.between]: [startOfMonth, endOfMonth],
      },
    };

    // =========================
    // 💰 INCOME (FinanceRecords)
    // =========================
    const incomeRecords = await FinanceRecords.findAll({
      where: {
        ...whereBase,
        type: "income",
      },
      attributes: [
        [fn("DATE", col("createdAt")), "date"],
        [fn("SUM", col("amount")), "total"],
      ],
      group: [fn("DATE", col("createdAt"))],
      raw: true,
    });

    // =========================
    // 💸 EXPENSE
    // =========================
    const expenseRecords = await FinanceRecords.findAll({
      where: {
        ...whereBase,
        type: "expense",
      },
      attributes: [
        [fn("DATE", col("createdAt")), "date"],
        [fn("SUM", col("amount")), "total"],
      ],
      group: [fn("DATE", col("createdAt"))],
      raw: true,
    });

    // =========================
    // 📊 PROFIT (Reports)
    // =========================
    const reportProfit = await Reports.findAll({
      where: {
        tenantId,
        ...(outletId !== "all" && { outletId }),
        openedAt: {
          [Op.between]: [startOfMonth, endOfMonth],
        },
      },
      attributes: [
        [fn("DATE", col("openedAt")), "date"],
        [fn("SUM", col("totalProfit")), "total"],
        [fn("SUM", col("totalTrx")), "trx"],
      ],
      group: [fn("DATE", col("openedAt"))],
      raw: true,
    });

    // =========================
    // 🧠 MERGE DATA PER TANGGAL
    // =========================
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();

    const result = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(now.getFullYear(), now.getMonth(), i)
        .toISOString()
        .slice(0, 10);

      const incomeFinance =
        incomeRecords.find((d) => d.date === date)?.total || 0;

      const incomeReport =
        reportProfit.find((d) => d.date === date)?.total || 0;

      const expense = expenseRecords.find((d) => d.date === date)?.total || 0;

      const income = Number(incomeFinance) + Number(incomeReport);
      const net = income - Number(expense);

      result.push({
        date,
        income,
        expense: Number(expense),
        net,
      });
    }

    // =========================
    // 📊 SUMMARY
    // =========================
    const totalIncome = result.reduce((s, d) => s + d.income, 0);
    const totalExpense = result.reduce((s, d) => s + d.expense, 0);

    return res.json({
      success: true,
      data: result,
      summary: {
        totalIncome,
        totalExpense,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Gagal load cashflow",
    });
  }
};
