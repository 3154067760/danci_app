/** 离线词典词库 — 统一从 offlineDictionary 读取 */
export {
  getAllOfflineWords as getAllWords,
  getOfflineWordById as getWordById,
  getOfflineWordsByIds as getWordsByIds,
  offlineDictionaryMeta,
  offlineWordBank as wordBank,
  offlineWordMap as wordBankMap,
  searchOfflineWords,
} from './offlineDictionary'
