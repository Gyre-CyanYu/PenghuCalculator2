interface DatabaseUserData extends UserData {
  avatarFileID: string,
  createdAt: string
}

interface DatabaseRoomData {
  /* 房间信息 */
  roomid: string,
  qrCodeUrl: string,
  createBy: string,
  createdAt: string,

  isTest?: boolean,

  /* 全局信息 */
  gameConfig: GameConfig,

  memberList: string[],
  actionDataList: DatabaseActionData[],
  scoresMap: Record<string, number>,

  isGamePlaying: number,
  round: number,

  /* 本局信息 */
  playerList: string[],
  backerMap: Record<string, string[]>,
  dealer: string,
  holdDealer: number,

  roundScoresMap: Record<string, number>,
  tripletMap: Record<string, number>,
  winner: string,

  /* 下局信息 */
  nextPlayerMap: Record<0 | 1 | 2 | 3, string>,
  nextBackerMap: Record<string, string[]>,
  nextDealer: string,

  isRandomBackMap: Record<string, boolean>
}

interface DatabaseActionData {
  actionid: number,
  group: number,

  isUndo: boolean,

  payer: string,
  receiver: string,

  name: ActionName,
  scores: number,
  round: number,
  time: string
}