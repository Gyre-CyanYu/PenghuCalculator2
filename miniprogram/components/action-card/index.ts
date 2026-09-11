interface ActionCardComponentData {
  mainAction: ActionData | TempActionData,
  isUndo: boolean,
  isTemp: boolean,

  popoverVisible: boolean,
  actionGroupVisible: boolean,

  undoVisible: boolean,
  toggleVisible: boolean
}

Component({
  properties: {
    actionGroup: { type: Object },
    width: { type: String, value: 'calc(100vw - 64rpx)' }
  },

  data: {
    mainAction: {},
    isUndo: false,
    isTemp: false,

    popoverVisible: false,
    actionGroupVisible: false,

    undoVisible: true,
    toggleVisible: true
  } as ActionCardComponentData,

  observers: {
    'actionGroup.**': function(): void {
      const { isUndo, isTemp, actionDataList } = this.properties.actionGroup as ActionGroup | TempActionGroup;

      this.setData({
        mainAction: actionDataList[0],
        isUndo,
        isTemp,
        toggleVisible: actionDataList.length > 1
      });
    }
  },

  methods: {
    undoAction(): void {
      this.setData({ popoverVisible: false });
      this.triggerEvent('undo', { value: this.data.mainAction.actionid });
    },

    toggleActionGroup(): void {
      if (this.properties.actionGroup.actionDataList.length <= 1) {
        return
      }

      this.setData({
        popoverVisible: false,
        actionGroupVisible: !this.data.actionGroupVisible
      });
    },

    onVisibleChange(e: WechatMiniprogram.CustomEvent): void {
      this.setData({ popoverVisible: e.detail.visible });
    },

    showPopover(): void {
      this.setData({ popoverVisible: true });
    }
  }
})