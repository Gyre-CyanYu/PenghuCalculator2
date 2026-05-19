import storage from '../../utils/storage';
const app = getApp<IAppOption>();

interface ProfilePageData {
  userData: UserData;
}

Page({
  data: {
    userData: {
      openid: '',
      nickname: '',
      avatarUrl: ''
    },

  } as ProfilePageData,

  onLoad(options) {
    this.setData({ userData: app.globalData.userData });
  },

  onReady() {

  },

  onShow() {

  },

  onHide() {

  },

  onUnload() {

  },

  onPullDownRefresh() {

  },

  onReachBottom() {

  },

  onShareAppMessage() {

  },

  async getUserData(): Promise<void> {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getUserData',
      }) as unknown as { result: Result<UserData> };

      if (![200, 201].includes(result.code)) {
        throw result;
      }

      const userData: UserData = result.data;

      if (userData.avatarUrl) {  
        userData.avatarUrl = await storage.downloadImage(userData.avatarUrl, 'avatar', userData.openid);
      } else {
        userData.avatarUrl = '/images/PenghuScorekeeper.jpg';
      }

      this.setData({ userData });
      app.globalData.userData = userData;
      storage.cacheUserData(this.data.userData);
    } catch (err) {
      console.error('获取用户信息失败', err);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'error'
      });
    }
  },
})