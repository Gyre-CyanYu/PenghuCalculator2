// const app = getApp<IAppOption>();

interface TabBarComponentData {
  value: string,
  currentRoomid: string,
}

Component({
  data: {
    value: '',
    currentRoomid: '',
  } as TabBarComponentData,

  lifetimes: {
    ready() {
      const value: string = getCurrentPages()[0].route;
      this.setData({ value });
    }
  },

  methods: {
    onTabChange(e: WechatMiniprogram.CustomEvent): void {
      wx.switchTab({ url: '/' + e.detail.value });
    }
  }
})