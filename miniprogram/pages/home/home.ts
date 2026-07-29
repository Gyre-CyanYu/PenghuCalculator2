import format from '../../utils/format';
// import storage from '../../utils/storage';

const app = getApp<IAppOption>();
export {};

interface HomePageData {
  joinedRoomList: string[],

  roomidInput: string,
  joinVisible: boolean,
  joinButtonLoading: boolean,

  noticeDataList: NoticeData[],
  noticeVisible: boolean
}

Page({
  data: {
    joinedRoomList: [],

    roomidInput: '',
    joinVisible: false,
    joinButtonLoading: false,

    noticeDataList: [],
    noticeVisible: false
  } as HomePageData,

  async onLoad(options: { roomid?: string }) {
    wx.showLoading({
      title: '加载中',
      mask: true
    });

    await Promise.all([app.getCurrentUserData(), (async () => {
      await this.getJoinedRoomList();

      this.setData({ joinedRoomList: app.globalData.joinedRoomList });
      this.getTabBar().updateRoomid();
    })(), (async () => {
      await this.getNoticeList();

      if (this.data.noticeDataList.some(noticeData => noticeData.isImportant)) {
        this.showNotice();
      }
    })()]);

    wx.hideLoading();

    if (options.roomid) {
      this.setData({ roomidInput: options.roomid }, () => {
        this.showJoin();
        this.handleJoin();
      });
    }
  },

  onShow() {
    this.setData({ joinedRoomList: app.globalData.joinedRoomList });
    this.getTabBar().updateRoomid();
  },

  onReady() {
    
  },

  onHide() {

  },

  async onPullDownRefresh() {
    await Promise.all([(async () => {
      await this.getJoinedRoomList();
      
      this.setData({ joinedRoomList: app.globalData.joinedRoomList });
      this.getTabBar().updateRoomid();
    })(), this.getNoticeList()]);

    wx.stopPullDownRefresh();
  },

  onShareAppMessage() {
    return {
      title: '碰胡计分器',
      path: '/pages/home/home',
      imageUrl: '/images/PenghuScorekeeper5_4.jpg'
    }
  },

  async getJoinedRoomList(): Promise<void> {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'P2_getJoinedRoomList',
      }) as CallFunctionResult<string[]>;

      if (result.code !== 200) {
        throw result;
      }

      const joinedRoomList: string[] = result.data;
      app.globalData.joinedRoomList = joinedRoomList;

      if (!joinedRoomList.length) {
        app.globalData.currentRoomid = '';
      } else if (!app.globalData.currentRoomid) {
        app.globalData.currentRoomid = joinedRoomList[0];
      }

      /* const cachedRoomDataList: RoomData[] = wx.getStorageSync('rooms') || [];
      const reservedRoomDataList: RoomData[] = [];
      const removedRoomList: string[] = [];

      cachedRoomDataList.forEach(roomData => {
        if (joinedRoomList.includes(roomData.roomid)) {
          reservedRoomDataList.push(roomData);
        } else {
          removedRoomList.push(roomData.roomid);
        }
      });

      wx.setStorageSync('rooms', reservedRoomDataList);
      await storage.removeImage('qrCode', removedRoomList); */
    } catch (err) {
      console.warn('获取已加入房间列表失败', err);
    }
  },

  async getNoticeList(): Promise<void> {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'P2_getNoticeDataList',
      }) as CallFunctionResult<NoticeData[]>;
      
      if (result.code !== 200) {
        throw result;
      }
      
      const noticeDataList: NoticeData[] = result.data;
      noticeDataList.forEach(notice => {        
        notice.createdAt = format.formatTime(notice.createdAt);
      });

      this.setData({ noticeDataList });
    } catch (err) {
      console.warn('获取有效公告信息列表失败', err);
    }
  },

  async handleJoin(): Promise<void> {
    const roomid: string = this.data.roomidInput;

    if (roomid.length < 5) {
      wx.showToast({
        title: '请输入5位房间号',
        icon: 'none'
      });

      return
    }

    this.setData({ joinButtonLoading: true });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'P2_joinRoom',
        data: { roomid }
      }) as CallFunctionResult<null>;

      if ([200, 201].includes(result.code)) {
        app.globalData.currentRoomid = roomid;

        if (!app.globalData.joinedRoomList.includes(roomid)) {
          app.globalData.joinedRoomList.unshift(roomid);
        }

        wx.switchTab({ url: '/pages/room/room' });
        this.setData({ joinedRoomList: app.globalData.joinedRoomList });
        this.getTabBar().updateRoomid();
        this.closeJoin();
      } else if ([403, 404].includes(result.code)) {
        (async () => {
          await this.getJoinedRoomList();
          
          this.setData({ joinedRoomList: app.globalData.joinedRoomList });
          this.getTabBar().updateRoomid();
        })();

        wx.showToast({
          title: result.message,
          icon: 'none'
        });
      } else {
        throw result;
      }
    } catch(err) {
      console.error('加入房间失败', err);
      wx.showToast({
        title: '加入房间失败',
        icon: 'error'
      });
    }

    this.setData({ joinButtonLoading: false });
  },

  handleBack(e: WechatMiniprogram.BaseEvent): void {
    const roomid = e.currentTarget.dataset.roomid;

    if (app.globalData.currentRoomid === roomid) {
      wx.switchTab({ url: '/pages/room/room' });
    } else {
      this.showJoin();
      this.setData({ roomidInput: roomid });
      this.handleJoin();
    }
  },

  async handleScan(): Promise<void> {
    try {
      const { path } = await wx.scanCode({ scanType: ['qrCode'] });
      const roomid: string | undefined = path.match(/roomid=([^&]+)/)?.[1];

      if (roomid) {
        this.setData({ roomidInput: roomid });
        await this.handleJoin();
      } else {
        wx.showToast({
          title: '小程序码无效',
          icon: 'none'
        });
      }
    } catch (err: any) {
      if (err.errMsg === "scanCode:fail cancel") {
        return
      }

      console.error('扫码失败', err);
      wx.showToast({
        title: '扫码失败',
        icon: 'error'
      });
    }
  },

  onInputChange(e: WechatMiniprogram.CustomEvent): void {
    this.setData({ roomidInput: e.detail.value.toLowerCase() });
  },

  showJoin(): void {
    this.setData({ joinVisible: true });
  },

  closeJoin(): void {
    this.setData({ joinVisible: false, roomidInput: '' });
  },

  showNotice(): void {
    this.getNoticeList();
    this.setData({ noticeVisible: true });
  },

  closeNotice(): void {
    this.setData({ noticeVisible: false });
  },

  navigateToCreate(): void {
    wx.navigateTo({ url: '/pages/create/create' });
  }
})