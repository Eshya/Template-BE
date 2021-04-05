const sortParser = require('./sort.parser');
exports.parse = (query) => {
  const limit = (query.limit === null || query.limit === undefined)? 50 : parseInt(query.limit);
  const offset = parseInt(query.offset) || 0;
  const where = query.where? query.where : {};
  const sort = query.sort? sortParser.parse(query.sort) : {};
  const search = query.search || '';
  // console.log({ limit, offset, where, sort, search})
  return {limit, offset, where, sort, search};
};