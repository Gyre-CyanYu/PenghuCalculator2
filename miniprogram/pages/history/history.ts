import format from '../../utils/format';
import storage from '../../utils/storage';

interface HistoryPageData {
  historyDataList: HistoryData[],
  onLoad: boolean
}

Page({
  data: {
    historyDataList: [],
    onLoad: true
  } as HistoryPageData,

  onLoad() {
    wx.showLoading({
      title: '加载中',
      mask: true
    });
  },

  async onShow() {
    this.getTabBar().updateRoomid();
    await this.getHistoryDataList();

    if (this.data.onLoad) {
      this.setData({ onLoad: false });
      wx.hideLoading();
    }
  },

  async onPullDownRefresh() {
    this.getTabBar().updateRoomid();
    await this.getHistoryDataList();
    wx.stopPullDownRefresh();
  },

  onShareAppMessage() {
    return {
      title: '碰胡计分器',
      path: '/pages/home/home',
      imageUrl: '/images/PenghuCalculator5_4.jpg'
    }
  },

  async getHistoryDataList(): Promise<void> {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'P2_getHistoryDataList',
      }) as CallFunctionResult<ClientDatabaseHistoryData[]>;

      if (result.code === 204) {
        return
      } else if (result.code !== 200) {
        throw result
      }

      const databaseHistoryDataList = result.data;
      const userList = [...new Set(databaseHistoryDataList.flatMap(databaseHistoryData => databaseHistoryData.memberList))];

      const { result: userDataResult } = await wx.cloud.callFunction({
        name: 'P2_getUserDataList',
        data: { userList }
      }) as CallFunctionResult<ClientDatabaseUserData[]>;
      
      if (userDataResult.code !== 200) {
        throw userDataResult;
      }

      const cachedUserDataMap: Record<string, UserData> = wx.getStorageSync('userDataMap') || {};
      const userDataMap: Record<string, UserData> = {};

      await Promise.all(userDataResult.data.map(async databaseUserData => {
        userDataMap[databaseUserData.openid] = {
          openid: databaseUserData.openid,
          avatarSrc: databaseUserData.avatarFileID,
          avatarFileID: databaseUserData.avatarFileID,
          nickname: databaseUserData.nickname
        };

        if (databaseUserData.avatarFileID) {
          userDataMap[databaseUserData.openid].avatarSrc = await storage.cacheImage(databaseUserData.avatarFileID, databaseUserData.avatarUrl, cachedUserDataMap[databaseUserData.openid]?.avatarSrc);
        }
      }));

      const historyDataList: HistoryData[] = databaseHistoryDataList.map(databaseHistoryData => {
        const {
          roomid, createdAt, settledAt,
          gameConfig,
          memberList, scoresMap,
          round
        } = databaseHistoryData;

        const memberDataList = memberList.map(member => userDataMap[member]);

        return {
          roomid,
          createdAt: format.formatTime(createdAt),
          settledAt: format.formatTime(settledAt),

          gameConfig,

          memberDataList,
          scoresMap,

          round
        }
      });

      this.setData({ historyDataList });
    } catch (err) {
      console.error('获取历史记录信息列表失败', err);
      wx.showToast({
        title: '加载历史记录失败',
        icon: 'error'
      });
    }
  }
})