const dayjs = require("dayjs");

/**
 * Build MongoDB query from request query parameters.
 * @param {Object} params - req.query object
 * @param {Object} user - logged-in user object { _id, role }
 * @param {Object} options - extra options like company_id, role-based filters
 * @param {Number} getStatus - api type flag
 * @returns {Object} { query, page, limit, sort }
 */
function buildQuery(params = {}, user = {}, options = {}, getStatus = 0) {
  const {
    page = 1,
    limit = 10,
    searchField,
    search,
    fromDate,
    toDate,
    sortField,
    sortOrder,
    ...otherFilters
  } = params;

  const query = {};
  const sort = {};
  // console.log(query, "query form helper");
  // Common filters
  if (options.company_id) query.company_id = options.company_id;
  if (options.isDeleted !== undefined) query.isDeleted = options.isDeleted;

  // Role-based filter
  if (user.role === 2 && getStatus === 0) {
    query.raised_by = user._id;
  }
  // const regexEligibleStringFields = new Set([
  //   "name",
  //   "title",
  //   "description",
  //   "remarks",
  //   // DO NOT include 'createdBy' here, it's an ObjectId
  // ]);
  // Generic field search
  if (searchField && search) {
    // // console.log(query[searchField], "queryquery");
    query[searchField] = { $regex: search, $options: "i" };
    // if (regexEligibleStringFields.has(searchField)) {
    //   query[searchField] = { $regex: search, $options: "i" };
    // } else {
    //   // Leave it to controller (e.g., createdBy) or ignore
    //   // Optionally: attach a flag for controller to react to
    //   query.__needsSpecialSearch = { field: searchField, value: search };
    // }
  }

  // Other filters
  Object.keys(otherFilters).forEach((key) => {
    const value = otherFilters[key];
    // console.log(value, "valuevaluevalue");
    if (
      value &&
      ![
        "fromDate",
        "toDate",
        "page",
        "limit",
        "searchField",
        "search",
        "sortField",
        "sortOrder",
        "status",
        "uploaded_date",
      ].includes(key)
    ) {
      query[key] = { $regex: value, $options: "i" };
    }
    if (key === "uploaded_date") {
      const dateValue = dayjs(value, "YYYY-MM-DD", true);
      if (dateValue.isValid()) {
        const startOfDay = dateValue.startOf("day").toDate();
        const endOfDay = dateValue.endOf("day").toDate();
        query.uploaded_date = { $gte: startOfDay, $lte: endOfDay };
      }
    }
  });

  // Date range filter
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) {
      query.createdAt.$gte = dayjs
        .utc(fromDate, "YYYY-MM-DD")
        .startOf("day")
        .toDate();
    }
    if (toDate) {
      query.createdAt.$lte = dayjs
        .utc(toDate, "YYYY-MM-DD")
        .endOf("day")
        .toDate();
    }
  }

  if (sortField) {
    sort[sortField] = sortOrder === "asc" ? 1 : -1;
  } else {
    // default sort
    sort.createdAt = -1;
  }

  return {
    query,
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
  };
}

module.exports = { buildQuery };
