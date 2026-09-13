// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const END_OPERATION = [
  '胡', '跑胡', '提龙连胡', '五福',
  '碰胡', '碰三大连胡', '碰四清连胡',
  '扫胡', '扫三大连胡', '扫四清连胡',
  '地胡', '天胡', '七对', '双龙', '臭庄'
];

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

        playerList: true,
        backerMap: true,
        dealer: true,
        
        roundScoresMap: true,
        tripletMap: true,

        previousHoldDealer: true,
        previousWinner: true
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
        playerList, backerMap, dealer,
        roundScoresMap, tripletMap,
        previousHoldDealer, previousWinner
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

      if (mainAction.group !== group) {
        return {
          code: 403,
          data: null,
          message: '动作无效'
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

        if (mainAction.round !== round) {
          return {
            code: 403,
            data: null,
            message: '无法撤回上一局的动作'
          }
        }

        if (END_OPERATION.includes(mainAction.name)) {
          Object.keys(roundScoresMap).filter(member => roundScoresMap[member]).forEach(member => {
            updateData[`scoresMap.${member}`] = _.inc(-roundScoresMap[member]);
          });

          updateData['isGamePlaying'] = 1;

          updateData['holdDealer'] = previousHoldDealer;

          updateData['winner'] = previousWinner;

          updateData['nextPlayerTuple'] = playerList;
          updateData['nextBackerMap'] = _.set(backerMap);
          updateData['nextDealer'] = dealer;
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
          if (isGamePlaying === 0 && !END_OPERATION.includes(mainAction.name)) {
            newScoresMap[payer] = (newScoresMap[payer] ?? 0) - scores;
            newScoresMap[receiver] = (newScoresMap[receiver] ?? 0) + scores;
          }

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