const { listRecommendations, getCustomerSummary } = require("../services/loyaltyService");

const getRecommendations = async (req, res, next) => {
  try {
    const filters = {
      customerId: req.query.customerId,
      customerEmail: req.query.customerEmail,
      segment: req.query.segment,
      status: req.query.status,
      productId: req.query.productId
    };
    const options = {
      sortBy: req.query.sortBy,
      page: req.pagination?.page,
      pageSize: req.pagination?.pageSize
    };
    const data = await listRecommendations(filters, options);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

const getCustomerSummaryHandler = async (req, res, next) => {
  try {
    const customerId = req.params.customerId;
    const summary = await getCustomerSummary(customerId);
    if (!summary) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json({ data: summary });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendations,
  getCustomerSummary: getCustomerSummaryHandler
};
