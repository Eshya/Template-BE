exports.parse = (sort) => {
    const keys = Object.keys(sort);
    if (keys.length) {
      keys.forEach((k) => {
        sort[k] = parseInt(sort[k]);
      });
    } else {
      sort = {};
    }
    return sort;
  };
  