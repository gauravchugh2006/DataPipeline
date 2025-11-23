const { listTrustScores } = require("../services/trustService");
const { listLogisticsSnapshots } = require("../services/logisticsService");

const getTrustScores = async (req, res, next) => {
  try {
    const filters = {
      customerId: req.query.customerId,
      badge: req.query.badge,
      breachFlag: req.query.breachFlag,
      minScore: req.query.minScore,
      maxScore: req.query.maxScore,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    const options = {
      sortBy: req.query.sortBy,
      page: req.pagination?.page,
      pageSize: req.pagination?.pageSize
    };
    const data = await listTrustScores(filters, options);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

const getLogisticsSnapshots = async (req, res, next) => {
  try {
    const filters = {
      distributorId: req.query.distributorId,
      stockistId: req.query.stockistId,
      region: req.query.region,
      slaBreach: req.query.slaBreach
    };
    const options = {
      sortBy: req.query.sortBy,
      page: req.pagination?.page,
      pageSize: req.pagination?.pageSize
    };
    const data = await listLogisticsSnapshots(filters, options);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTrustScores,
  getLogisticsSnapshots
};
