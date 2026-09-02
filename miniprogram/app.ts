import storage from './utils/storage';

App<IAppOption>({
  globalData: {
    // env 参数说明：
    // env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会请求到哪个云环境的资源
    // 此处请填入环境 ID, 环境 ID 可在微信开发者工具右上顶部工具栏点击云开发按钮打开获取
    env: "YOUR_ENV_ID",

    userData: {
      openid: '',
      avatarSrc: '',
      avatarFileID: '',
      nickname: ''
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

    wx.getStorage({ key: 'user' }).then(({ data }: { data: UserData }) => {
      this.globalData.userData = data;
    }).catch(err => {
      console.warn('读取用户信息缓存失败', err);
    });
  },

  async getCurrentUserData(): Promise<void> {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'P2_getCurrentUserData'
      }) as CallFunctionResult<ClientDatabaseUserData>;
      
      if (![200, 201].includes(result.code)) {
        throw result;
      }

      const databaseUserData: ClientDatabaseUserData = result.data;

      this.globalData.userData.openid = databaseUserData.openid;
      this.globalData.userData.avatarFileID = databaseUserData.avatarFileID;
      this.globalData.userData.nickname = databaseUserData.nickname;

      if (databaseUserData.avatarFileID) {
        this.globalData.userData.avatarSrc = await storage.cacheImage(databaseUserData.avatarFileID, databaseUserData.avatarUrl, this.globalData.userData.avatarSrc);
      } else {
        this.globalData.userData.avatarSrc = '/images/PenghuScorekeeper.jpg';
      }

      wx.setStorage({
        key: 'user',
        data: this.globalData.userData
      }).catch(err => {
        console.warn('缓存用户信息失败', err);
      });
    } catch (err) {
      console.error('获取用户信息失败', err);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'error'
      });
    }
  }
});