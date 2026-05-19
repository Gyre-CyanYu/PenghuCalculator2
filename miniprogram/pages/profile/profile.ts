import storage from '../../utils/storage';

const app = getApp<IAppOption>();
export {};

interface ProfilePageData {
  userData: UserData;

  choosedAvatarUrl: string;
  nicknameInput: string;

  editVisible: boolean;
  editButtonLoading: boolean;
}

Page({
  data: {
    userData: {
      openid: '',
      nickname: '',
      avatarUrl: ''
    },

    choosedAvatarUrl: '',
    nicknameInput: '',

    editVisible: false,
    editButtonLoading: false,
  } as ProfilePageData,

  async onLoad() {
    await this.getUserData();
    this.setData({ userData: app.globalData.userData });
  },

  onReady() {

  },

  onShow() {
    this.getTabBar().updateRoomid();
  },

  async onPullDownRefresh() {
    await this.getUserData();

    this.setData({ userData: app.globalData.userData });
    this.getTabBar().updateRoomid();

    wx.stopPullDownRefresh();
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

      app.globalData.userData = userData;
      storage.cacheUserData(app.globalData.userData);
    } catch (err) {
      console.error('获取用户信息失败', err);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'error'
      });
    }
  },

  async handleUpload(): Promise<void> {
    if (!this.data.choosedAvatarUrl && !this.data.nicknameInput) {
      wx.showToast({
        title: '未修改资料',
        icon: 'none'
      });
      return
    }

    this.setData({ editButtonLoading: true });

    try {
      let avatarArrayBuffer = null;
      if (this.data.choosedAvatarUrl) {
        avatarArrayBuffer = wx.getFileSystemManager().readFileSync(this.data.choosedAvatarUrl);
      }

      const { result } = await wx.cloud.callFunction({
        name: 'updateUserData',
        data: {
          nickname: this.data.nicknameInput,
          avatarArrayBuffer
        }
      }) as unknown as { result: Result<UserData> };

      if (result.code !== 200) {
        throw result
      }

      const userData = this.data.userData;
      if (result.data.nickname) {
        userData.nickname = result.data.nickname;
      }
      if (result.data.avatarUrl) {
        userData.avatarUrl = await storage.downloadImage(result.data.avatarUrl, 'avatar', this.data.userData.openid, this.data.userData.avatarUrl);
      }

      this.setData({ userData });
      storage.cacheUserData(this.data.userData);

      this.closeEdit();
      wx.showToast({
        title: '上传成功',
        icon: 'none'
      });
    } catch (err) {
      console.error('上传失败', err);
      wx.showToast({
        title: '上传失败',
        icon: 'error'
      });
    }

    this.setData({ editButtonLoading: false });
  },

  onChooseAvatar(e: WechatMiniprogram.CustomEvent): void {
    this.setData({ choosedAvatarUrl: e.detail.avatarUrl });
  },

  onInputChange(e: WechatMiniprogram.CustomEvent): void {
    this.setData({ nicknameInput: e.detail.value });
  },

  showEdit(): void {
    this.setData({ editVisible: true });
  },

  closeEdit(): void {
    this.setData({
      choosedAvatarUrl: '',
      nicknameInput: '',
      editVisible: false
    });
  }
})