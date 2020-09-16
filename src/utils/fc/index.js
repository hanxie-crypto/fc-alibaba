const Service = require('./Service')
const Function = require('./Function')
const { CustomDomain, GetAutoDomain } = require('./CustomDomain')
const { Alias, Version } = require('./Qualifier')
const Trigger = require('./Trigger')
const InvokeRemote = require('./InvokeRemote')


module.exports = {
  Service,
  Function,
  Trigger,
  CustomDomain,
  Alias,
  GetAutoDomain,
  InvokeRemote,
  Version
}
