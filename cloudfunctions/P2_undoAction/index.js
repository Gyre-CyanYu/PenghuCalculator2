// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const db = cloud.database();
  const _ = db.command;
  const { roomid, group } = event;

  try {
    return await db.runTransaction(async transaction => {
      const { data } = await transaction.collection('rooms').where({ roomid }).field({
        actionDataList: true,

        isGamePlaying: true,
        round: true,

        tripletMap: true
      }).get();

      if (data.length < 1) {
        return {
          code: 404,
          data: null,
          message: '房间不存在'
        }
      }

      const {
        actionDataList,
        isGamePlaying, round,
        tripletMap
      } = data[0];

      if (isGamePlaying === -1) {
        return {
          code: 403,
          data: null,
          message: '房间已结算'
        }
      }

      const mainAction = actionDataList[group];

      if (mainAction.isUndo) {
        return {
          code: 200,
          data: null,
          message: '动作已撤回'
        }
      }

      const updateData = {};

      if (mainAction.name === '支出分值') {
        if (mainAction.payer !== openid) {
          return {
            code: 403,
            data: null,
            message: '不能撤回其他人的动作'
          }
        }
      } else {
        if (mainAction.receiver !== openid) {
          return {
            code: 403,
            data: null,
            message: '不能撤回其他人的动作'
          }
        }

        if (tripletMap[openid]?.includes(group)) {
          if (tripletMap[openid].length >= 3 && tripletMap[openid].at(-1) !== group) {
            return {
              code: 403,
              data: null,
              message: '请先撤回后面的刻子动作'
            }
          }

          updateData[`tripletMap.${openid}`] = _.pull(group);
        }
      }

      const newActionid = actionDataList.length;
      const newScoresMap = {};
      const newRoundScoresMap = {};

      actionDataList.filter(
        actionData => actionData.group === group
      ).forEach((actionData, index) => {
        const { actionid, payer, receiver, name } = actionData;
        const scores = -actionData.scores;

        updateData[`actionDataList.${actionid}.isUndo`] = true;

        if (name === '支出分值') {
          newScoresMap[payer] = (newScoresMap[payer] ?? 0) - scores;
          newScoresMap[receiver] = (newScoresMap[receiver] ?? 0) + scores;
        } else {
          newRoundScoresMap[payer] = (newRoundScoresMap[payer] ?? 0) - scores;
          newRoundScoresMap[receiver] = (newRoundScoresMap[receiver] ?? 0) + scores;
        }

        updateData[`actionDataList.${newActionid + index}`] = _.set({
          actionid: newActionid + index,
          group,

          isUndo: true,

          payer,
          receiver,

          name: '撤回' + name,
          scores,
          round,
          time: cloud.database().serverDate()
        });
      });

      Object.keys(newScoresMap).forEach(member => {
        updateData[`scoresMap.${member}`] = _.inc(newScoresMap[member]);
      });

      Object.keys(newRoundScoresMap).forEach(member => {
        updateData[`roundScoresMap.${member}`] = _.inc(newRoundScoresMap[member]);
      });

      await transaction.collection('rooms').where({ roomid }).update({ data: updateData });

      return {
        code: 200,
        data: null,
        message: '撤回动作成功'
      }
    });
  } catch (err) {
    console.error(err);
    return {
      code: 500,
      data: null,
      message: '服务器错误'
    }
  }
}