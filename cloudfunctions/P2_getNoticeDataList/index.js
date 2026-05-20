// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database();
  const _ = db.command;

  try {
    const { data } = await db.collection('notices').where({
      isActive: _.eq(true)
    }).field({
      content: true,
      isImportant: true,
      createdAt: true
    }).get();

    data.sort((a, b) => b.createdAt - a.createdAt);

    return {
      code: 200,
      data,
      message: '已获取有效公告信息列表'
    };
  } catch (err) {
    console.error(err);
    return {
      code: 500,
      data: null,
      message: '服务器错误'
    };
  }
}