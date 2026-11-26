import prisma from "../config/db.js";

export const getUsageSummary = async (req, res, next) => {
  try {
    const keyId = typeof req.query.keyId === "string" ? req.query.keyId : undefined;
    const where = keyId ? {
      virtualKeyId: keyId
    } : {};
    const [logs, totals] = await Promise.all([
      prisma.usageLog.findMany({
        where,
        orderBy: {
          createdAt: "desc"
        },
        take: 200
      }),
      prisma.usageLog.aggregate({
        where: {
          ...where,
          status: "SUCCESS"
        },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          estimatedCost: true
        },
        _count: {
          _all: true
        }
      })
    ]);
    res.json({
      success: true,
      data: {
        recentLogs: logs,
        totals: {
          requests: totals._count._all,
          inputTokens: totals._sum.inputTokens ?? 0,
          outputTokens: totals._sum.outputTokens ?? 0,
          costUsd: totals._sum.estimatedCost ?? "0"
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUsageForKey = async (req, res, next) => {
  try {
    const key = await prisma.virtualKey.findUnique({
      where: {
        id: req.params.keyId
      },
      select: {
        id: true,
        name: true,
        budgetLimit: true,
        totalSpent: true,
        reservedAmount: true,
        isActive: true
      }
    });
    if (!key) return res.status(404).json({
      success: false,
      message: "Virtual key not found"
    });
    const logs = await prisma.usageLog.findMany({
      where: {
        virtualKeyId: key.id
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 200
    });
    res.json({
      success: true,
      data: {
        key,
        logs
      }
    });
  } catch (error) {
    next(error);
  }
};