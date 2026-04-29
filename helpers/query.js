const mongoose = require("mongoose");

exports.findData = async (collection, where, gets, sorts, limits, page) => {
  try {
    const sorlen = Object.keys(sorts).length;
    if (sorlen != 0 && limits != 0) {
      const resData = await collection
        .find(where, gets)
        .sort(sorts)
        .limit(limits * 1)
        .skip((page - 1) * limits);
      if (!resData) {
        return { status: false, msg: "record not found!" };
      }
      return { status: true, msg: resData };
    } else if (sorlen != 0) {
      const resData = await collection.find(where, gets).sort(sorts);
      if (!resData) {
        return { status: false, msg: "record not found!" };
      }
      return { status: true, msg: resData };
    } else if (limits != 0) {
      const resData = await collection
        .find(where, gets)
        .limit(limits * 1)
        .skip((page - 1) * limits);
      if (!resData) {
        return { status: false, msg: "record not found!" };
      }
      return { status: true, msg: resData };
    } else {
      const resData = await collection.find(where, gets);
      if (!resData) {
        return { status: false, msg: "record not found!" };
      }
      return { status: true, msg: resData };
    }
  } catch (e) {
    console.log("findData", e, collection, where, gets, sorts, limits, page);
    return { status: false, msg: e.message };
  }
};
exports.insertData = async (collection, values) => {
    try {
      const inslen = Object.keys(values).length;
      if (inslen != 0) {
        const insData = await collection.create(values);
        if (!insData) {
          return { status: false, msg: 'not inserted' };
        }
        return { status: true, msg: insData };
      } else {
        return { status: false, msg: 'not inserted' };
      }
    } catch (e) {
      if(e.code == 11000){
        const fieldNames = Object.keys(e.keyPattern);
        const duplicateFields = fieldNames.map(fieldName => {
            return `${fieldName} ${e.keyValue[fieldName]} is already taken`;
        });
        return { status: false, msg: duplicateFields.join('') };  
      }
      return { status: false, msg: e.message };
    }
  };
