const {
  listEntities,
  createEntity,
  updateEntity,
  deleteEntity
} = require("../services/adminService");
const { streamRowsAsCsv, streamRowsAsWorkbook } = require("../utils/exporter");

const getEntities = async (req, res, next) => {
  try {
    const entity = req.params.entity;
    const filters = { ...req.query };
    delete filters.page;
    delete filters.pageSize;
    delete filters.sortBy;
    delete filters.format;

    const options = {
      sortBy: req.query.sortBy,
      page: req.pagination?.page,
      pageSize: req.pagination?.pageSize
    };

    const data = await listEntities(entity, filters, options);

    const format = req.query.format;
    if (format === "csv") {
      return streamRowsAsCsv(res, data, undefined, `${entity}.csv`);
    }
    if (format === "xlsx") {
      return streamRowsAsWorkbook(res, data, undefined, `${entity}.xlsx`);
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
};

const createEntityHandler = async (req, res, next) => {
  try {
    const entity = req.params.entity;
    const result = await createEntity(entity, req.body || {});
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
};

const updateEntityHandler = async (req, res, next) => {
  try {
    const entity = req.params.entity;
    const id = req.params.id;
    const result = await updateEntity(entity, id, req.body || {});
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

const deleteEntityHandler = async (req, res, next) => {
  try {
    const entity = req.params.entity;
    const id = req.params.id;
    const result = await deleteEntity(entity, id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEntities,
  createEntity: createEntityHandler,
  updateEntity: updateEntityHandler,
  deleteEntity: deleteEntityHandler
};
