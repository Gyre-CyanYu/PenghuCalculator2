import storage from './utils/storage';

App<IAppOption>({
  globalData: {
    // env 参数说明：
    // env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会请求到哪个云环境的资源
    // 此处请填入环境 ID, 环境 ID 可在微信开发者工具右上顶部工具栏点击云开发按钮打开获取
    env: "YOUR_ENV_ID",

    userData: {
      openid: '',
      nickname: '',
      avatarUrl: ''
    },

    currentRoomid: '',
    joinedRoomList: []
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
  },

  async getUserData(): Promise<void> {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'P2_getUserData',
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

      this.globalData.userData = userData;
      storage.cacheUserData(userData);
    } catch (err) {
      console.error('获取用户信息失败', err);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'error'
      });
    }
  }
});