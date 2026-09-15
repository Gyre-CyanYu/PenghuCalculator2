const app = getApp<IAppOption>();

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
      const value: string = getCurrentPages()[0].route.split('/')[2];
      this.setData({ value });
    }
  },

  methods: {
    updateRoomid(): void {
      this.setData({ currentRoomid: app.globalData.currentRoomid });
    }
  }
})