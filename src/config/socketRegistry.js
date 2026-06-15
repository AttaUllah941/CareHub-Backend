let socketIo = null;

const setSocketIo = (io) => {
  socketIo = io;
};

const getSocketIo = () => socketIo;

module.exports = { setSocketIo, getSocketIo };
