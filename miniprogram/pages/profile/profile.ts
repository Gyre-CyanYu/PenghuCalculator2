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
    if (!app.globalData.userData.openid) {
      await app.getUserData();
    }

    this.setData({ userData: app.globalData.userData });
  },

  onReady() {

  },

  onShow() {
    this.getTabBar().updateRoomid();
  },

  async onPullDownRefresh() {
    await app.getUserData();

    this.setData({ userData: app.globalData.userData });
    this.getTabBar().updateRoomid();

    wx.stopPullDownRefresh();
  },

  onShareAppMessage() {
    return {
      title: '碰胡计分器',
      path: '/pages/home/home',
      imageUrl: '/images/PenghuScorekeeper5×4.jpg'
    }
  },

  async handleUpdate(): Promise<void> {
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
        name: 'P2_updateUserData',
        data: {
          nickname: this.data.nicknameInput,
          avatarArrayBuffer
        }
      }) as unknown as { result: Result<UserData> };

      if (result.code !== 200) {
        throw result
      }

      if (result.data.nickname) {
        app.globalData.userData.nickname = result.data.nickname;
      }
      if (result.data.avatarUrl) {
        app.globalData.userData.avatarUrl = await storage.downloadImage(result.data.avatarUrl, 'avatar', app.globalData.userData.openid, app.globalData.userData.avatarUrl);
      }

      this.setData({ userData: app.globalData.userData });
      storage.cacheUserData(app.globalData.userData);

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