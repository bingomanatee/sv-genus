module.exports = {
  type: 'react-component',
  npm: {
    esModules: true,
    umd: {
      global: 'SvGenus',
      externals: {
        react: 'React'
      }
    },
  },
  babel: {
    stage: 1
  }
}
