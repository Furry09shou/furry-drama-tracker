const paginate = async (model, query = {}, options = {}) => {
  const { page = 1, limit = 20, sort = { createdAt: -1 }, populate = '', select = '' } = options;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const total = await model.countDocuments(query);
  const totalPages = Math.ceil(total / limitNum);
  let findQuery = model.find(query).sort(sort).skip((pageNum - 1) * limitNum).limit(limitNum);
  if (select) findQuery = findQuery.select(select);
  if (populate) findQuery = findQuery.populate(populate);
  const list = await findQuery;
  return { list, page: pageNum, limit: limitNum, total, totalPages };
};

const parsePagination = (query) => ({
  page: Math.max(1, parseInt(query.page) || 1),
  limit: Math.min(100, Math.max(1, parseInt(query.limit) || 20))
});

module.exports = { paginate, parsePagination };
