// api/debug.js
module.exports = (req, res) => {
  res.status(200).json({
    TIDB_HOST: process.env.TIDB_HOST || 'VAZIO',
    TIDB_PORT: process.env.TIDB_PORT || 'VAZIO',
    TIDB_USER: process.env.TIDB_USER ? 'DEFINIDO' : 'VAZIO',
    TIDB_PASSWORD: process.env.TIDB_PASSWORD ? 'DEFINIDO' : 'VAZIO',
    TIDB_DATABASE: process.env.TIDB_DATABASE || 'VAZIO',
    NODE_VERSION: process.version
  });
};
