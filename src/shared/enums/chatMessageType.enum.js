const ChatMessageType = Object.freeze({
  TEXT: 'TEXT',
  ATTACHMENT: 'ATTACHMENT',
  SYSTEM: 'SYSTEM',
});

const CHAT_MESSAGE_TYPE_VALUES = Object.values(ChatMessageType);

module.exports = { ChatMessageType, CHAT_MESSAGE_TYPE_VALUES };
