const VideoRecordingStatus = {
  PENDING: 'PENDING',
  RECORDING: 'RECORDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

const VIDEO_RECORDING_STATUS_VALUES = Object.values(VideoRecordingStatus);

module.exports = { VideoRecordingStatus, VIDEO_RECORDING_STATUS_VALUES };
