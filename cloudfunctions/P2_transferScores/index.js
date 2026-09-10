// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const db = cloud.database();
  const _ = db.command;
  const { roomid, receiverList, scores } = event;

  try {
    return await db.runTransaction(async transaction => {
      const { data } = await transaction.collection('rooms').where({ roomid }).field({
        memberList: true,
        actionDataList: true,

        isGamePlaying: true,
        round: true
      }).get();

      if (data.length < 1) {
        return {
          code: 404,
          data: null,
          message: '房间不存在'
        };
      }

      const {
        memberList, actionDataList,
        isGamePlaying, round
      } = data[0];

      if (isGamePlaying === -1) {
        return {
          code: 403,
          data: null,
          message: '房间已结算'
        }
      }

      if (!memberList.includes(openid)) {
        return {
          code: 403,
          data: null,
          message: '你不在房间中'
        }
      }

      if (!receiverList.every(receiver => memberList.includes(receiver))) {
        return {
          code: 403,
          data: null,
          message: '收取者不在房间中'
        }
      }

      if (!Number.isInteger(scores) || scores < 1) {
        return {
          code: 403,
          data: null,
          message: '分值无效'
        }
      }

      const updateData = { [`scoresMap.${openid}`]: _.inc(-scores * receiverList.length) };

      const group = actionDataList.length;
      const newActionDataList = receiverList.map((receiver, index) => {
        updateData[`scoresMap.${receiver}`] = _.inc(scores);

        return {
          actionid: group + index,
          group,

          isUndo: false,

          payer: openid,
          receiver,

          name: '支出分值',
          scores,
          round,
          time: cloud.database().serverDate()
        }
      });

      updateData['actionDataList'] = _.push(newActionDataList);

      await transaction.collection('rooms').where({ roomid }).update({ data: updateData });

      return {
        code: 200,
        data: null,
        message: '支出分值成功'
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