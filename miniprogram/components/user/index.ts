Component({
  properties: {
    avatarUrl: { type: String },
    nickname: { type: String },
    badgeProps: { type: Object },

    userGroup: { type: Boolean, value: false },
    userGroupLength: { type: Number, value: 1 },

    scores: { type: String, optionalTypes: [Number], value: '' },
    roundScores: { type: String, optionalTypes: [Number], value: '' },

    width: { type: String },
    nicknameClass: { type: String, value: 'subtitle' },
    scoresClass: { type: String, value: 'content' }
  }
})