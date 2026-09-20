import storage from '../../utils/storage';

const app = getApp<IAppOption>();
export {};

interface ProfilePageData {
  userData: UserData;

  choosedAvatarUrl: string;
  nicknameInput: string;
  progress: number;

  editVisible: boolean;
  editButtonLoading: boolean;
  inputWarning: boolean;
}

Page({
  data: {
    userData: {
      openid: '',
      avatarSrc: '',
      avatarFileID: '',
      nickname: ''
    },

    choosedAvatarUrl: '',
    nicknameInput: '',
    progress: 0,

    editVisible: false,
    editButtonLoading: false,
    inputWarning: false,
  } as ProfilePageData,

  onLoad() {
    this.setData({ userData: app.globalData.userData });
  },

  onShow() {
    this.getTabBar().updateRoomid();
  },

  async onPullDownRefresh() {
    await app.getCurrentUserData();

    this.setData({ userData: app.globalData.userData });
    this.getTabBar().updateRoomid();

    wx.stopPullDownRefresh();
  },

  onShareAppMessage() {
    return {
      title: '碰胡计分器',
      path: '/pages/home/home',
      imageUrl: '/images/PenghuCalculator5_4.jpg'
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
      let avatarFileID: string = '';

      if (this.data.choosedAvatarUrl) {
        const { fileID } = await new Promise<ICloud.UploadFileResult>((resolve, reject) => {
          wx.cloud.uploadFile({
            cloudPath: `avatars/${app.globalData.userData.openid}.jpg`,
            filePath: this.data.choosedAvatarUrl,
            success: resolve,
            fail: reject
          }).onProgressUpdate(({ progress }) => {
            this.setData({ progress });
          });
        });

        avatarFileID = fileID;
      }

      const { result } = await wx.cloud.callFunction({
        name: 'P2_updateUserData',
        data: {
          avatarFileID,
          nickname: this.data.nicknameInput
        }
      }) as CallFunctionResult<{ 
        avatarUrl: string; 
        avatarFileID: string; 
        nickname?: string 
      } | { 
        avatarUrl?: never; 
        avatarFileID?: never; 
        nickname?: string 
      }>;

      if (result.code === 403) {
        wx.showToast({
          title: `${result.message}`,
          icon: 'none'
        });
      } else if (result.code !== 200) {
        throw result
      }

      if (result.data.nickname) {
        app.globalData.userData.nickname = result.data.nickname;
      }

      if (result.data.avatarFileID) {
        app.globalData.userData.avatarSrc = await storage.cacheImage(result.data.avatarFileID, result.data.avatarUrl, app.globalData.userData.avatarSrc);
      }

      this.setData({ userData: app.globalData.userData });
      this.closeEdit();

      wx.showToast({
        title: '更新成功',
        icon: 'none'
      });

      try {
        const userDataMap: Record<string, UserData> = wx.getStorageSync('userDataMap') || {};
        userDataMap[app.globalData.userData.openid] = app.globalData.userData;
        wx.setStorageSync('userDataMap', userDataMap);
      } catch (err) {
        console.warn('缓存用户信息失败', err);
      }
    } catch (err) {
      console.error('更新失败', err);
      wx.showToast({
        title: '更新失败',
        icon: 'error'
      });
    }

    this.setData({
      progress: 0,
      editButtonLoading: false
    });
  },

  onChooseAvatar(e: WechatMiniprogram.CustomEvent): void {
    this.setData({ choosedAvatarUrl: e.detail.avatarUrl });
  },

  onInputChange(e: WechatMiniprogram.CustomEvent): void {
    this.setData({ nicknameInput: e.detail.value });

    if (!this.data.inputWarning && this.data.nicknameInput.length > 4) {
      this.setData({ inputWarning: true });
    } else if (this.data.inputWarning && this.data.nicknameInput.length <= 4) {
      this.setData({ inputWarning: false });
    }
  },

  showEdit(): void {
    this.setData({ editVisible: true });
  },

  closeEdit(): void {
    this.setData({
      choosedAvatarUrl: '',
      nicknameInput: '',
      editVisible: false,
      inputWarning: false
    });
  }
})