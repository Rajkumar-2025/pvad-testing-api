const AdminActivityLog = require("../model/adminActivitySchema");
const UserActivityLog = require("../model/userActivitySchema");
const LiteratureActivityLog = require("../model/literatureActivitySchema");

// Log admin activity
async function logAdminActivity(
  adminId,
  action,
  targetUserId = null,
  description = "",
) {
  return await AdminActivityLog.create({
    admin_id: adminId,
    action,
    target_user: targetUserId,
    description,
  });
}

// Log user activity
async function logUserActivity(userId, action, metadata = {}) {
  return await UserActivityLog.create({
    user_id: userId,
    action,
    metadata,
  });
}

// Log literature activity
async function logLiteratureActivity({
  createdBy,
  literatureArticleId,
  field,
  oldValue = null,
  newValue = null,
  tab = "",
  action = "UPDATED",
}) {
  const doc = {
    literature_article_id: literatureArticleId,
    field,
    old_value: oldValue,
    new_value: newValue,
    tab,
    action,
    created_by: createdBy,
  };

  Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);

  return LiteratureActivityLog.create(doc);
}

module.exports = { logAdminActivity, logUserActivity, logLiteratureActivity };
