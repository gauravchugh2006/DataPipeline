const {
  listReminderConfigurations,
  upsertReminderPreference
} = require("../services/reminderService");

const getReminderConfigurations = async (req, res, next) => {
  try {
    const filters = {
      productId: req.query.productId,
      csrId: req.query.csrId,
      channel: req.query.channel
    };
    const data = await listReminderConfigurations(filters);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

const upsertReminder = async (req, res, next) => {
  try {
    const result = await upsertReminderPreference(req.body || {});
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReminderConfigurations,
  upsertReminder
};
