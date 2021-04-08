exports.schema = {
    fullname: {
      isString: true,
      trim: true,
      isEmpty: false,
    },
    username: {
      isString: true,
      trim: true,
      isEmpty: false,
    },
    email: {
      isString: true,
      trim: true,
      isEmpty: false,
    },
    password: {
      isEmpty: false,
    },
  };
  