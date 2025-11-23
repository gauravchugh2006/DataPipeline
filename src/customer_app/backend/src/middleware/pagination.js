const parsePagination = (req, _res, next) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 25));
  req.pagination = { page, pageSize };
  next();
};

module.exports = {
  parsePagination
};
