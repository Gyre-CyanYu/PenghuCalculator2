Component({
  properties: {
    payerAvatarUrl: { type: String },
    payerNickname: { type: String },
    payerGroupLength: { type: Number, value: 1 },

    receiverAvatarUrl: { type: String },
    receiverNickname: { type: String },
    receiverGroupLength: { type: Number, value: 1 },

    name: { type: String },
    scores: { type: Number },

    isUndo: { type: Boolean, value: false },
    isTemp: { type: Boolean, value: false }
  }
})