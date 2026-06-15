const VideoSessionStatus = {
  WAITING: 'WAITING',
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
  CANCELLED: 'CANCELLED',
};

const VIDEO_SESSION_STATUS_VALUES = Object.values(VideoSessionStatus);

module.exports = { VideoSessionStatus, VIDEO_SESSION_STATUS_VALUES };
